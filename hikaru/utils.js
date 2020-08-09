"use strict";

/**
 * @module utils
 */

const path = require("path");
const glob = require("glob");
const hljs = require("highlight.js");
const YAML = require("yaml");
const {URL} = require("url");
const parse5 = require("parse5");
const moment = require("moment-timezone");
const {File, Category, Tag, TOC} = require("./types");
const pkg = require("../package.json");
const extMIME = require("../dist/ext-mime.json");

/**
 * @private
 * @description Cache table for hljs's aliases.
 */
let hljsAliases = null;

/**
 * @private
 * @return {Object} Key is alias, value is hljs lang name.
 */
const loadLangAliases = () => {
  const hljsAliases = {};
  const languages = hljs.listLanguages();
  for (const lang of languages) {
    hljsAliases[lang] = lang;
    const lAliases = require(
      `highlight.js/lib/languages/${lang}`
    )(hljs)["aliases"];
    if (lAliases != null) {
      for (const alias of lAliases) {
        hljsAliases[alias] = lang;
      }
    }
  }
  return hljsAliases;
};

/**
 * @private
 * @typedef {Object} Data
 * @property {Number} [relevance]
 * @property {String} [language] Detected language.
 * @property {String} value Highlighted HTML string.
 */
/**
 * @private
 * @description Try to automatic highlight code with detection.
 * @param {String} code str
 * @return {Data}
 */
const highlightAuto = (code) => {
  for (const lang of Object.values(hljsAliases)) {
    if (hljs.getLanguage(lang) == null) {
      hljs.registerLanguage(
        lang, require(`highlight.js/lib/languages/${lang}`)
      );
    }
  }
  const data = hljs.highlightAuto(code);
  if (data["relevance"] > 0 && data["language"] != null) {
    return data;
  }
  return {"value": escapeHTML(code)};
};

/**
 * @private
 * @description Highlight code.
 * @param {String} code
 * @param {Object} [opts] Optional hljs parameters.
 * @param {Boolean} [opts.hljs] Add `hljs-` prefix to class name.
 * @param {Boolean} [opts.gutter] Generate line numbers.
 * @return {String} Highlighted HTML.
 */
const highlight = (code, opts = {}) => {
  if (opts == null) {
    opts = {};
  }
  if (hljsAliases == null) {
    hljsAliases = loadLangAliases();
  }
  if (opts["hljs"]) {
    hljs.configure({"classPrefix": "hljs-"});
  }

  let data;
  if (opts["lang"] == null) {
    // Guess when no lang was given.
    data = highlightAuto(code);
  } else if (opts["lang"] === "plain") {
    // Skip auto guess when user sets lang to plain,
    // plain is not in the alias list, so judge it first.
    data = {"value": escapeHTML(code)};
  } else if (hljsAliases[opts["lang"]] == null) {
    // Guess when lang is given but not in highlightjs' alias list, too.
    data = highlightAuto(code);
  } else {
    // We have correct lang alias, tell highlightjs to handle it.
    // If given language does not match string content,
    // highlightjs will set language to undefined.
    data = hljs.highlight(hljsAliases[opts["lang"]], code);
  }

  const results = [];

  if (opts["gutter"]) {
    results.push("<pre class=\"gutter\">");
    const lines = data["value"].split(/\r?\n/g).length;
    for (let i = 0; i < lines; ++i) {
      results.push(`<span class="line">${i + 1}</span>`);
      if (i !== lines - 1) {
        results.push("\n");
      }
    }
    results.push("</pre>");
  }

  results.push("<pre class=\"code");
  if (data["language"] != null) {
    results.push(` ${data["language"].toLowerCase()}`);
  }
  results.push("\">");
  results.push(data["value"]);
  results.push("</pre>");
  return results.join("");
};

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
  if (!isString(str) || !/^---\r?\n/g.test(str)) {
    return {"attributes": {}, "body": str};
  }
  // Use flag `m` for per line test, not `g`.
  const array = str.split(/^---\r?\n/m, 3);
  // No front-matter at all.
  if (array.length !== 3) {
    return {"attributes": {}, "body": str, "frontMatter": ""};
  }
  // ['', frontMatter, body]
  const result = {"attributes": {}, "body": array[2], "frontMatter": array[1]};
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
  if (!isString(file["raw"])) {
    return file;
  }
  const parsed = getFrontMatter(file["raw"]);
  file["text"] = parsed["body"];
  file["frontMatter"] = parsed["attributes"];
  file = Object.assign(file, parsed["attributes"]);
  file["updatedDate"] = file["updatedDate"] || file["updatedTime"];
  if (file["updatedDate"] != null) {
    // String does not have timezone so we add it.
    file["updatedMoment"] = moment.tz(
      file["updatedDate"],
      file["zone"] || moment.tz.guess()
    );
    file["updatedDate"] = file["updatedMoment"].toDate();
  }
  file["createdDate"] = file["createdDate"] || file["createdTime"];
  if (file["createdDate"] != null) {
    // String does not have timezone so we add it.
    file["createdMoment"] = moment.tz(
      file["createdDate"],
      file["zone"] || moment.tz.guess()
    );
    file["createdDate"] = file["createdMoment"].toDate();
  }
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
const paginate = (p, posts, perPage = 10) => {
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
 * @return {String} Encoded URI path for web link.
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
  return (docPath = "") => {
    // Handle link with query string or hash.
    // Use assertion to prevent `?` and `#` to be removed.
    const array = docPath.split(/(?=[?#])/);
    array[0] = array[0].replace(winSepRegExp, path.posix.sep);
    if (array[0].endsWith("index.html")) {
      array[0] = array[0].substring(0, array[0].length - "index.html".length);
    } else if (array[0].endsWith("index.htm")) {
      array[0] = array[0].substring(0, array[0].length - "index.htm".length);
    }
    return encodeURI(path.posix.join(rootDir, ...array));
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
 * will replace file with the same output path.
 * @param {Site} site
 * @param {String} key
 * @param {File} file
 */
const putSite = (site, key, file) => {
  if (key == null || file == null || !isArray(site[key])) {
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
 * which have the same input path.
 * @param {Site} site
 * @param {String} key
 * @param {File} file
 */
const delSite = (site, key, file) => {
  if (key == null || file == null || !isArray(site[key])) {
    return;
  }
  for (let i = 0; i < site[key].length; ++i) {
    if (
      site[key][i]["srcPath"] === file["srcPath"] &&
      site[key][i]["srcDir"] === file["srcDir"]
    ) {
      site[key].splice(i, 1);
    }
  }
};

/**
 * @see https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/index.md#parsefragment
 * @see https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/tree-adapter/default/document-fragment.md
 * @description Parse HTML string into parse5 Node.
 * @param {Object} [node] If specified, given fragment will be parsed as if
 * it was set to the context element's `innerHTML` property.
 * @param {String} html HTML string to parse.
 * @param {Object} [options] parse5 options.\
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
    return;
  }
  // No attr at all, just create.
  node["attrs"] = [{"name": attrName, "value": attrValue}];
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
      const escaped = escapeHTML(text).trim().replace(
        /[\s()[\]{}<>.,!@#$%^&*=|`'/?~]+/g,
        ""
      );
      let id;
      if (headerIDs[escaped] == null) {
        id = escaped;
        headerIDs[escaped] = 1;
      } else {
        id = `${escaped}-${headerIDs[escaped]++}`;
        // If we have `abc`, `abc` and `abc-1`,\
        // we must save the `abc-1` generated by the second `abc`,
        // to prevent 2 `abc-1` for the last `abc-1`.
        headerIDs[id] = 1;
      }
      setNodeAttr(node, "id", id);
      setNodeText(
        node,
        `<a class="header-link" href="#${id}" title="${escaped}"></a>${text}`
      );
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
    // If no protocol in url, `URL()` will throw an error.
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
const resolveLink = (node, baseURL, rootDir, docPath) => {
  const getURL = getURLFn(baseURL, rootDir);
  const getPath = getPathFn(rootDir);
  // Replace relative path to absolute path.
  const linkNodes = nodesFilter(node, (node) => {
    return node["tagName"] === "a";
  });
  for (const node of linkNodes) {
    const href = getNodeAttr(node, "href");
    if (href != null) {
      // If `href` is a valid URL, `baseURL` will be ignored.
      // So we can compare host for all links here.
      if (new URL(href, baseURL).origin !== getURL(docPath).origin) {
        setNodeAttr(node, "target", "_blank");
        setNodeAttr(node, "rel", "noreferrer noopener");
      }
      // `path.posix.isAbsolute()` detects `/` or `//`.
      if (!(path.posix.isAbsolute(href) || getURLProtocol(href) != null)) {
        setNodeAttr(
          node, "href", getPath(path.join(path.dirname(docPath), href))
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
const resolveImage = (node, rootDir, docPath) => {
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
 * @description Format and highlight code block.
 * @param {Object} node parse5 Node.
 * @param {Object} [hlOpts] Highlight options.
 */
const resolveCodeBlocks = (node, hlOpts = {}) => {
  const codeBlockNodes = nodesFilter(node, (node) => {
    return node["tagName"] === "pre" &&
           node["childNodes"].length === 1 &&
           node["childNodes"][0]["tagName"] === "code";
  });
  for (const node of codeBlockNodes) {
    const code = getNodeText(node["childNodes"][0]);
    const lang = getNodeAttr(node["childNodes"][0], "class");
    const escapedCode = escapeHTML(code);
    const results = [`<figure data-raw="${escapedCode}"`];
    if (lang != null) {
      results.push(` data-lang="${lang.toLowerCase()}"`);
    }
    // Because we want to use hljs' css, so `hljs` is used to set background.
    results.push(" class=\"code-block hljs");
    if (hlOpts["enable"]) {
      results.push(" highlight\">");
      results.push(highlight(code, Object.assign({
        "lang": lang != null ? lang.toLowerCase() : null,
        "hljs": true,
        "gutter": true
      }, hlOpts)));
    } else {
      results.push("\">");
      results.push(`<pre class="code">${escapedCode}</pre>`);
    }
    results.push("</figure>");
    replaceNode(node, results.join(""));
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
  isCurrentPathFn,
  genCategories,
  genTags,
  putSite,
  delSite,
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
  resolveLink,
  resolveImage,
  resolveCodeBlocks,
  getVersion,
  default404
};
