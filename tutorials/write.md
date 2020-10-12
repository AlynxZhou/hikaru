Write Site
==========

Hikaru won't create pages and posts for you, however, they have a readable format and you can create them by yourself.

# Example file

A page usually is a Markdown file which has a YAML front matter and a Markdown content like this:

```markdown
---
title: Your page title
# Should in ISO 8601 date time format, local timezone will be used if timezone is omitted.
createdDate: 2018-08-08T09:27:00
# If you updated your content, you can use this key.
#updatedDate: 2019-01-01T19:07:00
layout: post
---
Text before more will become excerpt.

<!--more-->

# A Title

Content.

## Another Title

Content.
```

## Front matter

Front matter is written in YAML, which is in the head of file and between `---\n` and `\n---\n`. But more than 3 `-` and `\r\n` are also acceptable. It is used to present metadata of a page. By default Hikaru needs following 3 option:

### `title`

Your page's title, **NOT** URL, your page's URL depends on your page's filename.

### `createdDate`

Your page's writing date. Should in ISO 8601 date time format, local timezone will be used if timezone is omitted.

### `updatedDate`

Your page's modifying date. Should in ISO 8601 date time format, local timezone will be used if timezone is omitted.

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
