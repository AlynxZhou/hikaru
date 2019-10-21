Theme
=====

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

This page tells you how to create a Hikaru theme.

For code examples, visit [hikaru-themes-aria](https://github.com/AlynxZhou/hikaru-theme-aria/).

# Structure

A dir of Hikaru theme looks like this:

```plain
themename/
    |- scripts/
    |- srcs/
    |- languages/
    |- themeConfig.yml
```

## `themeConfig.yml`

This is theme's config, you can access it with `site["themeConfig"]` in template.

## `scripts`

This is theme's scripts. If you want to regist some functions, write it here.

## `languages`

Put different language files in here, and you can use `__()` in template to load them. They must be YAML files.

## `srcs`

This dir stores templates and assets. If a file is under srcs directly, it will be treat as templates and if a file is in sub dir, they are assets and will be copied to `docDir`.

# Template

Hikaru works with template, it supports Nunjucks, and can support others by registing renderers.

**The base name of template files will be used as layouts**. So you must have files of following:

- `index`: Site index page.
- `archives`: Site archive page.
- `tags`: This page shows all tags of this site.
- `tag`: This pages shows **all posts that has a tag**.
- `categories`: This page shows all categories of this site.
- `category`: This pages shows **all posts that has a category**.
- `post`: A post.
- `page`: Fallback layout.

You can use following helpers in template:

- `site`: A raw site object.
- `siteConfig`: Just `site["siteConfig"]`.
- `themeConfig`: Just `site["themeConfig"]`.
- `moment()`: Moment.js functions.
- `getVersion()`: Hikaru version.
- `getURL(docPath)`: Convert a path to a full URL.
- `getPath(docPath)`: Convert a path to a full path.
- `isCurrentPath(testPath, strict)`: Whether test path is current path, if `strict` is `false`, it return `true` when current path is a sub dir of test path.
- `__()`: Language translator via [`util.format`](https://nodejs.org/api/util.html#util_util_format_format_args).

# Assets

Assets may be CSS or JavaScript files, Hikaru internally supports stylus, so you can write it instead pure CSS. You can also add other preprocessors via registing renderers.

You can use `getThemeConfig(key)` or `getSiteConfig(key)` in CSS preprocessors to get config.

# Language Files

You can create file as language files, and their name will be options of site's `language` config. For example you can create `en.yml`:

```yaml
postcount:
  none: You have no post, write now!
  one: You have %d post, keep on!
  more: You have %d posts!
```

and set `config.yml` to `language: en`, you can use `__()` in template like this:

```html
<p>{{ __("postcount.more", 233)}}</p>
```

**Each page can have their own language property**, `Translator` will load language automatically.

# Scripts

Scripts are just JavaScript files that export a function, which receives a `Hikaru` object as argument:

```javascript
module.exports = (hikaru) => {
  hikaru.processor.register("description", (site) => {
    // Do something...
    return site
  })
}
```

Plugins are the same but they work as npm packages.

Prev Page: [Extend](extend.md)

