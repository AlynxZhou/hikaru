"use strict";

/**
 * @module utils
 */

const path = require("path");
const glob = require("glob");
const YAML = require("yaml");
const parse5 = require("parse5");
// OMG you are adding new dependency! Why not implement it yourself?
// Calm down, it has no dependency so just give it a chance.
// And its code is a little bit long.
const {isBinaryFile, isBinaryFileSync} = require("isbinaryfile");
const {Site, File, Category, Tag, TOC} = require("./types");
const pkg = require("../package.json");
const extMIME = require("../dists/ext-mime.json");

/**
 * @param {*} o
 * @return {Boolean}
 */
const isString = (o) => {
  return typeof o === "string";
};

/**
 * @param {*} o
 * @return {Boolean}
 */
const isArray = (o) => {
  return Array.isArray(o);
};

/**
 * @param {*} o
 * @return {Boolean}
 */
const isFunction = (o) => {
  return o instanceof Function;
};

/**
 * @param {*} o
 * @return {Boolean} Return `false` when `o == null`.
 */
const isObject = (o) => {
  return typeof o === "object" && o != null;
};

/**
 * @param {*} o
 * @return {Boolean}
 */
const isBuffer = (o) => {
  return Buffer.isBuffer(o);
};

/**
 * @description You should use `isBinaryFile(filepath)` because it does not
 * read full file into memory so you can get a better performance.
 * @see https://github.com/gjtorikian/isBinaryFile#isbinaryfilefilepath
 * @param {Buffer} b
 * @return {Boolean}
 */
const isBinary = (b) => {
  return isBuffer(b) && !b.equals(Buffer.from(b.toString("utf8"), "utf8"));
};

/**
 * @description Escape HTML chars.
 * @param {String} str
 * @return {String} Escaped HTML string.
 */
const escapeHTML = (str) => {
  return str.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

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
        return reject(error);
      }
      return resolve(result);
    });
  });
};

/**
 * @description Remove XML control chars.
 * @param {String} str
 * @return {String} XML string.
 */
const removeControlChars = (str) => {
  /* eslint-disable-next-line no-control-regex */
  return str.replace(/[\x00-\x1F\x7F]/g, "");
};

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
  // Return if not start with /^---+\r?\n/.
  // This only matches once so `g` is not required.
  if (!/^---+\r?\n/.test(str)) {
    return {"attributes": {}, "body": str};
  }
  // We split string manually instead of using `str.split(regexp, 3)`,
  // this function will split the whole string first
  // and then return the first 3 result.
  // But we want to only split twice.
  // Flag `m` can be used for per line test.
  // `exec()`, `matchAll()` requires `g`.
  // We need to use /\r?\n/ here instead of /$/,
  // because we need to calculate `\r` and `\n` when splitting.
  const regexp = /^---+\r?\n/gm;
  // RegExp is stateful so `exec()` will start after last matched result.
  const fmBegin = regexp.exec(str);
  const fmEnd = regexp.exec(str);
  // `null` is returned if not match.
  // No front-matter at all.
  if (fmBegin == null || fmEnd == null) {
    return {"attributes": {}, "body": str};
  }
  // Matched result looks like
  // `["---\n", "index": 0, "input": "---\n", "groups": undefined]`.
  // It is a mix of Array and Object. We use it to split string manually.
  const result = {
    "body": str.substring(fmEnd.index + fmEnd[0].length),
    "frontMatter": str.substring(fmBegin.index + fmBegin[0].length, fmEnd.index)
  };
  try {
    result["attributes"] = YAML.parse(result["frontMatter"]);
  } catch (error) {
    result["attributes"] = {};
  }
  return result;
};

/**
 * @description Parse front-matter and set properties to file.
 * @param {File} file
 * @return {File}
 */
const parseFrontMatter = (file) => {
  if (file["text"] == null) {
    return file;
  }
  const parsed = getFrontMatter(file["text"]);
  file["text"] = parsed["body"];
  file["frontMatter"] = parsed["attributes"];
  file = Object.assign(file, parsed["attributes"]);
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse
  // ISO 8601 date time format is expected,
  // and by default a string with date and time will be parsed as local time.
  file["updated"] = file["updated"] || file["updatedDate"];
  if (file["updated"] != null) {
    file["updated"] = new Date(file["updated"]);
  }
  file["updatedDate"] = file["updated"];
  file["created"] = file["created"] || file["createdDate"];
  if (file["created"] != null) {
    file["created"] = new Date(file["created"]);
  }
  file["createdDate"] = file["created"];
  return file;
};

/**
 * @description Detect Content-Type via filename.
 * @param {String} docPath
 * @return {String} Content-Type value.
 */
const getContentType = (docPath) => {
  return extMIME[path.extname(docPath)] || "application/octet-stream";
};

/**
 * @description Paginate page's posts.
 * @param {File} p Original page.
 * @param {File[]} posts Page related posts.
 * @param {Number} [perPage=10] How many posts per page.
 * @return {File[]} Paginated pages, original page's index is 0.
 */
const paginate = (p, posts = [], perPage = 10) => {
  const results = [];
  let perPagePosts = [];
  for (const post of posts) {
    if (perPagePosts.length === perPage) {
      results.push(Object.assign(new File(), p, {"posts": perPagePosts}));
      perPagePosts = [];
    }
    perPagePosts.push(post);
  }
  results.push(Object.assign(new File(), p, {"posts": perPagePosts}));
  results[0]["pageArray"] = results;
  results[0]["pageIndex"] = 0;
  results[0]["docPath"] = p["docPath"];
  for (let i = 1; i < results.length; ++i) {
    results[i]["pageArray"] = results;
    results[i]["pageIndex"] = i;
    results[i]["docPath"] = path.join(
      path.dirname(p["docPath"]),
      `${path.basename(
        p["docPath"], path.extname(p["docPath"])
      )}-${i + 1}.html`
    );
  }
  return results;
};

/**
 * @description Sort categories and their posts recursively.
 * @param {Category} category
 */
const sortCategories = (category) => {
  category["posts"].sort((a, b) => {
    return -(a["date"] - b["date"]);
  });
  category["subs"].sort((a, b) => {
    return a["name"].localeCompare(b["name"]);
  });
  for (const sub of category["subs"]) {
    sortCategories(sub);
  }
};

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
  let results = [];
  const sp = new File({
    "layout": "category",
    "docDir": site["siteConfig"]["docDir"],
    "docPath": path.join(parentPath, `${category["name"]}`, "index.html"),
    "title": "category",
    "name": category["name"].toString(),
    "comment": false,
    "reward": false
  });
  category["docPath"] = sp["docPath"];
  results = results.concat(paginate(sp, category["posts"], perPage));
  for (const sub of category["subs"]) {
    results = results.concat(
      paginateCategories(sub, path.join(
        parentPath, `${category["name"]}`
      ), site, perPage)
    );
  }
  return results;
};

/**
 * @callback getPath
 * @param {String} [docPath]
 * @param {Boolean} [skipEncode=false] If true, skip `encodeURI()`.
 * @return {String} Full path that starts with site rootDir.
 */
/**
 * @description Get a function to handle full website path.
 * @param {String} [rootDir] Site rootDir.
 * @return {getPath}
 */
const getPathFn = (rootDir = path.posix.sep) => {
  // Anyway, we need to escape backslash literally using RegExp.
  const winSepRegExp = new RegExp(`\\${path.win32.sep}`, "g");
  rootDir = rootDir.replace(winSepRegExp, path.posix.sep);
  if (!rootDir.endsWith(path.posix.sep)) {
    rootDir = path.posix.join(rootDir, path.posix.sep);
  }
  if (!path.posix.isAbsolute(rootDir)) {
    rootDir = path.posix.join(path.posix.sep, rootDir);
  }
  return (docPath = "", skipEncode = false) => {
    // Handle link with query string or hash.
    // Use assertion to prevent `?` and `#` to be removed.
    const array = docPath.split(/(?=[?#])/);
    array[0] = array[0].replace(winSepRegExp, path.posix.sep);
    if (array[0].endsWith("index.html")) {
      array[0] = array[0].substring(0, array[0].length - "index.html".length);
    } else if (array[0].endsWith("index.htm")) {
      array[0] = array[0].substring(0, array[0].length - "index.htm".length);
    }
    /**
     * marked.js and CommonMark tends to do URL encode by themselevs.
     * Maybe I should not do `encodeURL()` here.
     * See <https://github.com/markedjs/marked/issues/1285>.
     */
    return skipEncode
      ? path.posix.join(rootDir, ...array)
      : encodeURI(path.posix.join(rootDir, ...array));
  };
};

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
  const getPath = getPathFn(rootDir);
  return (docPath = "") => {
    return new URL(getPath(docPath), baseURL);
  };
};

/**
 * @callback isCurrentPath
 * @description Test if given path is current path.
 * This function does not care query string and hash.
 * @param {String} [testPath] Path needed to test.
 * @param {Boolean} [strict=false] If not strict, true is also returned
 * if current path is under give path. This is useful to highlight
 * menu items if current path is under it.
 * @return {Boolean}
 */
/**
 * @description Get a function to handle if parameter is current path.
 * @param {String} [rootDir] Site rootDir.
 * @param {String} [currentPath] current page's path.
 * @return {isCurrentPath}
 */
const isCurrentPathFn = (rootDir = path.posix.sep, currentPath = "") => {
  // Must join a '/' before resolve or it will join current site dir.
  const getPath = getPathFn(rootDir);
  // Anyway, we need to escape backslash literally using RegExp.
  const winSepRegExp = new RegExp(`\\${path.win32.sep}`, "g");
  currentPath = getPath(currentPath).split(/[?#]/)[0];
  const currentToken = path.posix.resolve(path.posix.join(
    path.posix.sep, currentPath.replace(winSepRegExp, path.posix.sep)
  )).split(path.posix.sep);
  return (testPath = "", strict = false) => {
    if (!isString(testPath)) {
      strict = testPath;
      testPath = "";
    }
    testPath = getPath(testPath).split(/[?#]/)[0];
    if (currentPath === testPath) {
      return true;
    }
    const testToken = path.posix.resolve(path.posix.join(
      path.posix.sep, testPath.replace(winSepRegExp, path.posix.sep)
    )).split(path.posix.sep);
    if (strict && testToken.length !== currentToken.length) {
      return false;
    }
    // testPath is shorter and usually be a menu link.
    for (let i = 0; i < testToken.length; ++i) {
      if (testToken[i] !== currentToken[i]) {
        return false;
      }
    }
    return true;
  };
};

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
  const categories = [];
  let categoriesLength = 0;
  for (const post of posts) {
    if (post["frontMatter"]["categories"] == null) {
      continue;
    }
    const postCategories = [];
    let subCategories = categories;
    for (const cateName of post["frontMatter"]["categories"]) {
      let found = false;
      for (const category of subCategories) {
        if (category["name"] === cateName) {
          found = true;
          postCategories.push(category);
          category["posts"].push(post);
          subCategories = category["subs"];
          break;
        }
      }
      if (!found) {
        const newCate = new Category(cateName, [post], []);
        ++categoriesLength;
        postCategories.push(newCate);
        subCategories.push(newCate);
        subCategories = newCate["subs"];
      }
    }
    post["categories"] = postCategories;
  }
  categories.sort((a, b) => {
    return a["name"].localeCompare(b["name"]);
  });
  return {categories, categoriesLength};
};

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
  const tags = [];
  let tagsLength = 0;
  for (const post of posts) {
    if (post["frontMatter"]["tags"] == null) {
      continue;
    }
    const postTags = [];
    for (const tagName of post["frontMatter"]["tags"]) {
      let found = false;
      for (const tag of tags) {
        if (tag["name"] === tagName) {
          found = true;
          postTags.push(tag);
          tag["posts"].push(post);
          break;
        }
      }
      if (!found) {
        const newTag = new Tag(tagName, [post]);
        ++tagsLength;
        postTags.push(newTag);
        tags.push(newTag);
      }
    }
    post["tags"] = postTags;
  }
  tags.sort((a, b) => {
    return a["name"].localeCompare(b["name"]);
  });
  return {tags, tagsLength};
};

/**
 * @description Put file into an array in site,
 * will replace file with the same doc path.
 * @param {Site} site
 * @param {String} key
 * @param {File} file
 */
const putSite = (site, key, file) => {
  if (file == null || !Site.arrayKeys.includes(key)) {
    return;
  }
  const i = site[key].findIndex((element) => {
    return (
      element["docPath"] === file["docPath"] &&
      element["docDir"] === file["docDir"]
    );
  });
  if (i !== -1) {
    site[key][i] = file;
  } else {
    site[key].push(file);
  }
};

/**
 * @description Delete file from an array in site,
 * which have the same src path.
 * @param {Site} site
 * @param {String} key
 * @param {File} file
 */
const delSite = (site, key, file) => {
  if (file == null || !Site.arrayKeys.includes(key)) {
    return;
  }
  for (let i = 0; i < site[key].length; ++i) {
    if (
      site[key][i]["srcPath"] === file["srcPath"] &&
      site[key][i]["srcDir"] === file["srcDir"]
    ) {
      // Don't use break here because we may have mutiply files
      // created with the same source.
      site[key].splice(i, 1);
      // Don't forget this because we removed one element from array!
      --i;
    }
  }
};

/**
 * @description Get File's full src path.
 * @param {File} file
 * @return {String}
 */
const getFullSrcPath = (file) => {
  if (file == null || file["srcDir"] == null || file["srcPath"] == null) {
    return null;
  }
  return path.join(file["srcDir"], file["srcPath"]);
};

/**
 * @description Get File's full document path.
 * @param {File} file
 * @return {String}
 */
const getFullDocPath = (file) => {
  if (file == null || file["docDir"] == null || file["docPath"] == null) {
    return null;
  }
  return path.join(file["docDir"], file["docPath"]);
};

/**
 * @see https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/index.md#parsefragment
 * @see https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/tree-adapter/default/document-fragment.md
 * @description Parse HTML string into parse5 Node.
 * @param {Object} [node] If specified, given fragment will be parsed as if
 * it was set to the context element's `innerHTML` property.
 * @param {String} html HTML string to parse.
 * @param {Object} [options] parse5 options.
 * @return {Object}
 */
const parseNode = (node, html, options) => {
  return parse5.parseFragment(node, html, options);
};

/**
 * @see https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/index.md#serialize
 * @description Serialize parse5 Node into HTML string.
 * @param {Object} node parse5 Node to serialize.
 * @param {Object} [options] parse5 options.
 * @return {String}
 */
const serializeNode = (node, options) => {
  return parse5.serialize(node, options);
};

/**
 * @description Quick and not so dirty way to replace a Node with given HTML string,
 * if more then one node parsed from string, only use the first one.
 * @param {Object} node parse5 Node to replace.
 * @param {String} html
 */
const replaceNode = (node, html) => {
  if (node["parentNode"] != null && html != null) {
    const newNode = parseNode(node["parentNode"], html);
    if (newNode["childNodes"].length > 0) {
      newNode["childNodes"][0]["parentNode"] = node["parentNode"];
      Object.assign(node, newNode["childNodes"][0]);
    }
  }
};

/**
 * @callback traversalCallback
 * @param {Object} node parse5 Node.
 */
/**
 * @see https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/tree-adapter/default/element.md
 * @description Recursively Pre-Order Traversal of parse5 Node.
 * @param {Object} node Root parse5 Node of a tree.
 * @param {traversalCallback} callback
 */
const nodesEach = (node, callback) => {
  if (isFunction(callback)) {
    callback(node);
    if (node["childNodes"] != null) {
      for (const childNode of node["childNodes"]) {
        nodesEach(childNode, callback);
      }
    }
  }
};

/**
 * @callback filterCallback
 * @param {Object} node parse5 Node.
 * @return {Boolean} True to collect a node into an Array.
 */
/**
 * @see https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/tree-adapter/default/element.md
 * @description Recursively Pre-Order Traversal of parse5 Node.
 * @param {Object} node Root parse5 Node of a tree.
 * @param {filterCallback} callback
 * @return {Object[]} An Array of filtered parse5 Nodes.
 */
const nodesFilter = (node, callback) => {
  const results = [];
  if (isFunction(callback)) {
    nodesEach(node, (node) => {
      if (callback(node)) {
        results.push(node);
      }
    });
  }
  return results;
};

/**
 * @see https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/tree-adapter/default/element.md
 * @see https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/tree-adapter/default/text-node.md
 * @description Get text content of a parse5 Node.
 * @param {Object} node parse5 Node.
 * @return {String}
 */
const getNodeText = (node) => {
  if (node["childNodes"] != null) {
    for (const childNode of node["childNodes"]) {
      if (childNode["nodeName"] === "#text") {
        return childNode["value"];
      }
    }
  }
  return null;
};

/**
 * @description Set text content (or innerHTML) of a parse5 Node.
 * @param {Object} node parse5 Node.
 * @param {String} html
 */
const setNodeText = (node, html) => {
  // Add HTML to childNodes via parsing and replacing
  // to keep tree reference, and skip the parse5-generated
  // `#document-fragment` node.
  // Text nodes have no childNode.
  // Only append to nodes that already have childNodes.
  if (node["childNodes"] != null) {
    // Don't forget to replace childNode's parentNode.
    node["childNodes"] = parseNode(node, html)["childNodes"].map((c) => {
      c["parentNode"] = node;
      return c;
    });
  }
};

/**
 * @see https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/tree-adapter/default/element.md
 * @see https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/tree-adapter/default/attribute.md
 * @description Get an attribute value from parse5 Node.
 * @param {Object} node parse5 Node.
 * @param {String} attrName
 * @return {String} Value of the attribute, null if not available.
 */
const getNodeAttr = (node, attrName) => {
  if (node["attrs"] != null) {
    for (const attr of node["attrs"]) {
      if (attr["name"] === attrName) {
        return attr["value"];
      }
    }
  }
  return null;
};

/**
 * @description Set an attribute value to parse5 Node.
 * @param {Object} node parse5 Node.
 * @param {String} attrName
 * @param {String} attrValue
 */
const setNodeAttr = (node, attrName, attrValue) => {
  // Do not add attr to nodes without attrs array,
  // for example text node.
  if (node["attrs"] != null) {
    for (const attr of node["attrs"]) {
      // Already have this attr, then replace.
      if (attr["name"] === attrName) {
        attr["value"] = attrValue;
        return;
      }
    }
    // Have other attrs but not this, so append.
    node["attrs"].push({"name": attrName, "value": attrValue});
  }
};

/**
 * @description Update headers' ID for bootstrap scrollspy.
 * @param {Object} node parse5 Node.
 */
const resolveHeaderIDs = (node) => {
  const headerNames = ["h1", "h2", "h3", "h4", "h5", "h6"];
  const headerIDs = {};
  const headerNodes = nodesFilter(node, (node) => {
    return headerNames.includes(node["tagName"]);
  });
  for (const node of headerNodes) {
    const text = getNodeText(node);
    if (text != null) {
      // Remove some chars in escaped ID because
      // bootstrap scrollspy cannot support it.
      const encoded = encodeURI(
        text.trim().replace(/[\s()[\]{}<>.,!@#$%^&*=|`'/?~]+/g, "")
      );
      const id = headerIDs[encoded] == null
        ? encoded
        : `${encoded}-${headerIDs[encoded]++}`;
      // If we have `abc`, `abc` and `abc-1`,
      // we must save the `abc-1` generated by the second `abc`,
      // to prevent 2 `abc-1` for the last `abc-1`.
      headerIDs[id] = 1;
      setNodeAttr(node, "id", id);
      setNodeText(node, `<a class="header-link" href="#${id}"></a>${text}`);
    }
  }
};

/**
 * @description Generate TOC from HTML headers.
 * @param {Object} node parse5 Node.
 */
const genTOC = (node) => {
  const headerNames = ["h1", "h2", "h3", "h4", "h5", "h6"];
  const toc = [];
  const headerNodes = nodesFilter(node, (node) => {
    return headerNames.includes(node["tagName"]);
  });
  for (const node of headerNodes) {
    let level = toc;
    while (
      level.length > 0 &&
      headerNames.indexOf(
        level[level.length - 1]["name"]
      ) < headerNames.indexOf(node["tagName"])
    ) {
      level = level[level.length - 1]["subs"];
    }
    const id = getNodeAttr(node, "id");
    const text = getNodeText(node);
    if (id != null && text != null) {
      // Don't set anchor to absolute path,
      // because it's hard to write selector for scrollspy.
      level.push(new TOC(node["tagName"], `#${id}`, text.trim()));
    }
  }
  return toc;
};

/**
 * @description Get protocol of a URL.
 * @param {String} url
 * @return {String} If no protocol return null.
 */
const getURLProtocol = (url) => {
  try {
    // If no protocol in url, it will throw an error.
    return new URL(url).protocol;
  } catch (error) {
    return null;
  }
};

/**
 * @description Update site's internal link to absolute path,
 * and add attributes for external link.
 * @param {Object} node parse5 Node.
 * @param {String} [baseURL] Site baseURL.
 * @param {String} [rootDir] Site rootDir.
 * @param {String} [docPath]
 */
const resolveAnchors = (node, baseURL, rootDir, docPath) => {
  const getURL = getURLFn(baseURL, rootDir);
  const getPath = getPathFn(rootDir);
  // Replace relative path to absolute path.
  const anchorNodes = nodesFilter(node, (node) => {
    return node["tagName"] === "a";
  });
  for (const node of anchorNodes) {
    const href = getNodeAttr(node, "href");
    if (href != null) {
      // If `href` is a valid URL, `baseURL` will be ignored.
      // So we can compare host for all links here.
      const url = new URL(href, baseURL);
      // It returns `"null"` for data URL!
      if (url.origin !== "null" && url.origin !== getURL().origin) {
        setNodeAttr(node, "target", "_blank");
        setNodeAttr(node, "rel", "external nofollow noreferrer noopener");
      }
      // `path.posix.isAbsolute()` detects `/` or `//`.
      if (!(path.posix.isAbsolute(href) || getURLProtocol(href) != null)) {
        /**
         * marked.js and CommonMark tends to do URL encode by themselves.
         * I should skip `encodeURI()` here and do it for header ID only.
         * See <https://github.com/markedjs/marked/issues/1285>.
         */
        setNodeAttr(
          node, "href", getPath(path.join(path.dirname(docPath), href), true)
        );
      }
    }
  }
};

/**
 * @description Update site's internal image src to absolute path.
 * @param {Object} node parse5 Node.
 * @param {String} [rootDir] Site rootDir.
 * @param {String} [docPath]
 */
const resolveImages = (node, rootDir, docPath) => {
  const getPath = getPathFn(rootDir);
  // Replace relative path to absolute path.
  const imageNodes = nodesFilter(node, (node) => {
    return node["tagName"] === "img";
  });
  for (const node of imageNodes) {
    const src = getNodeAttr(node, "src");
    if (src != null) {
      // `path.posix.isAbsolute()` detects `/` or `//`.
      if (!(path.posix.isAbsolute(src) || getURLProtocol(src) != null)) {
        setNodeAttr(
          node, "src", getPath(path.join(path.dirname(docPath), src))
        );
      }
    }
  }
};

/**
 * @private
 * @description Require hljs still takes a long time so only require it
 * when needed.
 */
let hljs = null;
/**
 * @private
 * @description Cache table for hljs's aliases.
 */
let hljsAliases = null;

/**
 * @private
 * @return {Map} Key is alias, value is hljs language name.
 */
const hljsLoadAliases = () => {
  const hljsAliases = new Map();
  const languages = hljs.listLanguages();
  for (const lang of languages) {
    // First add language itself.
    hljsAliases.set(lang, lang);
    // Then register it.
    const hljsModule = require(`highlight.js/lib/languages/${lang}`);
    hljs.registerLanguage(lang, hljsModule);
    // And add its aliases.
    const aliases = hljsModule(hljs)["aliases"];
    if (aliases != null) {
      for (const alias of aliases) {
        hljsAliases.set(alias, lang);
      }
    }
  }
  return hljsAliases;
};

/**
 * @description Format and highlight code block.
 * @param {Object} node parse5 Node.
 * @param {Object} [hlOpts] Highlight options.
 */
const resolveCodeBlocks = (node, hlOpts = {}) => {
  // Enable hljs prefix and gutter by default.
  hlOpts = Object.assign({"hljs": true, "gutter": true}, hlOpts);
  // Only load hljs if enabled.
  if (hlOpts["enable"]) {
    if (hlOpts["hljs"]) {
      hlOpts["classPrefix"] = "hljs-";
    }
    if (hljs == null) {
      hljs = require("highlight.js");
    }
    hljs.configure(hlOpts);
    if (hljsAliases == null) {
      hljsAliases = hljsLoadAliases();
    }
  }

  const codeBlockNodes = nodesFilter(node, (node) => {
    return node["tagName"] === "pre" &&
           // Prevent re-resolving code blocks when re-process.
           node["parentNode"]["tagName"] !== "figure" &&
           node["childNodes"].length === 1 &&
           node["childNodes"][0]["tagName"] === "code";
  });
  for (const node of codeBlockNodes) {
    const code = getNodeText(node["childNodes"][0]);
    if (code != null) {
      const info = getNodeAttr(node["childNodes"][0], "class");
      // Many Markdown renderer add `language-` prefix to code block's info.
      // Better to remove it while processing to keep consistent.
      let lang = info;
      const langPrefix = "language-";
      if (info != null && info.startsWith(langPrefix)) {
        lang = info.substring(langPrefix.length);
      }
      const escapedCode = escapeHTML(code);

      const results = [`<figure data-raw="${escapedCode}"`];
      if (info != null) {
        results.push(` data-info="${info}" data-lang="${lang}"`);
      }
      results.push(" class=\"code-block");
      if (hlOpts["enable"]) {
        // Because we want to use hljs' css,
        // so `hljs` is added here to set background.
        results.push(" highlight hljs");
      }
      results.push("\">");

      // Highlight first for making gutter.
      // Some info means skipping highlight.
      let data;
      if (!hlOpts["enable"] ||
          lang === "none" ||
          lang === "plain" ||
          lang === "plaintext" ||
          lang === "nohighlight") {
        data = {"value": escapedCode};
      } else if (hljsAliases.has(lang)) {
        // If user gives a reasonable language hint (but maybe incorrect),
        // we use it, because auto detect all code is too slow.
        data = hljs.highlight(hljsAliases.get(lang), code);
      } else {
        // No language hint, or just not resonable.
        data = hljs.highlightAuto(code);
      }

      if (hlOpts["gutter"]) {
        results.push("<pre class=\"gutter\">");
        // Highlight should not change lines.
        // But may replace `\n` with `<br>`, so use original code here.
        const codeLines = code.split(/\r?\n/g);
        // It seems marked.js starts to keep the last `\n`,
        // which will leave an empty line after splitting,
        // and we should not add gutter for the last empty line.
        // Don't do trim here! We only skip empty line.
        if (codeLines[codeLines.length - 1].length === 0) {
          codeLines.pop();
        }
        for (let i = 0; i < codeLines.length; ++i) {
          results.push(`<span class="line-number">${i + 1}</span>`);
          if (i !== codeLines.length - 1) {
            results.push("\n");
          }
        }
        results.push("</pre>");
      }

      results.push("<pre class=\"code\">");
      // If highlight is disabled or skipped, data["language"] will be null.
      // Then we set class to original info,
      // so user can do highlight in browser.
      if (hlOpts["enable"] && data["language"] != null) {
        results.push(`<code class="language-${data["language"]}">`);
      } else if (info != null) {
        results.push(`<code class="${info}">`);
      } else {
        results.push("<code>");
      }
      results.push(data["value"]);
      results.push("</code></pre>");

      results.push("</figure>");
      replaceNode(node, results.join(""));
    }
  }
};

/**
 * @description Get Hikaru version.
 * @return {String}
 */
const getVersion = () => {
  return pkg["version"];
};

/**
 * @description Hikaru's default 404 page content for server.
 * @type {String}
 */
const default404 = [
  "<!DOCTYPE html>",
  "<html>",
  "  <head>",
  "    <meta charset=\"utf-8\">",
  "    <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">",
  "    <meta name=\"viewport\" content=\"",
  "      width=device-width,",
  "      initial-scale=1,",
  "      maximum-scale=1",
  "    \">",
  "    <title>404 Not Found</title>",
  "  </head>",
  "  <body>",
  "    <h1>404 Not Found</h1>",
  `    <p>Hikaru v${getVersion()}</p>`,
  "  </body>",
  "</html>"
].join("");

module.exports = {
  isString,
  isArray,
  isFunction,
  isObject,
  isBuffer,
  isBinary,
  isBinaryFile,
  isBinaryFileSync,
  escapeHTML,
  matchFiles,
  removeControlChars,
  getFrontMatter,
  parseFrontMatter,
  getContentType,
  paginate,
  sortCategories,
  paginateCategories,
  getPathFn,
  getURLFn,
  isCurrentPathFn,
  genCategories,
  genTags,
  putSite,
  delSite,
  getFullSrcPath,
  getFullDocPath,
  parseNode,
  serializeNode,
  replaceNode,
  nodesEach,
  nodesFilter,
  getNodeText,
  setNodeText,
  getNodeAttr,
  setNodeAttr,
  resolveHeaderIDs,
  genTOC,
  getURLProtocol,
  resolveAnchors,
  resolveImages,
  resolveCodeBlocks,
  getVersion,
  default404
};
