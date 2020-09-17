Theme
=====

This page tells you how to create a Hikaru theme.

For code examples, visit [hikaru-themes-aria](https://github.com/AlynxZhou/hikaru-theme-aria/).

# Structure

A dir of Hikaru theme looks like this:

```plain
themename/
    |- scripts/
    |- srcs/
    |- languages/
    |- layouts/
    |- themeConfig.yml
```

## `themeConfig.yml`

This is theme's config, you can access it with `site["themeConfig"]` in template.

## `scripts`

This is theme's scripts. If you want to regist some functions, write it here.

## `languages`

Put different language files in here, and you can use `__()` in template to load them. They must be YAML files.

## `srcs`

This dir stores assets. Assets will be rendered and written to `docDir`.

## `layouts`

This dir stores html templates.

# Layouts

Hikaru works with templates, it supports Nunjucks, and can support others by registing compilers.

**The base name of first level template files will be used as layouts**. So you must have files of following:

Templates in subdir won't be treat as layouts so you can use them as modules.

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
- `getVersion()`: Hikaru version.
- `getURL(docPath)`: Convert a path to a full URL.
- `getPath(docPath)`: Convert a path to a full path.
- `isCurrentPath(testPath, strict)`: Whether test path is current path, if `strict` is `false`, it return `true` when current path is a sub dir of test path.
- `decorateDate`: A Date object contains the time when this template is used to render a page.
- `__()`: Language translator via [`util.format`](https://nodejs.org/api/util.html#util_util_format_format_args).

# Assets

Assets may be CSS or JavaScript files, Hikaru internally supports stylus, so you can write it instead pure CSS. You can also add other preprocessors via registing renderers.

You can use `getThemeConfig(key)` or `getSiteConfig(key)` in CSS preprocessors to get config. Use `getPath(docPath)` or `getURL(docPath)` if you want to get generated path or URL. You can also get file's `docPath`, `docDir`, `srcPath` and `srcDir`.

If you want to use Hikaru's builtin highlight processor, you need to add highlight.js theme CSS to your theme assets. But you can also tell user to disable builtin highlight processor and use a browser-side highlight library. Hikaru will generate elements like

```html
<figure data-raw="Raw code content" data-info="language-xxxx" data-lang="xxxx">
  <pre class="gutter">
    <span class="line-number">1</span>
  </pre>
  <pre class="code">
    <code class="language-xxxx">
      Raw code content
    </code>
  </pre>
</figure>
```

from Markdown code blocks like

~~~markdown
```xxxx
Raw code content
```
~~~

so you can easily theme them and also works with libraries like PrismJS.

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
<p>{{ __("postcount.more", 233) }}</p>
```

**Each page can have their own language property**, `Translator` will load language automatically.

# Scripts

Scripts are just JavaScript files that export a function, which receives a `Hikaru` object as argument:

```javascript
module.exports = (hikaru) => {
  hikaru.processor.register("description", (site) => {
    // Do something...
  })
}
```

Plugins are the same but they work as npm packages.
