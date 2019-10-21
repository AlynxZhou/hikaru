Extend
======

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

Hikaru supports plugins and scripts, but not all part of Hikaru is designed for them. There are some parts that you can add your code.

# `Renderer`

`Renderer` is the first module called while building site. Each file will be rendered first, you can register new render function to it.

## `register(srcExt, docExt, fn)`

- `srcExt`: `String`
- `docExt`: `String`
- `fn`: `function (file)`
- Return type: `Hikaru::types.File`

`srcExt` and `docExt` are start with `.`. A file with `srcExt` extend name will be render and change to `docExt`. `Renderer` will call `fn` to render it, `file` is `Hikaru::types.File`. `fn` should return `Hikaru::types.File`.

# `Processor`

`Processor` is used to convert a file to a context that can be used by templates. In this time, you can change file content for different layout. Hikaru resolves links and image sources via it.

## `register(layout, fn)`

- `name`: `String`
- `fn`: `function (site)`
- Return type: `Hikaru::types.Site`

`name` should be a short description. `site` is just `Hikaru::types.Site`, `fn` should return it too.

# `Generator`

`Generator` is used to generated some files or data that has no source file. For example, tags, categories and sitemap.

## `register(type, fn)`

- `name`: `String`
- `fn`: `function (site)`
- Return type: `Hikaru::types.Site`

`name` should be a short description. `site` is just `Hikaru::types.Site`, `fn` should return it too.

Prev Page: [Utils](utils.md)

Next Page: [Theme](theme.md)

