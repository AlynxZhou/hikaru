Site Config
===========

# Site info

## `title`

Your site title.

## `subtitle`

Your site subtitle.

## `description`

Your site description.

## `author`

Usually, this is your name or nickname.

## `email`

Your email.

## `language`

Your site's language, please refer to your theme for available options list. Hikaru does **NOT** support multi-lingual site. In fact only few people can write their site in different languages totally, most people do part of translation and makes their site a mess. It's more convenient to create two site with different languages, then you can arrange them by yourself. Multi-lingual site makes theme harder to write.

Hikaru contains **NO** timezone settings, it use your system timezone.

# Dir config

## `baseURL`

Your site's base URL, like `https://example.com`. **Don't add trailing `/` to URL.**

## `rootDir`

Your site's root dir, starts with `/` like UNIX path, and also end with a `/` to hint that it is a dir.

For example, if you want to put your site in `https://example.com/blog/`, you can set it to `/blog/`, or if you create different sites with different languages, you can set it to `/en/` or `/zh_CN/`. If you don't need to put your site into a subdir, just set it to `/`.

## `srcDir`

Your site's src dir, you can move `srcs/` to another name and change this.

## `docDir`

Your site's doc dir, you can move `docs/` to another name and change this.

## `themeDir`

Your site's theme, this is a sub dir relative to site dir, for example, you cloned `hikaru-theme-aria` to `themes/aria`, you need to set it to `themes/aria`.

## `indexDir`

A dir to place your site's index sub page generated automatically by Hikaru (No source path), relative to `docDir`, generally use a `.` if you want to put indices directly into `docDir`.

## `archiveDir`

A dir to place your site's archive sub page generated automatically by Hikaru (No source path), relative to `docDir`.

## `categoryDir`

A dir to place your site's category sub page generated automatically by Hikaru (No source path), relative to `docDir`.

## `tagDir`

A dir to place your site's tag sub page generated automatically by Hikaru (No source path), relative to `docDir`.

# Other options

## `perPage`

When paginating, how many posts in a single page. You can just set a number for all layout, or you can set it as an object to let different layout hold different number of posts.

```yaml
# One for all.
perPage: 10

# Differs from layouts.
perPage:
  index: 10
  archives: 15
  category: 15
  tag: 15
```

## `skipRender`

A list for files that won't be rendered, paths are relative to `srcDir`, for example:

```yaml
skipRender:
  - README.md
  - EXAMPLE.md
  - TOC.md
```

## `contentsResolving`

This controls how Hikaru handles your content. Generally you should not disable them, but if you have plugins to do them same things for you, you could disable them.

```yaml
contentsResolving:
  enable: true
  headingIDs:
    enable: true
    # Set to `""` to keep compatible with Hikaru v1.20.1 and older.
    safeChar: "-"
  toc:
    enable: true
  anchors:
    enable: true
  images:
    enable: true
  codeBlocks:
    enable: true
    lineNumbers: false
```

Before Hikaru v1.21.0, it simply removes unsupported chars in headings in order to make an IDs for headings. In Hikaru v1.21.0 this is changed to replace unsupported chars with `safeChar`, if you don't want to break existing URL hashes, you can set `safeChar: ""` to use the old behavior.

For different npm modules, you can set their options as their docs, and it will be passed when rendering.
