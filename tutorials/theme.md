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

This is theme's scripts. If you want to register some functions, write it here.

## `languages`

Put different language files in here, and you can use `__()` in template to load them. They must be YAML files.

## `srcs`

This dir stores assets. Assets will be rendered and written to `docDir`.

## `layouts`

This dir stores html templates.

# Layouts

Hikaru works with templates, it supports Nunjucks, and can support others by registering compilers.

**The base name of first level template files will be used as layouts**. So you must have files of following:

- `index`: Site index page.
- `archives`: Site archive page.
- `tags`: This page shows all tags of this site.
- `tag`: This pages shows **all posts that belongs to a specific tag**.
- `categories`: This page shows all categories of this site.
- `category`: This pages shows **all posts that belongs to a specific category**.
- `post`: A post.
- `page`: Fallback layout.

Templates in subdir won't be treat as layouts so you can use them as modules.

Some templating engines have a root dir that all include commands is relative to this path, typically Hikaru will set it to `layouts/` dir.

You can access the following context properties in template:

- `site`: Site object.
- `siteConfig`: Just `site["siteConfig"]`.
- `themeConfig`: Just `site["themeConfig"]`.
- `getVersion()`: Hikaru version.
- `getURL(docPath)`: Convert a path to a full URL.
- `getPath(docPath)`: Convert a path to a full path.
- `isCurrentHost(testURL)`： Whether test URL has the same host with current site.
- `isCurrentPath(testPath, strict = false)`: Whether test path is current path, if `strict` is `false`, it return `true` when current path is a sub dir of test path.
- `isNumber(o)`.
- `isString(o)`.
- `isArray(o)`.
- `isFunction(o)`.
- `isObject(o)`.
- `checkType(variable, name, ...types)`: Check whether the type of given `variable` is one of `types`, elements of `types` should be one of `"Number"`, `"String"`, `"Array"`, `"Function"`, `"Buffer"`, `"Object"` or `"null"`. Available since Hikaru v1.17.0.
- `decorated`: A `Date` object contains the time when this template is used to render a page.
- `formatDateTime(dt)`: If `Intl` is supported, format date and time with locale support, otherwise format date and time to `YYYY-MM-DD HH:mm:ss`. Available since Hikaru v1.20.0.
- `__()`: Language translator via [`util.format`](https://nodejs.org/api/util.html#util_util_format_format_args).
- `file`: Current file object, available since Hikaru v1.18.0.

You could directly access file properties via their names, but this is not reliable, because some user installed plugins may add the same property names to context via helpers. Since Hikaru v1.18.0, you could always access file object via `file` properties of the context, this is recommended.

For example, if you want to use the title of file, you could use `title` or `file.title`, `file.title` is recommended.

# Assets

Assets may be CSS or JavaScript files, Hikaru internally supports no CSS preprocessors but you can install some renderer plugins to support them.

Hikaru could generate line numbers for you, but you are suggested to generate line numbers in browser so it won't mess things like RSS or atom feed. You could do code highlighting in browser, Hikaru will generate elements like

```html
<figure data-raw="Raw code content" data-info="language-xxxx" data-lang="xxxx">
  <pre class="line-numbers">
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

so you can easily hightlight them with libraries like PrismJS or highlight.js.

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
    - glob that matches files included in file4
```

You can use globs to describe file dependencies since v1.11.0, it's only allowed in lists (the third level of this YAML).

Theme author should update this file for their `srcs/` and `layouts/` dir, however, you may not need this file, because some templating engines use runtime including so dependency does not matter. For example please check [how hikaru-themes-aria uses it](https://github.com/AlynxZhou/hikaru-theme-aria/blob/master/file-dependencies.yaml).

**WARNING**: Although Hikaru checks circular dependency since v1.11.0, theme authors should also check it to prevent unpredicted problems.

Theme authors can ignore this file totally, Hikaru will continue work without complaining.

Currently we cannot watch `site-config.yaml` and `theme-config.yaml`, if user modifies them, they should restart Hikaru.
