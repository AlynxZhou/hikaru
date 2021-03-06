Types
=====

This page contains types that Hikaru uses. Most of them are just class for plain object.

# `File`

`File` contains all properties that a file will have. Not all properties are available on all files.

## `docDir`

Where to output the file, it should be the site's `docDir`.

## `docPath`

Output file's path relative to `docDir`, which was determined by `Renderer`.

## `srcDir`

Where the file was read, it should be the site's `srcDir` or `themeSrcDir`.

## `srcPath`

Input file's path relative to `srcDir`.

## `created`

File's created time from its front matter. Only available for posts and pages. You can also access this with name `createdDate`.

## `updated`

File's updated time from its front matter. Only available for posts and pages. You can also access this with name `updatedDate`.

## `title`

File's title from its front matter. Only available for posts and pages.

## `layout`

File's layout from its front matter. Only available for posts and pages.

## `draft`

Whether post is a draft, draft will be skipped while building, but not skipped while serving.

## `categories`

Post's categories from its front matter, it will be generated into `Category` array before processing. Only available for posts.

## `tags`

Post's tags from its front matter, it will be generated into `Tags` array before processing. Only available for posts.

## `raw`

File's raw content.

## `text`

File's text content.

- For pages and posts, it is **the content after YAML front matter**.
- For text assets and templates, it is just raw content.
- For binary assets it has no meaning.

## `content`

For posts, pages and text assets, it's the **rendered text**.

## `type`

Whether file is a `asset`, `post`, `page`, `template` or `file`.

## `frontMatter`

The original parsed YAML front matter object. Only available for posts and pages.

## `excerpt`

Typically content before `<!--more-->` tag in post.

## `more`

Typically content after `<!--more-->` tag in post.

## `toc`

Toc for page content.

## `posts`

Attached posts for page.

## `pageArray`

The series of pages generated by `paginate` util function from a single page. Only available for pages.

## `pageIndex`

The index in the series of pages generated by `paginate` util function from a single page. **Begin from 0**. Only available for pages.

## `next`

Next post reference in date sequence. Only available for posts.

## `prev`

Previous post reference in date sequence. Only available for posts.

# `Category`

`Category` is a recursive data structure typecially because a category may have sub categories.

## `name`

Category's name to display.

## `posts`

All posts belong to this category.

## `subs`

An array of `Category`, which contains sub categories.

# `Tag`

`Tag` looks like `Category`, however it's not recursive.

## `name`

Tag's name to display.

## `posts`

All posts belong to this Tag.

# `Toc`

`Toc` is a recursive data structure typecially because a header may have sub haeders.

## `text`

Header's text to display.

## `name`

Header's tag name.

## `anchor`

HTML anchor for this header.

## `subs`

An array of `Toc`, which contains sub header.

# `Site`

Site's properties and methods.

## `siteDir`

In which directory Hikaru works.

## `siteConfig`

From site's `site-config.yaml` file but `srcDir`, `docDir`, `themeDir`, `themeSrcDir` are converted to full path relative to `siteDir` for easier to use.

## `themeConfig`

From theme's `theme-config.yaml` file.

## `assets`

Array of asset `File`s.

## `pages`

Array of page `File`s.

## `posts`

Array of post `File`s.

## `files`

Array of other site file `File`s.

## `categories`

Array of `Category`s, which contains all categories of site's posts. It is recursive, the top array only contains top-level categories and other's are in their `subs` array.

## `categoriesLength`

Because `Category` is recursive, `Site::categories.length` is only the number of top-level categories, this is **the number of all categories of site's posts**.

## `tags`

Array of `Tag`s, which contains all tags of site's posts.

## `tagsLength`

This is **the number of all tags of site's posts**, though `Tag` is not recursive.
