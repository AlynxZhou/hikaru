Hikaru
======

[![npm-version](https://img.shields.io/npm/v/hikarujs?style=for-the-badge)](https://www.npmjs.com/package/hikarujs)
[![npm-downloads](https://img.shields.io/npm/dt/hikarujs?style=for-the-badge)](https://www.npmjs.com/package/hikarujs)
[![node-version](https://img.shields.io/node/v/hikarujs?style=for-the-badge)](https://www.npmjs.com/package/hikarujs)
[![github-license](https://img.shields.io/github/license/AlynxZhou/hikaru?style=for-the-badge)](https://github.com/AlynxZhou/hikaru/blob/master/LICENSE)

A static site generator that generates routes based on directories naturally.
-----------------------------------------------------------------------------

# Install

Hikaru is a command line program (not a module) and you can install it from NPM:

```
# npm i -g hikarujs
```

If you are an Arch Linux user, you can also install package `hikarujs` from [AUR](https://aur.archlinux.org/packages/hikarujs/).

**Hikaru works on Node.js v8.9.0 LTS or later.**

# Setup site

```
$ hikaru i hikaru-site
$ cd hikaru-site
$ npm install
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
$ $EDITOR siteConfig.yml
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
createdDate: 2018-08-08 09:27:00
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
$ hikaru s
```

# Build static files

```
$ hikaru b
```

# More

Docs: <https://hikaru.alynx.moe/>

Repo: [GitHub](https://github.com/AlynxZhou/hikaru/)

Default theme ARIA: [hikaru-theme-aria](https://github.com/AlynxZhou/hikaru-theme-aria/)

My blog built with Hikaru and ARIA: [喵's StackHarbor](https://sh.alynx.moe/)

# License

[Apache-2.0](LICENSE)
