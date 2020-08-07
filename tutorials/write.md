Write Site
==========

Hikaru won't create pages and posts for you, however, they have a readable format and you can create them by yourself.

# Example file

A page usually is a Markdown file which has a YAML front matter and a Markdown content like this:

```markdown
---
title: Your page title
createdDate: 2018-08-08 09:27:00
#updatedDate: 2019-01-01 19:07:00	# If you updated your content, you can use this key.
layout: post
#zone: Asia/Tokyo   # If `createdDate`'s timezone is not the same as your local zone, set here.
---
Text before more will become excerpt.

<!--more-->

# Here are some contents.

## Here are some contents.
```

## Front matter

Front matter is written in YAML, which is in the head of file and between `---\n` and `\n---\n`. It is used to save metadata of a page. By default Hikaru needs following 3 option:

### `title`

Your page's title, **NOT** URL, your page's URL depends on your page's filename.

### `createdDate`

Your page's writing date, you can set it as `YYYY-MM-DD HH:mm:ss` format.

### `updatedDate`

Your page's modifying date, you can set it as `YYYY-MM-DD HH:mm:ss` format.

### `draft`

If you've not finished your post, you can set `draft: true`, so it will only visible when using `hikaru serve` but not `hikaru build`.

### `layout`

Your page's layout, which depends on which template of your theme will be used to render your page. Typically you need following layout pages:

#### `index`

This usually is a page that theme will put all posts with its excerpt inside.

#### `archives`

This usually is a page that theme will put all posts without its excerpt inside.

#### `categories`

This usually is a page that theme will create a nested list of all categories.

#### `tags`

This usually is a page that theme will create a tag cloud of all tags.
