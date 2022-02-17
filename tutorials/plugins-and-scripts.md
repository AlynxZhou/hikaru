Plugins and Scripts
===================

For some users and developers, they may need some custom functions for their sites or themes, however we cannot add all those to Hikaru, so we support plugins and scripts for them.

# Scripts

For users or devs who just wants some small or theme-specific functions, they can create JavaScript files in site or theme's `scripts/` dir, a script is a Node module which exports a function with a parameter for a Hikaru object like this. Hikaru can load them before dealing with site files.

```javascript
module.exports = (hikaru) => {
  hikaru.logger.log("Loading custom script!")
}
```

You can access Hikaru's `renderer`, `compiler`, `processor`, `generator`, `decorator`, `logger`, `translator`, `watcher`, `types`, `utils`, `opts` and `site` object through the Hikaru object.

# Plugins

For users or devs who wants some independent functions to release, they can create plugins. Plugins are npm packages that starts with `hikaru-` in their name and installed in site's `node_modules` dir, Hikaru can load dependencies in site's `package.json` before dealing with site files.

They must export a main function like scripts, this will be the entry of a plugin when Hikaru is loading them.

You are supposed to hint the plugin type with words like `renderer`, `compiler`, `processor`, `generator`, `decorator`, `logger`, `translator`, `types`, `utils`.

## If You Add Custom Template in Plugins and Want to Use Include...

If you want to add custom template via `decorator`, please notice that most templating engines has a base dir, from which they look up templates in include statement. Typically this is set to theme's `layouts/` dir. And when you use `include` in your plugin's template, it will also try to load file in theme's `layouts/` dir, which is notwhat you want.

To load from your plugin dir, since Hikaru v1.12.0, you can pass custom ctx while registering a decorator. You can pass plugin's dir using it and join paths when calling include in template.

For example, you can write those in `index.js`:

``` javascript
const fs = require("fs/promises");
const path = require("path");

module.exports = async (hikaru) => {
  const {File} = hikaru.types;
  const filepath = path.join(__dirname, "a.njk");
  const content = await fs.readFile(filepath, "utf8");
  const fn = await hikaru.compiler.compile(filepath, content);
  // Here is important!
  hikaru.decorator.register("a", fn, {
    "dirname": __dirname, "pathSep": path.sep
  });
  hikaru.generator.register("a", (site) => {
    return new File({
      "docDir": site["siteConfig"]["docDir"],
      "docPath": "a.xml",
      "layout": "a"
    });
  });
};
```

and if you wants to include `b.njk` in `a.njk`, don't write `{% include "b.njk" %}`, instead use `{% include dirname + pathSep + "b.njk" %}`.


For more example, you can read the code of [hikaru-generator-feed](https://github.com/AlynxZhou/hikaru-generator-feed/).
