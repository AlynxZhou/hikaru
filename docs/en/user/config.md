Site Config
===========

# TOC

- For Users
    - [Install](../user/install.md)
    - [Init](../user/init.md)
    - [Config](../user/config.md)
    - [Write](../user/write.md)
    - [Command](../user/command.md)
    - [Deploy](../user/deploy.md)
    - [Plugins and Scripts](../user/plugins-and-scripts.md)
- For Developers
    - [Lifecycle](../dev/lifecycle.md)
    - [Hikaru](../dev/hikaru.md)
    - [Types](../dev/types.md)
    - [Utils](../dev/utils.md)
    - [Extend](../dev/extend.md)
    - [Theme](../dev/theme.md)

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

A dir to place your site's index sub page generated automatically by Hikaru (No source path), relative to `docDir`.

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

A list for files that won't be rendered, for example:

```yaml
skipRender:
  - README.md
  - EXAMPLE.md
  - TOC.md
```

For different npm modules, you can set their options as their docs, and it will be passed when rendering.

Prev Page: [Install](install.md)

Next Page: [Write](write.md)
