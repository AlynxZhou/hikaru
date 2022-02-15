Hikaru
======

A static site generator that generates routes based on directories naturally.
-----------------------------------------------------------------------------

[![npm-version](https://img.shields.io/npm/v/hikarujs?style=for-the-badge)](https://www.npmjs.com/package/hikarujs)
[![npm-downloads](https://img.shields.io/npm/dt/hikarujs?style=for-the-badge)](https://www.npmjs.com/package/hikarujs)
[![node-version](https://img.shields.io/node/v/hikarujs?style=for-the-badge)](https://www.npmjs.com/package/hikarujs)
[![github-license](https://img.shields.io/github/license/AlynxZhou/hikaru?style=for-the-badge)](https://github.com/AlynxZhou/hikaru/blob/master/LICENSE)

# Install

Hikaru is a command line program (not a module) and you can install it from NPM:

```
# npm i -g hikarujs
```

If you are an Arch Linux user, you can also install package `hikarujs` from [AUR](https://aur.archlinux.org/packages/hikarujs/).

**Hikaru works on Node.js v12.20.0 LTS or later.**

# Setup site

```
$ mkdir hikaru-site && cd hikaru-site
$ hikaru init && npm install
```

# Install theme

## Clone theme

Using `hikaru-theme-aria` as example:

```
$ git clone https://github.com/AlynxZhou/hikaru-theme-aria.git themes/aria
```

Or if you want commit the whole site you can use submodule:

```
$ git submodule add https://github.com/AlynxZhou/hikaru-theme-aria.git themes/aria
```

## Edit site config

```
$ $EDITOR site-config.yaml
```

Set `themeDir` to `themes/aria`

```yaml
themeDir: themes/aria
```

**Don't forget to copy your theme config to site's dir and edit it as its README file.**

# Create src file

## Edit file

```
$ $EDITOR srcs/my-first-post.md
```

## Add front matter

```yaml
---
title: My First Post
created: 2018-08-08T09:27:00
layout: post
---
```

## Add content

```markdown
Some content...

<!--more-->

# This is my first post!
```

# Start live server

```
$ hikaru serve
```

# Build static files

```
$ hikaru build
```

# Contribute

If you want to contribute, please follow my coding style.

Most things can be fixed by standardx and custom eslint rules, so please run `npm test` before commit, and use `npx standardx --fix bin/* hikaru/*.js tests/*.js` to fix most problems, and fix remaining problems that cannot pass tests manually.

I'll list personal flavors that cannot be handled by eslint here. If some things are not listed, follow existing code.

## Arrays, Objects or Sets, Maps

If we have some simple types and we want to exclude same elements, just use Set.

If we want a dictionary to store keys and values, and keys are not fixed, just use Map.

Otherwise, use Arrays and Objects, for example lists, queues or dictionaries that have fixed keys.

If we got parsed Objects, for example options from YAML files, don't convert them into Maps except we need to do other operations on them.

## `for...of`, `for...in`, `.forEach()`, `.map()`

If we are not only doing some operations to array elements but also caring about their return values, just use `.map()`.

If we just do some opeartions to array elements but not caring about return values, don't use `.map()`.

If we are iterating Objects, use `for...in`.

Otherwise, use `for...of`.

Never use `.forEach()` unless you cannot use `for...of`, they are almost the same and we learn `for` in the first coding lesson so why not `for`?

## `class` or `.prototype`

I just prefer `class`.

# More

Docs: <https://hikaru.alynx.one/>

Repo: [GitHub](https://github.com/AlynxZhou/hikaru/)

Default theme ARIA: [hikaru-theme-aria](https://github.com/AlynxZhou/hikaru-theme-aria/)

My blog built with Hikaru and ARIA: [喵's StackHarbor](https://sh.alynx.one/)

# License

[Apache-2.0](LICENSE)

# For Stylus and nib

Since Hikaru v1.2.11, nib was dropped because [its the only dependency has NodeJS 14 warnings](https://github.com/stylus/nib/issues/347), and many nib features can be done in newer CSS. So it was splitted into a single plugin.

Since Hikaru v1.10.0, Stylus was also dropped, now Hikaru does not contain any CSS preprocessors.

If you need Stylus and nib for your theme, please install [hikaru-renderer-stylus-nib](https://github.com/AlynxZhou/hikaru-renderer-stylus-nib/) to your site.

