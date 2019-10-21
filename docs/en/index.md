Hikaru
======

A static site generator that generates routes based on directories naturally.
-----------------------------------------------------------------------------

# TOC

- For Users
    - [Install](user/install.md)
    - [Init](user/init.md)
    - [Config](user/config.md)
    - [Write](user/write.md)
    - [Command](user/command.md)
    - [Deploy](user/deploy.md)
    - [Plugins and Scripts](user/plugins-and-scripts.md)
- For Developers
    - [Lifecycle](dev/lifecycle.md)
    - [Hikaru](dev/hikaru.md)
    - [Types](dev/types.md)
    - [Utils](dev/utils.md)
    - [Extend](dev/extend.md)
    - [Theme](dev/theme.md)

# What is Hikaru?

As the subtitle, it's a static site generator, based on Markdown, CSS preprocessor and HTML template, to generate routes based on you directories.

# Why Hikaru?

- "This world won't need one more static site generator!"

- "But I need."

# Feature list

- [X] Dir based router.
- [X] Marked Markdown renderer.
- [X] Stylus CSS renderer.
- [X] Nunjucks template renderer.
- [X] Highlight.js code highlight.
- [X] Async loading, rendering and saving file.
- [X] Pagination for index, archives, categories (different category pages) and tags (different tag pages).
- [X] Archives info for templating.
- [X] Categories info for templating.
- [X] Tags info for templating.
- [X] Cheerio-based toc generating.
- [X] Cheerio-based path converting (relative to absolute).
- [X] Date operations in templates.
- [X] sprintf-js based multi-languages support.
- [X] Local search JSON gengrating.
- [X] RSS feed generating.
- [X] Port theme ARIA.
- [X] Live reloading server.
- [X] Per-site plugins and scripts.

# Example Dir Structure

```plain
hikura-site/
    |- scripts/ # custom scripts
    |- srcs/ # source dir for user files
    |   |- images/
    |   |- posts/
    |   |- about/
    |   |   |- index.md
    |- docs/ # source will be render to here
    |   |- images/
    |   |   |- logo.png
    |   |- css/
    |   |   |- index.css
    |   |- js/
    |   |   |- index.js
    |   |- posts/
    |   |- index.html
    |   |- index-2.html # page 2 of index
    |   |- index-3.html # page 3 of index
    |   |- about/
    |   |   |- index.html
    |   |- tags/
    |   |   |- index.html # layout: tags
    |   |   |- tag-1/
    |   |   |   |- index.html # automatically generated, layout: tag
    |   |   |   |- index-2.html # page 2 of tag-1
    |- themes/
    |   |- aria/
    |   |   |- scripts/ # custom scripts
    |   |   |- srcs/ # this will be render to docs/
    |   |   |   |- layout.njk # templates
    |   |   |   |- index.njk
    |   |   |   |- tags.njk
    |   |   |   |- tag.njk
    |   |   |   |- page.njk # if no layout specific, fallback to this
    |   |   |   |- css/
    |   |   |   |   |- index.styl
    |   |   |   |- js/
    |   |   |   |   |- index.js
    |   |   |   |- images/
    |   |   |   |   |- logo.png
    |   |- README.md
    |- package.json # store site plugin list
    |- siteConfig.yml
    |- themeConfig.yml
```

