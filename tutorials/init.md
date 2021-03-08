Init Site
=========

# Init site

After installing Hikaru, you can use following command to setup a site directory:

```
$ hikaru init hikaru-site
$ cd hikaru-site
```

The directory looks like:

```plain
hikura-site/
    |- srcs/
    |- docs/
    |- themes/
    |- site-config.yaml
    |- package.json
```

# Install plugins

Just run one command.

```
$ npm install
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

## Edit site config

```
$ $EDITOR site-config.yaml
```

Set `themeDir` to `themes/aria`

```yaml
themeDir: themes/aria
```

**Don't forget to copy your theme config to site's dir and edit it as its README file.**

# File info

## `site-config.yaml`

This contains most site config.

## `srcs/`

This contains your site's source files.

## `docs/`

Your source files will be built to this directory.

## `themes/`

This contains your site's themes.

**Most of those dirs can be changed in `site-config.yaml`.**
