"use strict";

/**
 * @module hikaru
 */

const path = require("path");

const fse = require("fs-extra");
const YAML = require("yaml");
const nunjucks = require("nunjucks");
const marked = require("marked");
const stylus = require("stylus");

const Logger = require("./logger");
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
  getPathFn,
  getURLFn,
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
   * @param {String} [opts.config] Alternative site config path.
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
    this.types = types;
    this.utils = utils;
    // Catch all unhandled error in promises.
    process.on("unhandledRejection", (error) => {
      this.logger.warn("Hikaru catched some error during running!");
      this.logger.error(error);
    });
    process.on("SIGINT", () => {
      if (this.router != null) {
        this.router.close();
      }
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      if (this.router != null) {
        this.router.close();
      }
      process.exit(0);
    });
    process.on("exit", () => {
      this.logger.debug("Hikaru is stopping...");
    });
  }

  /**
   * @description Create a Hikaru site dir with needed files.
   * @param {String} siteDir Working site dir.
   */
  init(siteDir) {
    const configPath = this.opts["config"] || path.join(
      siteDir, "siteConfig.yml"
    );
    return fse.mkdirp(siteDir).then(() => {
      this.logger.debug(`Hikaru is copying \`${
        this.logger.cyan(configPath)
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
        path.join(__dirname, "..", "dists", "siteConfig.yml"),
        configPath || path.join(siteDir, "siteConfig.yml")
      );
      fse.readFile(
        path.join(__dirname, "..", "dists", "package.json")
      ).then((text) => {
        const json = JSON.parse(text);
        // Set package name to site dir name.
        json["name"] = path.relative("..", ".");
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
    const configPath = this.opts["config"] || path.join(
      siteDir, "siteConfig.yml"
    );
    let siteConfig;
    try {
      siteConfig = YAML.parse(fse.readFileSync(configPath, "utf8"));
    } catch (error) {
      this.logger.warn("Hikaru cannot find site config!");
      this.logger.error(error);
      process.exit(-1);
    }
    if (siteConfig == null || siteConfig["docDir"] == null) {
      return;
    }
    this.logger.debug(`Hikaru is cleaning \`${
      this.logger.cyan(
        path.join(siteDir, siteConfig["docDir"], path.sep)
      )
    }\`...`);
    return fse.emptyDir(
      path.join(siteDir, siteConfig["docDir"])
    ).catch((error) => {
      this.logger.warn("Hikaru catched some error during cleaning!");
      this.logger.error(error);
    });
  }

  /**
   * @description Build and write docs from srcs.
   * @param {String} siteDir Working site dir.
   */
  async build(siteDir) {
    this.loadSite(siteDir, this.opts["config"]);
    try {
      await this.loadModules();
      await this.loadPlugins();
      await this.loadScripts();
      await this.loadLanguages();
      await this.loadLayouts();
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
    this.loadSite(siteDir, this.opts["config"]);
    try {
      await this.loadModules();
      await this.loadPlugins();
      await this.loadScripts();
      await this.loadLanguages();
      await this.loadLayouts();
      this.router = new Router(
        this.logger,
        this.renderer,
        this.processor,
        this.generator,
        this.decorator,
        this.translator,
        this.site
      );
      await this.router.serve(ip, port);
    } catch (error) {
      this.logger.warn("Hikaru catched some error during serving!");
      this.logger.error(error);
    }
  }

  /**
   * @private
   * @description Load site and theme's config.
   * @param {String} siteDir Working site dir.
   * @param {String} [configPath] Alternative config file path.
   */
  loadSite(siteDir, configPath) {
    this.site = new Site(siteDir);
    configPath = configPath || path.join(
      this.site["siteDir"],
      "siteConfig.yml"
    );
    try {
      this.site["siteConfig"] = YAML.parse(
        fse.readFileSync(configPath, "utf8")
      );
    } catch (error) {
      this.logger.warn("Hikaru cannot find site config!");
      this.logger.error(error);
      process.exit(-1);
    }
    const siteConfig = this.site["siteConfig"];
    siteConfig["srcDir"] = path.join(
      this.site["siteDir"], siteConfig["srcDir"] || "srcs"
    );
    siteConfig["docDir"] = path.join(
      this.site["siteDir"], siteConfig["docDir"] || "docs"
    );
    siteConfig["themeDir"] = path.join(
      this.site["siteDir"], siteConfig["themeDir"]
    );
    siteConfig["themeSrcDir"] = path.join(
      siteConfig["themeDir"], "srcs"
    );
    siteConfig["themeLangDir"] = path.join(
      siteConfig["themeDir"], "languages"
    );
    siteConfig["themeLayoutDir"] = path.join(
      siteConfig["themeDir"], "layouts"
    );
    siteConfig["categoryDir"] = siteConfig["categoryDir"] || "categories";
    siteConfig["tagDir"] = siteConfig["tagDir"] || "tags";
    const themeConfigPath = path.join(this.site["siteDir"], "themeConfig.yml");
    try {
      this.site["themeConfig"] = YAML.parse(
        fse.readFileSync(themeConfigPath, "utf8")
      );
    } catch (error) {
      if (error["code"] === "ENOENT") {
        this.logger.warn("Hikaru continues with a empty theme config...");
        this.site["themeConfig"] = {};
      }
    }
  }

  /**
   * @private
   * @description Load Hikaru's internal module.
   */
  async loadModules() {
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
      return;
    }
    const plugins = JSON.parse(
      fse.readFileSync(sitePkgPath, "utf8")
    )["dependencies"];
    if (plugins == null) {
      return;
    }
    return Object.keys(plugins).filter((name) => {
      return /^hikaru-/.test(name);
    }).map(async (name) => {
      const modulePath = path.join(this.site["siteDir"], "node_modules", name);
      this.logger.debug(`Hikaru is loading plugin \`${
        this.logger.blue(name)
      }\`...`);
      // Use absolute path to load from siteDir instead of program dir.
      return await require(path.resolve(modulePath))({
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
        "site": this.site
      });
    });
  }

  /**
   * @private
   * @description Load local scripts for site and theme,
   * which are js files installed into scripts dir.
   */
  async loadScripts() {
    const scripts = (await matchFiles(path.join("**", "*.js"), {
      "nodir": true,
      "cwd": path.join(this.site["siteDir"], "scripts")
    })).map((filename) => {
      return path.join(this.site["siteDir"], "scripts", filename);
    }).concat((await matchFiles(path.join("**", "*.js"), {
      "nodir": true,
      "cwd": path.join(this.site["siteConfig"]["themeDir"], "scripts")
    })).map((filename) => {
      return path.join(
        this.site["siteConfig"]["themeDir"], "scripts", filename
      );
    }));
    return scripts.map(async (filepath) => {
      this.logger.debug(`Hikaru is loading script \`${
        this.logger.cyan(filepath)
      }\`...`);
      // Use absolute path to load from siteDir instead of program dir.
      return await require(path.resolve(filepath))({
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
        "site": this.site
      });
    });
  }

  /**
   * @private
   */
  async loadLanguages() {
    const ext = ".yml";
    const filenames = await matchFiles(`*${ext}`, {
      "nodir": true,
      "dot": false,
      "cwd": this.site["siteConfig"]["themeLangDir"]
    });
    if (!filenames.includes(`default${ext}`)) {
      this.logger.warn(
        "Hikaru cannot find default language file in your theme!"
      );
    }
    for (const filename of filenames) {
      const lang = path.basename(filename, ext);
      const filepath = path.join(
        this.site["siteConfig"]["themeLangDir"],
        filename
      );
      this.logger.debug(`Hikaru is loading language \`${
        this.logger.blue(lang)
      }\`...`);
      const language = YAML.parse(await fse.readFile(filepath, "utf8"));
      this.translator.register(lang, language);
    }
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
    for (const filename of filenames) {
      const ext = path.extname(filename);
      const layout = path.basename(filename, ext);
      this.logger.debug(`Hikaru is loading layout \`${
        this.logger.blue(layout)
      }\`...`);
      const filepath = path.join(
        this.site["siteConfig"]["themeLayoutDir"],
        filename
      );
      const fn = await this.compiler.compile(filepath);
      this.decorator.register(layout, fn);
    }
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
      file["content"] = marked(file["text"]);
      return file;
    });

    const stylConfig = this.site["siteConfig"]["stylus"] || {};
    const getPath = getPathFn(this.site["siteConfig"]["rootDir"]);
    const getURL = getURLFn(
      this.site["siteConfig"]["baseURL"],
      this.site["siteConfig"]["rootDir"]
    );
    this.renderer.register(".styl", ".css", (file) => {
      return new Promise((resolve, reject) => {
        stylus(file["text"]).use((style) => {
          style.define("getSiteConfig", (data) => {
            const keys = data["val"].toString().trim().split(".");
            let res = this.site["siteConfig"];
            for (const k of keys) {
              if (res[k] == null) {
                return null;
              }
              res = res[k];
            }
            return res;
          });
          style.define("getThemeConfig", (data) => {
            const keys = data["val"].toString().trim().split(".");
            let res = this.site["themeConfig"];
            for (const k of keys) {
              if (res[k] == null) {
                return null;
              }
              res = res[k];
            }
            return res;
          });
          style.define("getPath", (data) => {
            return getPath(data["val"].toString().trim());
          });
          style.define("getURL", (data) => {
            return getURL(data["val"].toString().trim());
          });
          style.define("siteConfig", this.site["siteConfig"]);
          style.define("themeConfig", this.site["themeConfig"]);
          style.define("srcDir", file["srcDir"]);
          style.define("srcPath", file["srcPath"]);
          style.define("docDir", file["docDir"]);
          style.define("docPath", file["docPath"]);
        }).set("filename", path.join(
          file["srcDir"], file["srcPath"]
        )).set("sourcemap", stylConfig["sourcemap"])
          .set("compress", stylConfig["compress"])
          .set("include css", true).render((error, result) => {
            if (error != null) {
              return reject(error);
            }
            file["content"] = result;
            return resolve(file);
          });
      });
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
    const njkRenderer = (filepath, content) => {
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
    this.compiler.register(".njk", njkRenderer);
    this.compiler.register(".j2", njkRenderer);
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

module.exports = Hikaru;
