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
    |- theme-config.yaml
    |- file-dependencies.yaml
```

## `theme-config.yaml`

This is a example of theme's config, user should copy it to site dir and you can access it with `site["themeConfig"]` in template.

## `file-dependencies.yaml`

This is a file that contains file dependency relationship, Hikaru uses this file to know how many file should be updated if files changed while watching. Also check *File Dependencies Handling* for more info.

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

Some templating engines have a root dir that all include commands is relative to this path, typically Hikaru will set it to `layouts/` dir.

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

Assets may be CSS or JavaScript files, Hikaru internally supports no CSS preprocessors but you can install some renderer plugins to support them.

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

You can create file as language files, and their name will be options of site's `language` config. For example you can create `en.yaml`:

```yaml
postcount:
  none: You have no post, write now!
  one: You have %d post, keep on!
  more: You have %d posts!
```

and set `site-config.yaml` to `language: en`, you can use `__()` in template like this:

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

# File Dependencies Handling

Many static site generators say they have a "watch" feature, which means your SSG watch files and re-generate site automatically while serving.

This helps a lot for theme authors because you can reload webpage to see your latest changes, however, most SSGs only watch blog articles but not theme files, and for those SSGs who "support" watching themes, they never work reliably. Because theme files may have dependency problem while blog articles does not. Your HTML templates and CSS preprocessors support feature like `import`, `include` or `extends`, a file should be updated if its included files changed, but SSGs cannot analyze every kinds of templating language to know exactly how many files should be updated.

Since Hikaru v1.10.0, it has another way to resolve this dependency problem. Theme authors can provide a `file-dependencies.yaml` under your theme's root dir, Hikaru will parse it, and when files get modified, Hikaru will use this file to update related files.

Its content looks like:

```yaml
# Path relative to your theme's root dir.
dir1:
  # Path relative to dir1.
  file1:
    # Path relative to dir1.
    - file2 included in file1
    - file3 included in file1
# Path relative to your theme's root dir.
dir2:
  # Path relative to dir2.
  file4:
    # Path relative to dir2.
    - file5 included in file4
```

Theme author should update this file for their `srcs/` and `layouts/` dir, for example please check [how hikaru-themes-aria uses it](https://github.com/AlynxZhou/hikaru-theme-aria/blob/master/file-dependencies.yaml).

**WARNING**: Hikaru does not check for circular dependency, theme authors should check their files to prevent circular dependency.

Theme authors can ignore this file totally, Hikaru will continue work without complaining.

Currently we cannot watch `site-config.yaml` and `theme-config.yaml`, if user modifies them, they should restart Hikaru. `file-dependencies.yaml` is also not able to watch.
