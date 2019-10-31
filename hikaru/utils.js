'use strict'

/**
 * @module utils
 */

const fse = require('fs-extra')
const path = require('path')
const glob = require('glob')
const YAML = require('yaml')
const {URL} = require('url')
const moment = require('moment-timezone')
const {File, Category, Tag, TOC} = require('./types')
const pkg = require('../package.json')
const extMIME = require('../dist/ext-mime.json')

/**
 * @description Returns true if `element` is in `array`.
 * @param {Array} array
 * @param {*} element
 * @return {Boolean}
 */
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

/**
 * @param {Buffer} b
 * @return {Boolean}
 */
const isBinary = (b) => {
  return isBuffer(b) && !b.equals(Buffer.from(b.toString('utf8'), 'utf8'))
}

/**
 * @description Escape HTML chars.
 * @param {String} str
 * @return {String} Escaped HTML string.
 */
const escapeHTML = (str) => {
  return str.replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')
}

/**
 * @description A Promised glob.
 * @param {String} pattern
 * @param {Objects} [opts] Optional glob opts.
 * @return {Promise<String[]>}
 */
const matchFiles = (pattern, opts = {}) => {
  return new Promise((resolve, reject) => {
    glob(pattern, opts, (error, result) => {
      if (error != null) {
        return reject(error)
      }
      return resolve(result)
    })
  })
}

/**
 * @description Remove XML control chars.
 * @param {String} str
 * @return {String} XML string.
 */
const removeControlChars = (str) => {
  return str.replace(/[\x00-\x1F\x7F]/g, '')
}

/**
 * @typedef {Object} FrontMatter
 * @property {Object} attributes Parsed front-matter properties.
 * @property {String} body String after front-matter.
 * @property {String} frontMatter Front-matter string.
 */
/**
 * @description Get front-matter from string,
 * front-matter here is defined at the head of string (so don't use UTF-8 BOM),
 * begins with one line that contains only `---`,
 * and write properties in YAML after this line,
 * then also ends with such a line.
 * @param {String} str
 * @return {FrontMatter}
 */
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
    result['attributes'] = YAML.parse(result['frontMatter'])
  } catch (error) {
    result['attributes'] = {}
  }
  return result
}

/**
 * @description Parse front-matter and set properties to file.
 * @param {File} file
 * @return {File}
 */
const parseFrontMatter = (file) => {
  if (!isString(file['raw'])) {
    return file
  }
  const parsed = getFrontMatter(file['raw'])
  file['text'] = parsed['body']
  file['frontMatter'] = parsed['attributes']
  file = Object.assign(file, parsed['attributes'])
  file['updatedDate'] = file['updatedDate'] || file['updatedTime']
  file['createdDate'] = file['createdDate'] || file['createdTime']
  if (file['updatedDate'] == null) {
    file['updatedDate'] = fse.statSync(path.join(
      file['srcDir'], file['srcPath']
    ))['mtime']
    // JS Date already have timezone so we convert it.
    file['updatedMoment'] = moment.tz(
      file['updatedDate'],
      file['zone'] || moment.tz.guess()
    )
  } else {
    // String does not have timezone so we add it.
    file['updatedMoment'] = moment.tz(
      file['updatedDate'],
      file['zone'] || moment.tz.guess()
    )
    file['updatedDate'] = file['updatedMoment'].toDate()
  }
  if (file['createdDate'] == null) {
    file['createdDate'] = file['updatedDate']
    file['createdMoment'] = file['updatedMoment']
  } else {
    file['createdMoment'] = moment.tz(
      file['createdDate'],
      file['zone'] || moment.tz.guess()
    )
    file['createdDate'] = file['createdMoment'].toDate()
  }
  file['updatedTime'] = file['updatedDate']
  file['createdTime'] = file['createdDate']
  return file
}

/**
 * @description Detect Content-Type via filename.
 * @param {String} docPath
 * @return {String} Content-Type value.
 */
const getContentType = (docPath) => {
  return extMIME[path.extname(docPath)] || 'application/octet-stream'
}

/**
 * @description Paginate page's posts.
 * @param {File} p Original page.
 * @param {File[]} posts Page related posts.
 * @param {Number} [perPage=10] How many posts per page.
 * @return {File[]} Paginated pages, original page's index is 0.
 */
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

/**
 * @description Sort categories and their posts recursively.
 * @param {Category} category
 */
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

/**
 * @description Generate and paginate pages for category and its subs.
 * @param {Category} category
 * @param {String} parentPath Parent category's dir,
 * into which sub categories need to be put.
 * @param {Site} site
 * @param {Number} [perPage=10] How many posts per page.
 * @return {File[]} All category and it's subs pages.
 */
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

/**
 * @callback getPath
 * @param {String} [docPath]
 * @return {String} Encoded URI path for web link.
 */
/**
 * @description Get a function to handle full website path.
 * @param {String} [rootDir] Site rootDir.
 * @return {getPath}
 */
const getPathFn = (rootDir = path.posix.sep) => {
  rootDir = rootDir.replace(path.win32.sep, path.posix.sep)
  if (!rootDir.endsWith(path.posix.sep)) {
    rootDir = path.posix.join(rootDir, path.posix.sep)
  }
  if (!path.posix.isAbsolute(rootDir)) {
    rootDir = path.posix.join(path.posix.sep, rootDir)
  }
  return (docPath = '') => {
    // Handle link with query string or hash.
    // Use assertion to prevent `?` and `#` to be removed.
    const array = docPath.split(/(?=[?#])/)
    array[0].replace(path.win32.sep, path.posix.sep)
    if (array[0].endsWith('index.html')) {
      array[0] = array[0].substring(0, array[0].length - 'index.html'.length)
    } else if (array[0].endsWith('index.htm')) {
      array[0] = array[0].substring(0, array[0].length - 'index.htm'.length)
    }
    return encodeURI(path.posix.join(rootDir, ...array))
  }
}

/**
 * @callback getURL
 * @param {String} [docPath]
 * @return {URL} Full website URL.
 */
/**
 * @description Get a function to handle full website URL.
 * @param {String} [baseURL] Site baseURL.
 * @param {String} [rootDir] Site rootDir.
 * @return {getURL}
 */
const getURLFn = (baseURL, rootDir = path.posix.sep) => {
  const getPath = getPathFn(rootDir)
  return (docPath = '') => {
    return new URL(getPath(docPath), baseURL)
  }
}

/**
 * @callback isCurrentPath
 * @description This function does not care query string and hash.
 * @param {String} [testPath] Path needed to test.
 * @param {Boolean} [strict=false] If false, sub dir will return true.
 * @return {Boolean}
 */
/**
 * @description Get a function to handle if parameter is current path.
 * @param {String} [rootDir] Site rootDir.
 * @param {String} [currentPath] current page's path.
 * @return {isCurrentPath}
 */
const isCurrentPathFn = (rootDir = path.posix.sep, currentPath = '') => {
  // Must join a '/' before resolve or it will join current site dir.
  const getPath = getPathFn(rootDir)
  currentPath = getPath(currentPath).split(/[?#]/)[0]
  const currentToken = path.posix.resolve(path.posix.join(
    path.posix.sep, currentPath.replace(path.win32.sep, path.posix.sep)
  )).split(path.posix.sep)
  return (testPath = '', strict = false) => {
    if (!isString(testPath)) {
      strict = testPath
      testPath = ''
    }
    testPath = getPath(testPath).split(/[?#]/)[0]
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

/**
 * @typedef {Object} CategoriesData
 * @property {Category[]} categories
 * @property {Number} categoriesLength
 */
/**
 * @description Generate categories from posts.
 * @param {File[]} posts
 * @return {CategoriesData}
 */
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

/**
 * @typedef {Object} TagsData
 * @property {Category[]} tags
 * @property {Number} tagsLength
 */
/**
 * @description Generate tags from posts.
 * @param {File[]} posts
 * @return {TagsData}
 */
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

/**
 * @description Put file into an array in site,
 * will replace file with the same output path.
 * @param {Site} site
 * @param {String} key
 * @param {File} file
 */
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
    site[key][i] = file
  } else {
    site[key].push(file)
  }
}

/**
 * @description Delete file from an array in site,
 * which have the same input path.
 * @param {Site} site
 * @param {String} key
 * @param {File} file
 */
const delSite = (site, key, file) => {
  if (key == null || file == null || !isArray(site[key])) {
    return
  }
  for (let i = 0; i < site[key].length; ++i) {
    if (
      site[key][i]['srcPath'] === file['srcPath'] &&
      site[key][i]['srcDir'] === file['srcDir']
    ) {
      site[key].splice(i, 1)
    }
  }
}

/**
 * @description Update headers' ID for bootstrap scrollspy.
 * @param {Object} $ Cheerio context.
 */
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

/**
 * @description Generate TOC from HTML headers.
 * @param {Object} $ Cheerio context.
 */
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

/**
 * @description Get protocol of a URL.
 * @param {String} url
 * @return {String} If no protocol return null.
 */
const getURLProtocol = (url) => {
  try {
    // If no protocol in url, `URL()` will throw an error.
    return new URL(url).protocol
  } catch (error) {
    return null
  }
}

/**
 * @description Update site's internal link to absolute path,
 * and add attributes for external link.
 * @param {Object} $ Cheerio context.
 * @param {String} [baseURL] Site baseURL.
 * @param {String} [rootDir] Site rootDir.
 * @param {String} [docPath]
 */
const resolveLink = ($, baseURL, rootDir, docPath) => {
  const getURL = getURLFn(baseURL, rootDir)
  const getPath = getPathFn(rootDir)
  // Replace relative path to absolute path.
  $('a').each((i, a) => {
    const href = $(a).attr('href')
    if (href == null) {
      return
    }
    // If `href` is a valid URL, `baseURL` will be ignored.
    // So we can compare host for all links here.
    if (new URL(href, baseURL).origin !== getURL(docPath).origin) {
      $(a).attr('target', '_blank')
      $(a).attr('rel', 'noreferrer noopener')
    }
    // `path.posix.isAbsolute()` detects `/` or `//`.
    if (!(path.posix.isAbsolute(href) || getURLProtocol(href) != null)) {
      $(a).attr('href', getPath(path.join(path.dirname(docPath), href)))
    }
  })
}

/**
 * @description Update site's internal image src to absolute path.
 * @param {Object} $ Cheerio context.
 * @param {String} [rootDir] Site rootDir.
 * @param {String} [docPath]
 */
const resolveImage = ($, rootDir, docPath) => {
  const getPath = getPathFn(rootDir)
  // Replace relative path to absolute path.
  $('img').each((i, e) => {
    const src = $(e).attr('src')
    if (src == null) {
      return
    }
    // `path.posix.isAbsolute()` detects `/` or `//`.
    if (!(path.posix.isAbsolute(src) || getURLProtocol(src) != null)) {
      $(e).attr('src', getPath(path.join(path.dirname(docPath), src)))
    }
  })
}

/**
 * @description Get Hikaru version.
 * @return {String}
 */
const getVersion = () => {
  return pkg['version']
}

/**
 * @description Hikaru's default 404 page content for server.
 * @type {String}
 */
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
  isBinary,
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
  isCurrentPathFn,
  resolveHeaderIDs,
  getURLProtocol,
  resolveLink,
  resolveImage,
  genTOC,
  getVersion,
  default404
}
