'use strict'

const fse = require('fs-extra')
const path = require('path')
const glob = require('glob')
const yaml = require('js-yaml')
const {URL} = require('url')
const moment = require('moment-timezone')
const {File, Category, Tag, TOC} = require('./types')
const pkg = require('../package.json')
const extMIME = require('../dist/ext-mime.json')

const inside = (array, element) => {
  return array.indexOf(element) !== -1
}

/**
 * @param {*} o
 * @return {Boolean}
 */
const isString = (o) => {
  return typeof(o) === 'string'
}

/**
 * @param {*} o
 * @return {Boolean}
 */
const isArray = (o) => {
  return Array.isArray(o)
}

/**
 * @param {*} o
 * @return {Boolean}
 */
const isFunction = (o) => {
  return o instanceof Function
}

/**
 * @param {*} o
 * @return {Boolean} Return `false` when `o == null`.
 */
const isObject = (o) => {
  return typeof(o) === 'object' && o != null
}

/**
 * @param {*} o
 * @return {Boolean}
 */
const isBuffer = (o) => {
  return Buffer.isBuffer(o)
}

const escapeHTML = (str) => {
  return str.replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')
}

const matchFiles = (pattern, options) => {
  return new Promise((resolve, reject) => {
    glob(pattern, options, (error, result) => {
      if (error != null) {
        return reject(error)
      }
      return resolve(result)
    })
  })
}

const removeControlChars = (str) => {
  return str.replace(/[\x00-\x1F\x7F]/g, '')
}

// YAML ignores your local timezone and parse time as UTC.
// This function will transpose it to a time without timezone.
// Which looks the same as the original string.
// If you keep timezone, you cannot easily parse it as another timezone.
// https://github.com/nodeca/js-yaml/issues/91
const transposeYAMLTime = (datetime) => {
  // If you don't write full YYYY-MM-DD HH:mm:ss, js-yaml will leave a string.
  if (isString(datetime)) {
    return moment(datetime).format('YYYY-MM-DD HH:mm:ss')
  }
  return moment(
    new Date(datetime.getTime() + datetime.getTimezoneOffset() * 60000)
  ).format('YYYY-MM-DD HH:mm:ss')
}

const getFrontMatter = (str) => {
  if (!isString(str) || !/^---\r?\n/g.test(str)) {
    return {'attributes': {}, 'body': str}
  }
  // Use flag `m` for per line test, not `g`.
  const array = str.split(/^---\r?\n/m, 3)
  // No front-matter at all.
  if (array.length !== 3) {
    return {'attributes': {}, 'body': str, 'frontMatter': ''}
  }
  // ['', frontMatter, body]
  const result = {'attributes': {}, 'body': array[2], 'frontMatter': array[1]}
  try {
    result['attributes'] = yaml.safeLoad(result['frontMatter'])
  } catch (error) {
    result['attributes'] = {}
  }
  return result
}

const parseFrontMatter = (file) => {
  if (!isString(file['raw'])) {
    return file
  }
  const parsed = getFrontMatter(file['raw'])
  file['text'] = parsed['body']
  file['frontMatter'] = parsed['attributes']
  file = Object.assign(file, parsed['attributes'])
  file['title'] = file['title'] != null ? file['title'].toString() : null
  // Nunjucks does not allow to call moment.tz.guess() in template.
  // So we pass timezone to each file as an attribute.
  file['zone'] = file['zone'] || moment.tz.guess()
  if (file['updatedTime'] == null) {
    file['updatedTime'] = fse.statSync(path.join(
      file['srcDir'], file['srcPath']
    ))['mtime']
  } else {
    file['updatedTime'] = moment.tz(
      transposeYAMLTime(file['updatedTime']), file['zone']
    ).toDate()
  }
  // Fallback compatibility.
  file['createdTime'] = file['createdTime'] || file['date']
  if (file['createdTime'] == null) {
    file['createdTime'] = file['updatedTime']
    file['createdMoment'] = moment(file['createdTime'])
  } else {
    // Parsing non-timezone string with a user-specific timezone.
    file['createdMoment'] = moment.tz(
      transposeYAMLTime(file['createdTime']), file['zone']
    )
    file['createdTime'] = file['createdMoment'].toDate()
  }
  if (file['language'] != null) {
    file['createdMoment'].locale(file['language'])
  }
  // Fallback compatibility.
  file['date'] = file['createdTime']
  return file
}

const getContentType = (docPath) => {
  return extMIME[path.extname(docPath)] || 'application/octet-stream'
}

const paginate = (p, posts, perPage = 10) => {
  const results = []
  let perPagePosts = []
  for (const post of posts) {
    if (perPagePosts.length === perPage) {
      results.push(Object.assign(new File(), p, {'posts': perPagePosts}))
      perPagePosts = []
    }
    perPagePosts.push(post)
  }
  results.push(Object.assign(new File(), p, {'posts': perPagePosts}))
  results[0]['pageArray'] = results
  results[0]['pageIndex'] = 0
  results[0]['docPath'] = p['docPath']
  for (let i = 1; i < results.length; ++i) {
    results[i]['pageArray'] = results
    results[i]['pageIndex'] = i
    results[i]['docPath'] = path.join(
      path.dirname(p['docPath']),
      `${path.basename(
        p['docPath'], path.extname(p['docPath'])
      )}-${i + 1}.html`
    )
  }
  return results
}

const sortCategories = (category) => {
  category['posts'].sort((a, b) => {
    return -(a['date'] - b['date'])
  })
  category['subs'].sort((a, b) => {
    return a['name'].localeCompare(b['name'])
  })
  for (const sub of category['subs']) {
    sortCategories(sub)
  }
}

const paginateCategories = (category, parentPath, site, perPage = 10) => {
  let results = []
  const sp = new File({
    'layout': 'category',
    'docDir': site['siteConfig']['docDir'],
    'docPath': path.join(parentPath, `${category['name']}`, 'index.html'),
    'title': 'category',
    'name': category['name'].toString(),
    'comment': false,
    'reward': false
  })
  category['docPath'] = sp['docPath']
  results = results.concat(paginate(sp, category['posts'], perPage))
  for (const sub of category['subs']) {
    results = results.concat(
      paginateCategories(sub, path.join(
        parentPath, `${category['name']}`
      ), site, perPage)
    )
  }
  return results
}

const getPathFn = (rootDir = path.posix.sep) => {
  rootDir = rootDir.replace(path.win32.sep, path.posix.sep)
  return (docPath = '') => {
    if (!path.posix.isAbsolute(rootDir)) {
      rootDir = path.posix.join(path.posix.sep, rootDir)
    }
    if (docPath.endsWith('index.html')) {
      docPath = docPath.substring(0, docPath.length - 'index.html'.length)
    } else if (docPath.endsWith('index.htm')) {
      docPath = docPath.substring(0, docPath.length - 'index.htm'.length)
    }
    return encodeURI(path.posix.join(
      rootDir, docPath.replace(path.win32.sep, path.posix.sep)
    ))
  }
}

const getURLFn = (baseURL, rootDir = path.posix.sep) => {
  const getPath = getPathFn(rootDir)
  return (docPath = '') => {
    return new URL(getPath(docPath), baseURL)
  }
}

const isCurrentPathFn = (rootDir = path.posix.sep, currentPath = '') => {
  // Must join a '/' before resolve or it will join current work dir.
  const getPath = getPathFn(rootDir)
  currentPath = getPath(currentPath)
  const currentToken = path.posix.resolve(path.posix.join(
    path.posix.sep, currentPath.replace(path.win32.sep, path.posix.sep)
  )).split(path.posix.sep)
  return (testPath = '', strict = false) => {
    testPath = getPath(testPath)
    if (currentPath === testPath) {
      return true
    }
    const testToken = path.posix.resolve(path.posix.join(
      path.posix.sep, testPath.replace(path.win32.sep, path.posix.sep)
    )).split(path.posix.sep)
    if (strict && testToken.length !== currentToken.length) {
      return false
    }
    // testPath is shorter and usually be a menu link.
    for (let i = 0; i < testToken.length; ++i) {
      if (testToken[i] !== currentToken[i]) {
        return false
      }
    }
    return true
  }
}

const genCategories = (posts) => {
  const categories = []
  let categoriesLength = 0
  for (const post of posts) {
    if (post['frontMatter']['categories'] == null) {
      continue
    }
    const postCategories = []
    let subCategories = categories
    for (const cateName of post['frontMatter']['categories']) {
      let found = false
      for (const category of subCategories) {
        if (category['name'] === cateName) {
          found = true
          postCategories.push(category)
          category['posts'].push(post)
          subCategories = category['subs']
          break
        }
      }
      if (!found) {
        const newCate = new Category(cateName, [post], [])
        ++categoriesLength
        postCategories.push(newCate)
        subCategories.push(newCate)
        subCategories = newCate['subs']
      }
    }
    post['categories'] = postCategories
  }
  categories.sort((a, b) => {
    return a['name'].localeCompare(b['name'])
  })
  return {categories, categoriesLength}
}

const genTags = (posts) => {
  const tags = []
  let tagsLength = 0
  for (const post of posts) {
    if (post['frontMatter']['tags'] == null) {
      continue
    }
    const postTags = []
    for (const tagName of post['frontMatter']['tags']) {
      let found = false
      for (const tag of tags) {
        if (tag['name'] === tagName) {
          found = true
          postTags.push(tag)
          tag['posts'].push(post)
          break
        }
      }
      if (!found) {
        const newTag = new Tag(tagName, [post])
        ++tagsLength
        postTags.push(newTag)
        tags.push(newTag)
      }
    }
    post['tags'] = postTags
  }
  tags.sort((a, b) => {
    return a['name'].localeCompare(b['name'])
  })
  return {tags, tagsLength}
}

const putSite = (site, key, file) => {
  if (key == null || file == null || !isArray(site[key])) {
    return
  }
  const i = site[key].findIndex((element) => {
    return (
      element['docPath'] === file['docPath'] &&
      element['docDir'] === file['docDir']
    )
  })
  if (i !== -1) {
    site[key][i] == file
  } else {
    site[key].push(file)
  }
}

const delSite = (site, key, file) => {
  if (key == null || file == null || !isArray(site[key])) {
    return
  }
  for (let i = 0; i < site[key].length; ++i) {
    if (
      site[key][i]['docPath'] === file['docPath'] &&
      site[key][i]['docDir'] === file['docDir']
    ) {
      site[key].splice(i, 1)
    }
  }
}

const getFileLayout = (file, available) => {
  if (file['layout'] == null) {
    return null
  }
  if (!inside(available, file['layout'])) {
    return 'page'
  }
  return file['layout']
}

const resolveHeaderIDs = ($) => {
  const hNames = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
  const headerIDs = {}
  $(hNames.join(', ')).each((i, h) => {
    const text = $(h).text()
    // Remove some chars in escaped ID because
    // bootstrap scrollspy cannot support it.
    const escaped = escapeHTML(text).trim().replace(
      /[\s\(\)\[\]{}<>\.,\!\@#\$%\^&\*=\|`''\/\?~]+/g,
      ''
    )
    let id
    if (headerIDs[escaped] != null) {
      id = `${escaped}-${headerIDs[escaped]++}`
    } else {
      id = escaped
      headerIDs[escaped] = 1
    }
    $(h).attr('id', id)
    $(h).html(
      `<a class='header-link' href='#${id}' title='${escaped}'></a>${text}`
    )
  })
}

const genTOC = ($) => {
  const hNames = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
  const toc = []
  $(hNames.join(', ')).each((i, h) => {
    let level = toc
    while (
      level.length > 0 &&
      hNames.indexOf(
        level[level.length - 1]['name']
      ) < hNames.indexOf(h['name'])
    ) {
      level = level[level.length - 1]['subs']
    }
    // Don't set archor to absolute path because bootstrap scrollspy
    // can only accept relative path for ID.
    level.push(new TOC(h['name'], `#${$(h).attr('id')}`, $(h).text().trim()))
  })
  return toc
}

const resolveLink = ($, baseURL, rootDir, docPath) => {
  const getURL = getURLFn(baseURL, rootDir)
  const getPath = getPathFn(rootDir)
  // Replace relative path to absolute path.
  $('a').each((i, a) => {
    const href = $(a).attr('href')
    if (href == null) {
      return
    }
    if (new URL(href, baseURL).host !== getURL(docPath).host) {
      $(a).attr('target', '_blank')
      $(a).attr('rel', 'noreferrer noopener')
    }
    if (
      href.startsWith('https://') || href.startsWith('http://') ||
      href.startsWith('//') || href.startsWith('/') ||
      href.startsWith('javascript:')
    ) {
      return
    }
    $(a).attr('href', getPath(path.join(
      path.dirname(docPath), href
    )))
  })
}

const resolveImage = ($, rootDir, docPath) => {
  const getPath = getPathFn(rootDir)
  // Replace relative path to absolute path.
  $('img').each((i, e) => {
    const src = $(e).attr('src')
    if (src == null) {
      return
    }
    if (
      src.startsWith('https://') || src.startsWith('http://') ||
      src.startsWith('//') || src.startsWith('/') ||
      src.startsWith('file:image')
    ) {
      return
    }
    $(e).attr('src', getPath(path.join(
      path.dirname(docPath), src
    )))
  })
}

const getVersion = () => {
  return pkg['version']
}

const default404 = [
  '<!DOCTYPE html>',
  '<html>',
  '  <head>',
  '    <meta charset="utf-8">',
  '    <meta http-equiv="X-UA-Compatible" content="IE=edge">',
  '    <meta name="viewport" content="',
  '      width=device-width,',
  '      initial-scale=1,',
  '      maximum-scale=1',
  '    ">',
  '    <title>404 Not Found</title>',
  '  </head>',
  '  <body>',
  '    <h1>404 Not Found</h1>',
  `    <p>Hikaru v${getVersion()}</p>`,
  '  </body>',
  '</html>'
].join('')

module.exports = {
  inside,
  isString,
  isArray,
  isFunction,
  isObject,
  isBuffer,
  escapeHTML,
  matchFiles,
  removeControlChars,
  parseFrontMatter,
  getContentType,
  paginate,
  sortCategories,
  paginateCategories,
  getPathFn,
  getURLFn,
  genCategories,
  genTags,
  putSite,
  delSite,
  getFileLayout,
  isCurrentPathFn,
  resolveHeaderIDs,
  resolveLink,
  resolveImage,
  genTOC,
  getVersion,
  default404
}
