Hikaru
======

A static site generator that generates routes based on directories naturally.
-----------------------------------------------------------------------------

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
- [X] Parser-based toc generating.
- [X] Parser-based path converting (relative to absolute).
- [X] Date operations in templates.
- [X] I18n support.
- [X] Local search JSON gengrating.
- [X] RSS feed generating.
- [X] Port theme ARIA.
- [X] Live reloading server.
- [X] Per-site plugins and scripts.

# Example Dir Structure

```plain
hikura-site/
    |- scripts/ # Custom scripts.
    |- srcs/ # Source dir for user files.
    |   |- images/
    |   |- posts/
    |   |- about/
    |   |   |- index.md
    |- docs/ # Source will be render to here.
    |   |- images/
    |   |   |- logo.png
    |   |- css/
    |   |   |- index.css
    |   |- js/
    |   |   |- index.js
    |   |- posts/
    |   |- index.html
    |   |- index-2.html # Page 2 of index.
    |   |- index-3.html # Page 3 of index.
    |   |- about/
    |   |   |- index.html
    |   |- tags/
    |   |   |- index.html # Layout is tags.
    |   |   |- tag-1/
    |   |   |   |- index.html # Automatically generated, layout is tag.
    |   |   |   |- index-2.html # Page 2 of tag-1.
    |- themes/
    |   |- aria/
    |   |   |- scripts/ # custom scripts
    |   |   |- srcs/ # this will be render to docs/
    |   |   |   |- css/
    |   |   |   |   |- index.css
    |   |   |   |- js/
    |   |   |   |   |- index.js
    |   |   |   |- images/
    |   |   |   |   |- logo.png
    |   |   |- layouts/
    |   |   |   |- index.njk
    |   |   |   |- tags.njk
    |   |   |   |- tag.njk
    |   |   |   |- page.njk # If no layout specific, fallback to this.
    |   |   |- languages/
    |   |   |   |- default.yaml
    |   |   |- theme-config.yaml # Example file.
    |   |   |- file-dependencies.yaml
    |   |   |- README.md
    |- package.json # Store site plugin list.
    |- site-config.yaml
    |- theme-config.yaml
```
