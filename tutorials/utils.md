Utils
=====

Here are some useful utils built in Hikaru, you can get them from `hikaru.utils` and use them in plugins and scripts. However, some functions are not designed for plugins, they are used inside Hikaru, you may not use them and use others.

# `escapeHTML(str)`

- `str`: `String`
- Return type: `String`

Escape `&`, `<`, `>` `"`, and `''` in `str`.

# `matchFiles(pattern, options)`

- `pattern`: `String`
- `options`: `Object`
- Return type: `Promise<List>`

A wrapper for [node-glob](https://github.com/isaacs/node-glob), match files and return a Promise, when it resolves, return an array of file path.

# `removeControlChars(str)`

- `str`: `String`
- Return type: `String`

Remove XML control chars in `str`.

# `transposeYAMLTime(datetime)`

- `datetime`: `Date` or `String`
- Return type: `String`

YAML ignores local timezone and parse time as UTC, this helper transpose it to a time without timezone info, so you can manage timezone your self.

# `parseFrontMatter(file)`

- `file`: `Hikaru::types.File`
- Return type: `Hikaru::types.File`

This helper receives a file object, and if it is a text file, it will parse the YAML front matter, copy some property to file, and transpose timezone and language. Then return the file.

# `getContentType(docPath)`

- `docPath`: `String`
- Return type: `String`

This is used by Hikaru's HTTP server. It will return value for `Content-Type` by comparing the extend name.

# `paginate(p, posts, perPage = 10, ctx)`

- `p`: `Hikaru::types.File`
- `posts`: `Hikaru::types.File[]`
- `perPage`: `Number`
- `ctx`: `Object`
- Return type: `Hikaru::types.File[]`

Generate pages for a page that displays posts, each page contains `perPage` posts. For example, index and archives.

It returns an array of paginated pages, and each element in this array will have two property: `pageArray` and `pageIndex`. `pageArray` is the returned array, so you can get other pages while rendering one page. `pageIndex` is just this element's index.

The original page `p` is `0`, other generated page will get a `docPath` like `{p's basename}-{index + 1}.html`. For example, if p's `docPath` is `archives/index.html`, following pages will be `archives/index-2.html`, `archives/index-3.html`, etc.

# `sortCategories(category)`

- `category`: `Hikaru::types.Category`
- Return type: `undefined`

Because each `Category` is recursive, if you want to sort posts with date sequence, you need to sort recursively. This helper do this.

# `paginateCategories(category, parentPath, perPage = 10, site)`

- `category`: `Hikaru::types.Category`
- `parentPath`: `String`
- `perPage`: `Number`
- `site`: `Hikaru::types.Site`
- Return type: `Hikaru::types.File[]`

`Category` and `Tag` page cannot be simply paginated with `paginate(p, posts, perPage = 10, ctx)`, because you need to create page for each categories and tags, and for categories, you need to do this recursively, this helper help you create recursive paths for categories.

Hikaru always starts `parentPath` with the option `categoryDir` in site config file.

# `getPathFn(rootDir = path.posix.sep)`

- `rootDir`: `String`
- Return type: `getPath(docPath = "")`

Your site maybe a sub directory, and when you convert sources to docs, you have to add dir prefix for links. This helper can receive a prefix and returns you a function that convert `docPath` to a full path for links. So you just pass `getPath` to templates and use it when you create a link. Recommended this instead handle href yourself.

**This helper always deal `docPath` as a relative path to `rootDir`, so if you want to handle some path relative to other path, please join them before pass it to this healper.**

# `getURLFn(baseURL, rootDir = path.posix.sep)`

- `baseURL`: `String`
- `rootDir`: `String`
- Return type: `getURL(docPath = "")`

Sometimes you need full URL instead a internal path, this help you make up a base URL and a path prefix. It calls `getPath()` to handle path internally.

# `isCurrentPathFn(rootDir = path.posix.sep, currentPath = "")`

- `rootDir`: `String`
- `currentPath`: `String`
- Return type: `isCurrentPath(testPath = "", strict = false)`

It's not easy to decide whether to path are the same, this helper is designed for this. For each page you want to use this, use `isCurrentPathFn` with this page's `docPath`, and pass the returned `isCurrentPath` function to template, when you want to compare a path to current path, just call `isCurrentPath` in template. Recommended this instead handle by yourself.

# `resolveHeaderIds($)`

- `$`: Cheerio Context
- Return type: `undefined`

This helper escapes header id characters and create link for them.

# `genToc($)`

- `$`: Cheerio Context
- Return type: `Hikaru::types.Toc`

This helper generator toc for page content.

# `resolveLink($, baseURL, rootDir, docPath)`

- `$`: Cheerio Context
- `baseURL`: `String`
- `rootDir`: `String`
- `docPath`: `String`
- Return type: `undefined`

This function converts all `href` attribute for `<a>` tags in content. If it's not a internal link, add `target="_blank"` for the tag. If it's an relative path, replace it to absolute path.

# `resolveImage($, rootDir, docPath)`

- `$`: Cheerio Context
- `rootDir`: `String`
- `docPath`: `String`
- Return type: `undefined`

This function converts all `src` attribute for `<img>` tags in content. If it's an relative path, replace it to absolute path.

# `highlight(str, options = {})`

- `str`: `String`
- `options`: `Object`
- Return type: `String`

Using highlight.js to highlight strings, you should pass `lang` from options.

# `getVersion()`

- Return type: `String`

Return Hikaru's version.
