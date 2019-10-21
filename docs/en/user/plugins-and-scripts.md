Plugins and Scripts
===================

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

For some users and developers, they may need some custom functions for their sites or themes, however we cannot add all those to Hikaru, so we support plugins and scripts for them.

# Scripts

For users or devs who just wants some small or theme-specific functions, they can create JavaScript files in site or theme's `scripts/` dir, a script is a Node module which exports a function with a parameter for a Hikaru object like this. Hikaru can load them before dealing with site files.

```javascript
module.exports = (hikaru) => {
  hikaru.logger.log("Loading custom script!")
}
```

You can access Hikaru's `renderer`, `generator`, `processor`, `logger`, `translator`, `types`, `utils` and `site` object through the Hikaru object.

# Plugins

For users or devs who wants some independent functions to release, they can create plugins. Plugins are npm packages that starts with `hikaru-` in their name, Hikaru can load them before dealing with site files.

They must export a main function like scripts, this will be the entry of a plugin when Hikaru is loading them.

You are supposed to hint the plugin type with words like `renderer`, `generator`, `processor` or `utils`.

For more example, you can read the code of [hikaru-renderer-coffeescript](https://github.com/AlynxZhou/hikaru-renderer-coffeescript/), [hikaru-generator-feed](https://github.com/AlynxZhou/hikaru-generator-feed/).

Prev Page: [Deploy](deploy.md)
