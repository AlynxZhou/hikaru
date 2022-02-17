"use strict";

/**
 * @module hikaru
 */

const path = require("path");

const fse = require("fs-extra");
const YAML = require("yaml");
const nunjucks = require("nunjucks");
const {marked} = require("marked");

const Logger = require("./logger");
const Watcher = require("./watcher");
const Renderer = require("./renderer");
const Compiler = require("./compiler");
const Processor = require("./processor");
const Generator = require("./generator");
const Decorator = require("./decorator");
const Translator = require("./translator");
const Router = require("./router");
const types = require("./types");
const {Site, File} = types;
const utils = require("./utils");
const {
  isObject,
  matchFiles,
  paginate,
  sortCategories,
  paginateCategories,
  genCategories,
  genTags,
  parseNode,
  serializeNode,
  resolveHeaderIDs,
  resolveAnchors,
  resolveImages,
  resolveCodeBlocks,
  genTOC
} = utils;

/**
 * @description Hikaru main class.
 */
class Hikaru {
  /**
   * @param {Object} [opts]
   * @param {Boolean} [opts.debug=false] Enable debug output for logger.
   * @param {Boolean} [opts.color=true] Enable colored output for logger.
   * @param {Boolean} [opts.draft] Build drafts.
   * @param {String} [opts.siteConfig] Alternative site config path.
   * @param {String} [opts.themeConfig] Alternative theme config path.
   * @param {String} [opts.ip=localhost] Alternative listening IP address
   * for router.
   * @param {Number} [opts.port=2333] Alternative listening port for router.
   * @property {Logger} logger
   * @property {Watcher} watcher
   * @property {Router} router
   * @property {Renderer} renderer
   * @property {Processor} processor
   * @property {Generator} generator
   * @property {Decorator} decorator
   * @property {Translator} translator
   * @property {Object} types
   * @property {Object} utils
   * @property {Object} opts
   * @property {Site} site
   * @return {Hikaru}
   */
  constructor(opts = {}) {
    this.opts = opts;
    this.logger = new Logger(this.opts);
    this.logger.debug("Hikaru is starting...");
    this.watcher = null;
    this.types = types;
    this.utils = utils;
    // Catch all unhandled error in promises.
    process.on("unhandledRejection", (error) => {
      this.logger.warn("Hikaru catched some error during running!");
      this.logger.error(error);
    });
    const exit = () => {
      if (this.watcher != null) {
        this.watcher.close();
      }
      if (this.router != null) {
        this.router.close();
      }
      process.exit(0);
    };
    process.on("SIGINT", exit);
    process.on("SIGTERM", exit);
    process.on("exit", () => {
      this.logger.debug("Hikaru is stopping...");
    });
    if (this.opts["siteConfig"] == null && this.opts["config"] != null) {
      this.opts["siteConfig"] = this.opts["config"];
      this.logger.warn(`Hikaru suggests you to use \`${
        this.logger.cyan("--site-config")
      }\` instead of \`${
        this.logger.cyan("--config")
      }\` because it's deprecated!`);
    }
  }

  /**
   * @description Create a Hikaru site dir with needed files.
   * @param {String} siteDir Working site dir.
   */
  init(siteDir) {
    const siteConfigPath = this.opts["siteConfig"] || path.join(
      siteDir, "site-config.yaml"
    );
    return fse.mkdirp(siteDir).then(() => {
      this.logger.debug(`Hikaru is copying \`${
        this.logger.cyan(siteConfigPath)
      }\`...`);
      this.logger.debug(`Hikaru is copying \`${
        this.logger.cyan(path.join(siteDir, "package.json"))
      }\`...`);
      this.logger.debug(`Hikaru is creating \`${
        this.logger.cyan(path.join(siteDir, "srcs", path.sep))
      }\`...`);
      this.logger.debug(`Hikaru is creating \`${
        this.logger.cyan(path.join(siteDir, "docs", path.sep))
      }\`...`);
      this.logger.debug(`Hikaru is creating \`${
        this.logger.cyan(path.join(siteDir, "themes", path.sep))
      }\`...`);
      this.logger.debug(`Hikaru is creating \`${
        this.logger.cyan(path.join(siteDir, "scripts", path.sep))
      }\`...`);
      fse.copy(
        path.join(__dirname, "..", "dists", "site-config.yaml"),
        siteConfigPath
      );
      fse.readFile(
        path.join(__dirname, "..", "dists", "package.json")
      ).then((text) => {
        const json = JSON.parse(text);
        // Set package name to site dir name.
        json["name"] = path.relative(path.join("..", siteDir), siteDir);
        return fse.outputFile(
          path.join(siteDir, "package.json"),
          JSON.stringify(json, null, "  ")
        );
      });
      fse.mkdirp(path.join(siteDir, "srcs"));
      fse.mkdirp(path.join(siteDir, "docs"));
      fse.mkdirp(path.join(siteDir, "themes"));
      fse.mkdirp(path.join(siteDir, "scripts"));
    }).catch((error) => {
      this.logger.warn("Hikaru catched some error during initializing!");
      this.logger.error(error);
    });
  }

  /**
   * @description Clean a Hikaru site's built docs.
   * @param {String} siteDir Working site dir.
   */
  clean(siteDir) {
    const siteConfig = this.loadSiteConfig(siteDir, this.opts["siteConfig"]);
    if (siteConfig == null) {
      return;
    }
    this.logger.debug(`Hikaru is cleaning \`${
      this.logger.cyan(path.join(siteConfig["docDir"], path.sep))
    }\`...`);
    fse.emptyDir(siteConfig["docDir"]).catch((error) => {
      this.logger.warn("Hikaru catched some error during cleaning!");
      this.logger.error(error);
    });
  }

  /**
   * @description Build and write docs from srcs.
   * @param {String} siteDir Working site dir.
   */
  async build(siteDir) {
    this.loadSite(siteDir);
    try {
      // Modules must be loaded before others.
      this.loadModules();
      await Promise.all([this.loadPlugins(), this.loadScripts()]);
      await Promise.all([this.loadLanguages(), this.loadLayouts()]);
      this.router = new Router(
        this.logger,
        this.renderer,
        this.processor,
        this.generator,
        this.decorator,
        this.translator,
        this.site
      );
      await this.router.build();
    } catch (error) {
      this.logger.warn("Hikaru catched some error during building!");
      this.logger.error(error);
      this.logger.warn("Hikaru suggests you to check built files!");
    }
  }

  /**
   * @description Build and serve docs with a HTTP server from srcs.
   * @param {String} siteDir Working site dir.
   */
  async serve(siteDir) {
    const ip = this.opts["ip"] || "localhost";
    const port = this.opts["port"] || 2333;
    this.loadSite(siteDir);
    const rawFileDependencies = await this.loadFileDependencies();
    this.watcher = new Watcher(this.logger, rawFileDependencies);
    // This watcher only watch one file so don't care about arguments.
    const reloadFileDependencies = async () => {
      const rawFileDependencies = await this.loadFileDependencies();
      this.watcher.updateFileDependencies(rawFileDependencies);
    };
    this.watcher.register(
      this.site["siteConfig"]["themeDir"],
      reloadFileDependencies,
      {"customGlob": "file-dependencies.yaml"}
    );
    try {
      // Modules must be loaded before others.
      this.loadModules();
      await Promise.all([this.loadPlugins(), this.loadScripts()]);
      await Promise.all([this.loadLanguages(), this.loadLayouts()]);
      this.router = new Router(
        this.logger,
        this.renderer,
        this.processor,
        this.generator,
        this.decorator,
        this.translator,
        this.site,
        this.watcher
      );
      await this.router.serve(ip, port);
    } catch (error) {
      this.logger.warn("Hikaru catched some error during serving!");
      this.logger.error(error);
    }
  }

  /**
   * @private
   * @description Load site config.
   * @param {String} siteDir Working site dir.
   * @param {String} [siteConfigPath] Alternative site config path.
   * @return {Object}
   */
  loadSiteConfig(siteDir, siteConfigPath) {
    if (siteConfigPath == null) {
      let defaultSiteConfigPath = path.join(siteDir, "site-config.yaml");
      if (!fse.existsSync(defaultSiteConfigPath)) {
        this.logger.warn(`Hikaru suggests you to rename \`${
          this.logger.cyan(path.join(siteDir, "site-config.yaml"))
        }\` to \`${
          this.logger.cyan(path.join(siteDir, "siteConfig.yml"))
        }\` because it's deprecated!`);
        defaultSiteConfigPath = path.join(siteDir, "siteConfig.yml");
      }
      siteConfigPath = defaultSiteConfigPath;
    }
    this.logger.debug(`Hikaru is loading site config in \`${
      this.logger.cyan(siteConfigPath)
    }\`...`);
    let siteConfig;
    try {
      siteConfig = YAML.parse(
        // Only site config and theme config can use readFileSync
        // because they are basic.
        fse.readFileSync(siteConfigPath, "utf8")
      );
    } catch (error) {
      this.logger.warn("Hikaru cannot load site config!");
      this.logger.error(error);
      process.exit(-1);
    }
    siteConfig["srcDir"] = path.join(
      siteDir, siteConfig["srcDir"] || "srcs"
    );
    this.logger.debug(`Hikaru is reading sources from \`${
      this.logger.cyan(path.join(siteConfig["srcDir"], path.sep))
    }\`...`);
    siteConfig["docDir"] = path.join(
      siteDir, siteConfig["docDir"] || "docs"
    );
    this.logger.debug(`Hikaru is writing documents to \`${
      this.logger.cyan(path.join(siteConfig["docDir"], path.sep))
    }\`...`);
    siteConfig["themeDir"] = path.join(
      siteDir, siteConfig["themeDir"]
    );
    this.logger.debug(`Hikaru is loading theme from \`${
      this.logger.cyan(path.join(siteConfig["themeDir"], path.sep))
    }\`...`);
    siteConfig["themeSrcDir"] = path.join(
      siteConfig["themeDir"], "srcs"
    );
    siteConfig["themeLangDir"] = path.join(
      siteConfig["themeDir"], "languages"
    );
    siteConfig["themeLayoutDir"] = path.join(
      siteConfig["themeDir"], "layouts"
    );
    return siteConfig;
  }

  /**
   * @private
   * @description Load theme config.
   * @param {String} siteDir Working site dir.
   * @param {String} [themeConfigPath] Alternative theme config path.
   * @return {Object}
   */
  loadThemeConfig(siteDir, themeConfigPath) {
    if (themeConfigPath == null) {
      let defaultThemeConfigPath = path.join(siteDir, "theme-config.yaml");
      if (!fse.existsSync(defaultThemeConfigPath)) {
        this.logger.warn(`Hikaru suggests you to rename \`${
          this.logger.cyan(path.join(siteDir, "theme-config.yaml"))
        }\` to \`${
          this.logger.cyan(path.join(siteDir, "themeConfig.yml"))
        }\` because it's deprecated!`);
        defaultThemeConfigPath = path.join(siteDir, "themeConfig.yml");
      }
      themeConfigPath = defaultThemeConfigPath;
    }
    this.logger.debug(`Hikaru is loading theme config in \`${
      this.logger.cyan(themeConfigPath)
    }\`...`);
    let themeConfig;
    try {
      themeConfig = YAML.parse(
        // Only site config and theme config can use readFileSync
        // because they are basic.
        fse.readFileSync(themeConfigPath, "utf8")
      );
    } catch (error) {
      if (error["code"] === "ENOENT") {
        this.logger.warn("Hikaru continues with a empty theme config...");
        themeConfig = {};
      } else {
        this.logger.warn("Hikaru cannot load theme config!");
        this.logger.error(error);
        process.exit(-1);
      }
    }
    return themeConfig;
  }

  /**
   * @private
   * @description Read file dependency tree.
   * @return {Object}
   */
  async loadFileDependencies() {
    const filepath = path.join(
      this.site["siteConfig"]["themeDir"], "file-dependencies.yaml"
    );
    this.logger.debug(`Hikaru is loading file dependencies in \`${
      this.logger.cyan(filepath)
    }\`...`);
    let rawFileDependencies;
    try {
      rawFileDependencies = YAML.parse(await fse.readFile(filepath, "utf8"));
    } catch (error) {
      // Should work if theme author does not provide such a file.
      rawFileDependencies = {};
    }
    const fullRawFileDependencies = {};
    for (const dir in rawFileDependencies) {
      const srcDir = path.join(this.site["siteConfig"]["themeDir"], dir);
      fullRawFileDependencies[srcDir] = rawFileDependencies[dir];
    }
    return fullRawFileDependencies;
  }

  /**
   * @private
   * @description Load info about the site.
   * @param {String} siteDir Working site dir.
   */
  loadSite(siteDir) {
    this.site = new Site(siteDir);
    this.site["siteConfig"] = this.loadSiteConfig(
      siteDir,
      this.opts["siteConfig"]
    );
    this.site["themeConfig"] = this.loadThemeConfig(
      siteDir,
      this.opts["themeConfig"]
    );
  }

  /**
   * @private
   * @description Load Hikaru's internal module.
   */
  loadModules() {
    this.renderer = new Renderer(
      this.logger,
      this.site["siteConfig"]["skipRender"]
    );
    this.compiler = new Compiler(this.logger);
    this.processor = new Processor(this.logger);
    this.generator = new Generator(this.logger);
    this.decorator = new Decorator(this.logger, this.compiler);
    this.translator = new Translator(this.logger);
    this.registerInternalRenderers();
    this.registerInternalCompilers();
    this.registerInternalProcessors();
    this.registerInternalGenerators();
  }

  /**
   * @private
   * @description Load local plugins for site,
   * which are installed into site's dir and starts with `hikaru-`.
   */
  async loadPlugins() {
    const sitePkgPath = path.join(this.site["siteDir"], "package.json");
    if (!fse.existsSync(sitePkgPath)) {
      return null;
    }
    const plugins = JSON.parse(
      await fse.readFile(sitePkgPath, "utf8")
    )["dependencies"];
    if (plugins == null) {
      return null;
    }
    return Promise.all(Object.keys(plugins).filter((name) => {
      return /^hikaru-/.test(name);
    }).map((name) => {
      const modulePath = path.join(this.site["siteDir"], "node_modules", name);
      this.logger.debug(`Hikaru is loading plugin \`${
        this.logger.blue(name)
      }\`...`);
      // Use absolute path to load from siteDir instead of program dir.
      return require(path.resolve(modulePath))({
        "logger": this.logger,
        "watcher": this.watcher,
        "renderer": this.renderer,
        "compiler": this.compiler,
        "processor": this.processor,
        "generator": this.generator,
        "decorator": this.decorator,
        "translator": this.translator,
        "types": this.types,
        "utils": this.utils,
        "site": this.site,
        "opts": this.opts
      });
    }));
  }

  /**
   * @private
   * @description Load local scripts for site and theme,
   * which are js files installed into scripts dir.
   */
  async loadScripts() {
    // Globs must not contain windows spearators.
    const scripts = (await matchFiles("**/*.js", {
      "workDir": path.join(this.site["siteDir"], "scripts")
    })).map((filename) => {
      return path.join(this.site["siteDir"], "scripts", filename);
    }).concat((await matchFiles("**/*.js", {
      "workDir": path.join(this.site["siteConfig"]["themeDir"], "scripts")
    })).map((filename) => {
      return path.join(
        this.site["siteConfig"]["themeDir"], "scripts", filename
      );
    }));
    return Promise.all(scripts.map((filepath) => {
      this.logger.debug(`Hikaru is loading script \`${
        this.logger.cyan(filepath)
      }\`...`);
      // Use absolute path to load from siteDir instead of program dir.
      return require(path.resolve(filepath))({
        "logger": this.logger,
        "watcher": this.watcher,
        "renderer": this.renderer,
        "compiler": this.compiler,
        "processor": this.processor,
        "generator": this.generator,
        "decorator": this.decorator,
        "translator": this.translator,
        "types": this.types,
        "utils": this.utils,
        "site": this.site,
        "opts": this.opts
      });
    }));
  }

  /**
   * @private
   */
  async loadLanguages() {
    let ext = ".yaml";
    let filenames = await matchFiles(`*${ext}`, {
      "workDir": this.site["siteConfig"]["themeLangDir"],
      "recursive": false
    });
    if (filenames.length === 0) {
      ext = ".yml";
      filenames = await matchFiles(`*${ext}`, {
        "workDir": this.site["siteConfig"]["themeLangDir"],
        "recursive": false
      });
      for (const filename of filenames) {
        this.logger.warn(`Hikaru suggests you to rename \`${
          this.logger.cyan(
            path.join(
              this.site["siteConfig"]["themeLangDir"],
              filename
            )
          )
        }\` to \`${
          this.logger.cyan(
            path.join(
              this.site["siteConfig"]["themeLangDir"],
              `${path.basename(filename, ext)}.yaml`
            )
          )
        }\` because it's deprecated!`);
      }
    }
    if (!filenames.includes(`default${ext}`)) {
      this.logger.warn(
        "Hikaru cannot find default language file in your theme!"
      );
    }
    const load = async (srcDir, srcPath) => {
      const lang = path.basename(srcPath, ext);
      this.logger.debug(`Hikaru is loading language \`${
        this.logger.blue(lang)
      }\`...`);
      const filepath = path.join(srcDir, srcPath);
      const content = await fse.readFile(filepath, "utf8");
      this.site["languages"].set(srcPath, content);
      const language = YAML.parse(content);
      this.translator.register(lang, language);
    };
    const all = Promise.all(filenames.map((filename) => {
      return load(this.site["siteConfig"]["themeLangDir"], filename);
    }));
    if (this.watcher != null) {
      this.watcher.register(
        this.site["siteConfig"]["themeLangDir"],
        (srcDir, srcPaths) => {
          const {added, changed, removed} = srcPaths;
          // Handle remove first because it is sync.
          for (const srcPath of removed) {
            this.site["languages"].delete(srcPath);
            const lang = path.basename(srcPath, ext);
            this.translator.unregister(lang);
          }
          Promise.all(added.concat(changed).map((srcPath) => {
            return load(srcDir, srcPath);
          }));
        },
        {"customGlob": `*${ext}`}
      );
    }
    return all;
  }

  /**
   * @private
   */
  async loadLayouts() {
    const filenames = await matchFiles("**/*", {
      "workDir": this.site["siteConfig"]["themeLayoutDir"]
    });
    const load = async (srcDir, srcPath) => {
      const filepath = path.join(srcDir, srcPath);
      const content = await fse.readFile(filepath, "utf8");
      this.site["layouts"].set(srcPath, content);
    };
    const compile = async (srcPath) => {
      const ext = path.extname(srcPath);
      const layout = path.basename(srcPath, ext);
      this.logger.debug(`Hikaru is loading layout \`${
        this.logger.blue(layout)
      }\`...`);
      const content = this.site["layouts"].get(srcPath);
      const fn = await this.compiler.compile(srcPath, content);
      this.decorator.register(layout, fn);
    };
    const all = Promise.all(filenames.map((filename) => {
      return load(this.site["siteConfig"]["themeLayoutDir"], filename);
    })).then(() => {
      return Promise.all(filenames.filter((filename) => {
        // We only compile top level templates as decorate functions.
        return path.dirname(filename) === ".";
      }).map((filename) => {
        return compile(filename);
      }));
    });
    if (this.watcher != null) {
      this.watcher.register(
        this.site["siteConfig"]["themeLayoutDir"],
        async (srcDir, srcPaths) => {
          const {added, changed, removed} = srcPaths;
          // Handle remove first because it is sync.
          for (const srcPath of removed) {
            this.site["layouts"].delete(srcPath);
            // We only register top level template files as decorate functions.
            if (path.dirname(srcPath) !== ".") {
              continue;
            }
            const ext = path.extname(srcPath);
            const layout = path.basename(srcPath, ext);
            this.decorator.unregister(layout);
          }
          const updated = added.concat(changed);
          await Promise.all(updated.map((srcPath) => {
            return load(srcDir, srcPath);
          }));
          // We only register top level template files as decorate functions.
          await Promise.all(updated.filter((srcPath) => {
            return path.dirname(srcPath) === ".";
          }).map((srcPath) => {
            return compile(srcPath);
          }));
        }
      );
    }
    return all;
  }

  /**
   * @private
   */
  registerInternalRenderers() {
    this.renderer.register(".html", (file) => {
      file["content"] = file["text"];
      return file;
    });

    const markedOpts = Object.assign(
      {"gfm": true},
      this.site["siteConfig"]["marked"]
    );
    marked.setOptions(markedOpts);
    this.renderer.register(".md", ".html", (file) => {
      file["content"] = marked.parse(file["text"]);
      return file;
    });
  }

  /**
   * @private
   */
  registerInternalCompilers() {
    // Nunjucks uses runtime including instead of compiled including,
    // and it will cache included templates internally.
    // The only way to update cache is emit update from a watcher.
    const njkOpts = Object.assign(
      {"autoescape": false, "watch": false, "noCache": false},
      this.site["siteConfig"]["nunjucks"]
    );
    // Nunjucks' default loader will read included templates sync,
    // we create a custom loader which will share loaded layouts.
    class SiteLayoutLoader extends nunjucks.Loader {
      constructor(hikaru) {
        super();
        this.watcher = hikaru.watcher;
        this.layouts = hikaru.site["layouts"];
        this.layoutDir = hikaru.site["siteConfig"]["themeLayoutDir"];
        if (this.watcher != null) {
          // This will be called before our actuall read file async calls,
          // but it's not a problem, nunjucks uses runtime including,
          // so the actual loading happens when decorating (refreshing
          // webpage), I don't believe a user can save file and refresh webpage
          // at the same time.
          this.watcher.register(
            this.layoutDir, (srcDir, srcPaths) => {
              const {added, changed, removed} = srcPaths;
              const all = added.concat(changed).concat(removed);
              for (const srcPath of all) {
                this.emit("update", srcPath);
              }
            }
          );
        }
      }

      getSource(srcPath) {
        if (!this.layouts.has(srcPath)) {
          // Layouts not in theme's layout dir, for example plugin's template,
          // fallback to read from disk.
          if (!fse.existsSync(srcPath)) {
            return null;
          }
          // Load such files sync to prevent include in for loop problem.
          return {
            "src": fse.readFileSync(srcPath, "utf8"),
            "path": srcPath
          };
        }
        return {
          "src": this.layouts.get(srcPath),
          "path": srcPath
        };
      }
    }
    const njkEnv = new nunjucks.Environment(
      new SiteLayoutLoader(this), njkOpts
    );
    const njkCompiler = (srcPath, content) => {
      // Only srcPath provided, but no content, load them via loader.
      if (content == null) {
        return (ctx) => {
          return new Promise((resolve, reject) => {
            njkEnv.render(srcPath, ctx, (error, result) => {
              if (error != null) {
                return reject(error);
              }
              return resolve(result);
            });
          });
        };
      }
      // The last argument is eagerCompile, which means we compile now
      // instead of delaying compile to rendering.
      const template = new nunjucks.Template(content, njkEnv, srcPath, true);
      return (ctx) => {
        return new Promise((resolve, reject) => {
          template.render(ctx, (error, result) => {
            if (error != null) {
              return reject(error);
            }
            return resolve(result);
          });
        });
      };
    };
    this.compiler.register(".njk", njkCompiler);
    this.compiler.register(".j2", njkCompiler);
  }

  /**
   * @private
   */
  registerInternalProcessors() {
    if (!this.opts["draft"]) {
      this.processor.register("draft filter", (site) => {
        site["posts"] = site["posts"].filter((p) => {
          return !p["draft"];
        });
      });
    }

    this.processor.register("post sequence", (site) => {
      site["posts"].sort((a, b) => {
        return -(a["createdDate"] - b["createdDate"]);
      });
      for (let i = 0; i < site["posts"].length; ++i) {
        if (i > 0) {
          site["posts"][i]["next"] = site["posts"][i - 1];
        }
        if (i < site["posts"].length - 1) {
          site["posts"][i]["prev"] = site["posts"][i + 1];
        }
      }
    });

    this.processor.register("categories collection", (site) => {
      const result = genCategories(site["posts"]);
      site["categories"] = result["categories"];
      site["categoriesLength"] = result["categoriesLength"];
    });

    this.processor.register("tags collection", (site) => {
      const result = genTags(site["posts"]);
      site["tags"] = result["tags"];
      site["tagsLength"] = result["tagsLength"];
    });

    this.processor.register("content resolving", (site) => {
      const all = site["posts"].concat(site["pages"]);
      // It turns out that single threaded resolving works faster,
      // and takes less memory, because Node.js Workers needs to copy message.
      for (const p of all) {
        const node = parseNode(p["content"]);
        resolveHeaderIDs(node);
        p["toc"] = genTOC(node);
        resolveAnchors(
          node,
          site["siteConfig"]["baseURL"],
          site["siteConfig"]["rootDir"],
          p["docPath"]
        );
        resolveImages(node, site["siteConfig"]["rootDir"], p["docPath"]);
        resolveCodeBlocks(node, site["siteConfig"]["highlight"]);
        p["content"] = serializeNode(node);
        if (p["content"].indexOf("<!--more-->") !== -1) {
          const split = p["content"].split("<!--more-->");
          p["excerpt"] = split[0];
          p["more"] = split[1];
          p["content"] = split.join("<a id=\"more\"></a>");
        }
      }
    });
  }

  /**
   * @private
   */
  registerInternalGenerators() {
    if (this.site["siteConfig"]["indexDir"] != null) {
      this.generator.register("index pages", (site) => {
        let perPage;
        if (isObject(site["siteConfig"]["perPage"])) {
          perPage = site["siteConfig"]["perPage"]["index"] || 10;
        } else {
          perPage = site["siteConfig"]["perPage"] || 10;
        }
        return paginate(new File({
          "layout": "index",
          "docDir": site["siteConfig"]["docDir"],
          "docPath": path.join(site["siteConfig"]["indexDir"], "index.html"),
          "title": "index",
          "comment": false,
          "reward": false
        }), site["posts"], perPage);
      });
    }

    if (this.site["siteConfig"]["archiveDir"] != null) {
      this.generator.register("archives pages", (site) => {
        let perPage;
        if (isObject(site["siteConfig"]["perPage"])) {
          perPage = site["siteConfig"]["perPage"]["archives"] || 10;
        } else {
          perPage = site["siteConfig"]["perPage"] || 10;
        }
        return paginate(new File({
          "layout": "archives",
          "docDir": site["siteConfig"]["docDir"],
          "docPath": path.join(site["siteConfig"]["archiveDir"], "index.html"),
          "title": "archives",
          "comment": false,
          "reward": false
        }), site["posts"], perPage);
      });
    }

    if (this.site["siteConfig"]["categoryDir"] != null) {
      this.generator.register("categories pages", (site) => {
        const results = [];
        let perPage;
        if (isObject(site["siteConfig"]["perPage"])) {
          perPage = site["siteConfig"]["perPage"]["category"] || 10;
        } else {
          perPage = site["siteConfig"]["perPage"] || 10;
        }
        for (const sub of site["categories"]) {
          sortCategories(sub);
          results.push(...paginateCategories(
            sub, site["siteConfig"]["categoryDir"], site, perPage
          ));
        }
        results.push(new File({
          "layout": "categories",
          "docDir": site["siteConfig"]["docDir"],
          "docPath": path.join(site["siteConfig"]["categoryDir"], "index.html"),
          "title": "categories",
          "comment": false,
          "reward": false
        }));
        return results;
      });
    }

    if (this.site["siteConfig"]["tagDir"] != null) {
      this.generator.register("tags pages", (site) => {
        const results = [];
        let perPage;
        if (isObject(site["siteConfig"]["perPage"])) {
          perPage = site["siteConfig"]["perPage"]["tag"] || 10;
        } else {
          perPage = site["siteConfig"]["perPage"] || 10;
        }
        for (const tag of site["tags"]) {
          tag["posts"].sort((a, b) => {
            return -(a["date"] - b["date"]);
          });
          const sp = new File({
            "layout": "tag",
            "docDir": site["siteConfig"]["docDir"],
            "docPath": path.join(
              site["siteConfig"]["tagDir"], tag["name"], "index.html"
            ),
            "title": "tag",
            "name": tag["name"],
            "comment": false,
            "reward": false
          });
          tag["docPath"] = sp["docPath"];
          results.push(...paginate(sp, tag["posts"], perPage));
        }
        results.push(new File({
          "layout": "tags",
          "docDir": site["siteConfig"]["docDir"],
          "docPath": path.join(site["siteConfig"]["tagDir"], "index.html"),
          "title": "tags",
          "comment": false,
          "reward": false
        }));
        return results;
      });
    }
  }
}

module.exports = Hikaru;
