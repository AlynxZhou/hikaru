Init Site
=========

# Init site

After installing Hikaru, you can use following command to setup a site directory:

```
$ npx hikaru init --debug
```

The directory looks like:

```plain
hikura-site/
    |- srcs/
    |- docs/
    |- themes/
    |- node_modules/
    |- package.json
    |- site-config.yaml
    |- theme-config.yaml
```

# Install plugins

If you forget to install plugins together with Hikaru, you can also install them with NPM:

```
$ npm install --save hikaru-generator-feed hikaru-generator-sitemap hikaru-generator-search
```

# Install theme

Before rendering, you need a theme as a template.

## Clone theme

Using `hikaru-theme-aria` as example:

```
$ git clone https://github.com/AlynxZhou/hikaru-theme-aria.git themes/aria
```

Or if you want commit the whole site you can use submodule:

```
$ git submodule add https://github.com/AlynxZhou/hikaru-theme-aria.git themes/aria
```

## Edit config

```
$ $EDITOR site-config.yaml
```

Set `themeDir` to `themes/aria`

```yaml
themeDir: themes/aria
```

Copy theme config to site dir and edit it:

```
$ cp themes/aria/theme-config.yaml theme-config.yaml
$ $EDITOR site-config.yaml
```

# File info

## `site-config.yaml`

This contains most site config.

## `theme-config.yaml`

This contains most theme config.

## `srcs/`

This contains your site's source files.

## `docs/`

Output files will be built to this directory.

## `themes/`

This contains your site's themes.

**Most of those dirs can be changed in `site-config.yaml`.**
