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
      if (this.router != null) {
        this.router.close();
      }
      if (this.watcher != null) {
        this.watcher.close();
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
    return fse.emptyDir(siteConfig["docDir"]).catch((error) => {
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
      await this.loadModules();
      await Promise.all([
        this.loadPlugins(),
        this.loadScripts(),
        this.loadLanguages(),
        this.loadLayouts()
      ]);
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
    const rawFileDependencies = this.loadFileDependencies();
    this.watcher = new Watcher(this.logger, rawFileDependencies);
    const reloadFileDependencies = () => {
      const rawFileDependencies = this.loadFileDependencies();
      this.watcher.updateFileDependencies(rawFileDependencies);
    };
    this.watcher.register(
      this.site["siteConfig"]["themeDir"],
      reloadFileDependencies,
      reloadFileDependencies,
      reloadFileDependencies,
      {"customGlob": "file-dependencies.yaml"}
    );
    try {
      // Modules must be loaded before others.
      this.loadModules();
      await Promise.all([
        this.loadPlugins(),
        this.loadScripts(),
        this.loadLanguages(),
        this.loadLayouts()
      ]);
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
  loadFileDependencies() {
    const filepath = path.join(
      this.site["siteConfig"]["themeDir"],
      "file-dependencies.yaml"
    );
    this.logger.debug(`Hikaru is loading file dependencies in \`${
      this.logger.cyan(filepath)
    }\`...`);
    let rawFileDependencies;
    try {
      rawFileDependencies = YAML.parse(fse.readFileSync(filepath, "utf8"));
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
  loadPlugins() {
    const sitePkgPath = path.join(this.site["siteDir"], "package.json");
    if (!fse.existsSync(sitePkgPath)) {
      return;
    }
    const plugins = JSON.parse(
      fse.readFileSync(sitePkgPath, "utf8")
    )["dependencies"];
    if (plugins == null) {
      return;
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
        "renderer": this.renderer,
        "compiler": this.compiler,
        "processor": this.processor,
        "generator": this.generator,
        "decorator": this.decorator,
        "translator": this.translator,
        "types": this.types,
        "utils": this.utils,
        "opts": this.opts,
        "site": this.site,
        "watcher": this.watcher
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
      "nodir": true,
      "cwd": path.join(this.site["siteDir"], "scripts")
    })).map((filename) => {
      return path.join(this.site["siteDir"], "scripts", filename);
    }).concat((await matchFiles("**/*.js", {
      "nodir": true,
      "cwd": path.join(this.site["siteConfig"]["themeDir"], "scripts")
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
        "renderer": this.renderer,
        "compiler": this.compiler,
        "processor": this.processor,
        "generator": this.generator,
        "decorator": this.decorator,
        "translator": this.translator,
        "types": this.types,
        "utils": this.utils,
        "opts": this.opts,
        "site": this.site,
        "watcher": this.watcher
      });
    }));
  }

  /**
   * @private
   */
  async loadLanguages() {
    let ext = ".yaml";
    let filenames = await matchFiles(`*${ext}`, {
      "nodir": true,
      "dot": false,
      "cwd": this.site["siteConfig"]["themeLangDir"]
    });
    if (filenames.length === 0) {
      ext = ".yml";
      filenames = await matchFiles(`*${ext}`, {
        "nodir": true,
        "dot": false,
        "cwd": this.site["siteConfig"]["themeLangDir"]
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
      const filepath = path.join(srcDir, srcPath);
      this.logger.debug(`Hikaru is loading language \`${
        this.logger.blue(lang)
      }\`...`);
      const language = YAML.parse(await fse.readFile(filepath, "utf8"));
      this.translator.register(lang, language);
    };
    const all = Promise.all(filenames.map((filename) => {
      return load(this.site["siteConfig"]["themeLangDir"], filename);
    }));
    if (this.watcher != null) {
      const onAddedOrChanged = async (srcDir, srcPath) => {
        // We only register top level yaml files as language.
        if (path.dirname(srcPath) !== "." && path.extname(srcPath) !== ext) {
          return;
        }
        load(srcDir, srcPath);
      };
      this.watcher.register(
        this.site["siteConfig"]["themeLangDir"],
        onAddedOrChanged,
        onAddedOrChanged,
        (srcPath, srcDir) => {
          // We only register top level yaml files as language.
          if (path.dirname(srcPath) !== "." && path.extname(srcPath) !== ext) {
            return;
          }
          const lang = path.basename(srcPath, ext);
          this.translator.unregister(lang);
        },
        {"recursive": false}
      );
    }
    return all;
  }

  /**
   * @private
   */
  async loadLayouts() {
    const filenames = await matchFiles("*", {
      "nodir": true,
      "dot": false,
      "cwd": this.site["siteConfig"]["themeLayoutDir"]
    });
    const load = async (srcDir, srcPath) => {
      const ext = path.extname(srcPath);
      const layout = path.basename(srcPath, ext);
      this.logger.debug(`Hikaru is loading layout \`${
        this.logger.blue(layout)
      }\`...`);
      const filepath = path.join(srcDir, srcPath);
      const fn = await this.compiler.compile(filepath);
      this.decorator.register(layout, fn);
    };
    const all = Promise.all(filenames.map((filename) => {
      return load(this.site["siteConfig"]["themeLayoutDir"], filename);
    }));
    if (this.watcher != null) {
      const onAddedOrChanged = (srcDir, srcPath) => {
        // We only register top level template files as layout.
        if (path.dirname(srcPath) !== ".") {
          return;
        }
        load(srcDir, srcPath);
      };
      this.watcher.register(
        this.site["siteConfig"]["themeLayoutDir"],
        onAddedOrChanged,
        onAddedOrChanged,
        (srcDir, srcPath) => {
          // We only register top level template files as layout.
          if (path.dirname(srcPath) !== ".") {
            return;
          }
          const ext = path.extname(srcPath);
          const layout = path.basename(srcPath, ext);
          this.decorator.unregister(layout);
        }
        // Even though we don't load files recursively, we need to watch files
        // recursively, because our loaded layouts may depend on them.
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

    const markedConfig = Object.assign(
      {"gfm": true},
      this.site["siteConfig"]["marked"]
    );
    marked.setOptions(markedConfig);
    this.renderer.register(".md", ".html", (file) => {
      file["content"] = marked.parse(file["text"]);
      return file;
    });
  }

  /**
   * @private
   */
  registerInternalCompilers() {
    const njkConfig = Object.assign(
      {"autoescape": false},
      this.site["siteConfig"]["nunjucks"]
    );
    const njkCompiler = (filepath, content) => {
      const njkEnv = nunjucks.configure(
        path.dirname(filepath), njkConfig
      );
      const template = nunjucks.compile(content, njkEnv, filepath);
      // For template you must give a render function as content.
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
      // Resolve contents may take a long time so we make it async and handle
      // it with Promises.
      return Promise.all(all.map((p) => {
        return new Promise((resolve, reject) => {
          setImmediate(() => {
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
            resolve();
          });
        });
      }));
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
        let results = [];
        let perPage;
        if (isObject(site["siteConfig"]["perPage"])) {
          perPage = site["siteConfig"]["perPage"]["category"] || 10;
        } else {
          perPage = site["siteConfig"]["perPage"] || 10;
        }
        for (const sub of site["categories"]) {
          sortCategories(sub);
          results = results.concat(paginateCategories(
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
        let results = [];
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
              site["siteConfig"]["tagDir"], `${tag["name"]}`, "index.html"
            ),
            "title": "tag",
            "name": tag["name"].toString(),
            "comment": false,
            "reward": false
          });
          tag["docPath"] = sp["docPath"];
          results = results.concat(paginate(sp, tag["posts"], perPage));
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
