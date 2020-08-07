Extend
======

Hikaru supports plugins and scripts, but not all part of Hikaru is designed for them. There are some parts that you can add your code. Please read API reference for detailed parameter type.

# `Compiler`

`Compiler` is used to compile template, you can register different template engine here.

## `register(ext, fn)`

`ext` starts with `.`, `fn` with the same `ext` will be replaced, so you can replace internal compilers.

# `Renderer`

Each file will be rendered first, and return a rendered file with a new extname, you can register new render function to it.

## `register(srcExt, docExt, fn)`

`srcExt` and `docExt` are start with `.`. A file with `srcExt` extend name will be render and change to `docExt`. `Renderer` will call `fn` to render it, `file` is `Hikaru::types.File`. `fn` should return `Hikaru::types.File`.

`fn` with the same `srcExt` and `docExt` will be replaced, so you can replace internal renderers.

# `Processor`

`Processor` is used to modify contents in `site`. Hikaru resolves links and image sources via it. It is also used for building sequence for posts, generating data structures for categories and tags.

## `register(name, fn)`

`name` should be a short description. `fn` will be run in registration sequence, so you may need to update post sequence if you remove some posts, because it is a internal processor and will run before yours.

# `Generator`

`Generator` is used to generated some files or data that has no source file. For example, tags, categories and sitemap.

## `register(name, fn)`

`name` should be a short description. You can return one file or an Array of files. `fn` will be run in registration sequence.
