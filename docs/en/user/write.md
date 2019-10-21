Write Site
==========

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

Hikaru won't create pages and posts for you, however, they have a readable format and you can create them by yourself.

# Example file

A page usually is a Markdown file which has a YAML front matter and a Markdown content like this:

```markdown
---
title: Your page title
createdTime: 2018-08-08 09:27:00        # key `date` also works but `createdTime` is recommended now
#updatedTime: 2019-01-01 19:07:00   # Typically you can ignore this because Hikaru will read modified time from your filesystem.
layout: post
#zone: Asia/Tokyo   # If `createdTime`'s timezone is not the same as your local zone, set here.
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

### `date`

Your page's writing date, you can set it as `YYYY-MM-DD HH:mm:ss` format.

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

Prev Page: [Config](config.md)

Next Page: [Command](command.md)
