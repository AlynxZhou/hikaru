"use strict";

/**
 * @module router
 */

const fse = require("fs-extra");
const path = require("path");
const http = require("http");
const moment = require("moment-timezone");
const chokidar = require("chokidar");
const {File} = require("./types");
const {
  isArray,
  isString,
  isFunction,
  isObject,
  isBinaryFile,
  default404,
  matchFiles,
  getVersion,
  getPathFn,
  getURLFn,
  getContentType,
  putSite,
  delSite,
  getFullSrcPath,
  getFullDocPath,
  isCurrentPathFn,
  parseFrontMatter
} = require("./utils");

/**
 * @description Core module that handling file routing.
 */
class Router {
  /**
   * @param {Logger} logger
   * @param {Renderer} renderer
   * @param {Processor} processor
   * @param {Generator} generator
   * @param {Decorator} decorator
   * @param {Translator} translator
   * @param {Site} site
   * @return {Router}
   */
  constructor(
    logger, renderer, processor, generator, decorator, translator, site
  ) {
    this.logger = logger;
    this.renderer = renderer;
    this.processor = processor;
    this.generator = generator;
    this.decorator = decorator;
    this.translator = translator;
    this.site = site;
    this._ = {};
    this.server = null;
    this.ip = null;
    this.port = null;
    this.listening = false;
    this.watchers = [];
    this.watchedEvents = [];
    this.sourcePages = [];
    this.handling = false;
    this.getURL = getURLFn(
      this.site["siteConfig"]["baseURL"], this.site["siteConfig"]["rootDir"]
    );
    this.getPath = getPathFn(this.site["siteConfig"]["rootDir"]);
  }

  /**
   * @private
   * @description Read file content.
   * @param {String} filepath
   * @return {Promise<Buffer>}
   */
  read(filepath) {
    return fse.readFile(filepath);
  }

  /**
   * @private
   * @description Write or copy file to docDir.
   * @param {File} file
   * @param {(Buffer|String)} content
   */
  write(file, content) {
    content = content || file["content"];
    if (!file["binary"]) {
      return fse.outputFile(getFullDocPath(file), content);
    }
    return fse.copy(getFullSrcPath(file), getFullDocPath(file));
  }

  /**
   * @private
   * @description Load files into site data via parsing front-matter.
   * @param {File} file
   */
  async loadFile(file) {
    this.logger.debug(`Hikaru is reading \`${
      this.logger.cyan(getFullSrcPath(file))
    }\`...`);
    // Binary files are not supposed to handle by SSGs.
    // We can copy or pipe it to save memory.
    file["binary"] = await isBinaryFile(getFullSrcPath(file));
    if (!file["binary"]) {
      file["raw"] = await this.read(getFullSrcPath(file));
      file["text"] = file["raw"].toString("utf8");
      file = parseFrontMatter(file);
    }
    const results = await this.renderer.render(file);
    for (const result of results) {
      if (result["layout"] === "post") {
        result["type"] = "post";
        putSite(this.site, "posts", result);
      } else if (result["layout"] != null) {
        result["type"] = "page";
        putSite(this.site, "pages", result);
      } else {
        result["type"] = "asset";
        putSite(this.site, "assets", result);
      }
    }
  }

  /**
   * @private
   * @description Save file via layout.
   * @param {File} file
   */
  async saveFile(file) {
    let content = null;
    if (!file["binary"]) {
      content = await this.decorator.decorate(file, this.loadContext(file));
    }
    this.logger.debug(`Hikaru is writing \`${
      this.logger.cyan(getFullDocPath(file))
    }\`...`);
    this.write(file, content);
  }

  /**
   * @private
   * @description Load context for template rendering.
   * @param {File} file
   * @return {File} File with context that can be used by template.
   */
  loadContext(file) {
    const lang = file["language"] || this.site["siteConfig"]["language"];
    return {
      "site": this.site,
      "siteConfig": this.site["siteConfig"],
      "themeConfig": this.site["themeConfig"],
      "moment": moment,
      "momenttz": moment.tz,
      "getVersion": getVersion,
      "getURL": this.getURL,
      "getPath": this.getPath,
      "isCurrentPath": isCurrentPathFn(
        this.site["siteConfig"]["rootDir"], file["docPath"]
      ),
      "isArray": isArray,
      "isString": isString,
      "isFunction": isFunction,
      "isObject": isObject,
      "__": this.translator.getTranslateFn(lang)
    };
  }

  /**
   * @private
   * @description Match all src files.
   * @return {Promise<File[]>}
   */
  async matchAll() {
    return (await matchFiles(path.join("**", "*"), {
      "nodir": true,
      "dot": false,
      "cwd": this.site["siteConfig"]["themeSrcDir"]
    })).map((srcPath) => {
      return new File(
        this.site["siteConfig"]["docDir"],
        this.site["siteConfig"]["themeSrcDir"],
        srcPath
      );
    }).concat((await matchFiles(path.join("**", "*"), {
      "nodir": true,
      "dot": true,
      "cwd": this.site["siteConfig"]["srcDir"]
    })).map((srcPath) => {
      return new File(
        this.site["siteConfig"]["docDir"],
        this.site["siteConfig"]["srcDir"],
        srcPath
      );
    }));
  }

  /**
   * @private
   * @description Build routes for all built files to serve.
   * @param {File[]} allFiles All built files.
   */
  buildServerRoutes(allFiles) {
    this._ = {};
    for (const f of allFiles) {
      const key = this.getPath(f["docPath"]);
      this.logger.debug(`Hikaru is serving \`${this.logger.cyan(key)}\`...`);
      this._[key] = f;
    }
  }

  /**
   * @private
   * @description Watch all src files.
   */
  watchAll() {
    for (const srcDir of [
      this.site["siteConfig"]["themeSrcDir"],
      this.site["siteConfig"]["srcDir"]
    ]) {
      const watcher = chokidar.watch(path.join("**", "*"), {
        "cwd": srcDir, "ignoreInitial": true
      });
      this.watchers.push(watcher);
      for (const event of ["add", "change", "unlink"]) {
        watcher.on(event, (srcPath) => {
          this.logger.debug(
            `Hikaru is watching event \`${
              this.logger.blue(event)
            }\` from \`${
              this.logger.cyan(path.join(srcDir, srcPath))
            }\`...`
          );
          const i = this.watchedEvents.findIndex((p) => {
            return p["srcDir"] === srcDir && p["srcPath"] === srcPath;
          });
          if (i !== -1) {
            // Just update event.
            this.watchedEvents[i]["type"] = event;
          } else {
            // Not found.
            this.watchedEvents.push({event, srcDir, srcPath});
          }
          setImmediate(this.handleEvents.bind(this));
        });
      }
    }
  }

  /**
   * @private
   * @description Unwatch all src files.
   */
  unwatchAll() {
    let w;
    while ((w = this.watchers.shift()) != null) {
      w.close();
    }
  }

  /**
   * @private
   * @description Handle watcher events.
   */
  async handleEvents() {
    // Keep handling atomic. Prevent repeatedly handling.
    if (this.watchedEvents.length === 0 || this.handling) {
      return;
    }
    this.handling = true;
    let e;
    while ((e = this.watchedEvents.shift()) != null) {
      const file = new File(
        this.site["siteConfig"]["docDir"], e["srcDir"], e["srcPath"]
      );
      if (e["event"] === "unlink") {
        for (const key of Site.arrayKeys) {
          delSite(this.site, key, file);
        }
      } else {
        await this.loadFile(file);
      }
    }
    await this.handle();
    this.buildServerRoutes(
      this.site["assets"]
        .concat(this.site["posts"])
        .concat(this.site["pages"])
        .concat(this.site["files"])
    );
    this.handling = false;
  }

  /**
   * @private
   * @description Start a listening server.
   * @param {String} ip
   * @param {Number} port
   */
  listen(ip, port) {
    this.ip = ip;
    this.port = port;
    this.server = http.createServer(async (request, response) => {
      // Remove query string.
      const url = request["url"].split(/[?#]/)[0];
      let file;
      if (this._[url] == null) {
        this.logger.log(`404: ${url}`);
        file = this._[this.getPath("404.html")] || new File({
          "content": default404,
          "docPath": this.getPath("404.html")
        });
        response.writeHead(404, {
          "Content-Type": getContentType(file["docPath"])
        });
      } else {
        this.logger.log(`200: ${url}`);
        file = this._[url];
        response.writeHead(200, {
          "Content-Type": getContentType(file["docPath"])
        });
      }
      if (!file["binary"]) {
        response.write(
          await this.decorator.decorate(file, this.loadContext(file))
        );
        response.end();
      } else {
        // Pipe a binary instead of read.
        fse.createReadStream(getFullSrcPath(file)).pipe(response);
      }
    });
    this.logger.log(
      `Hikaru is starting to listen on http://${this.ip}:${this.port}${
        this.getPath()
      }...`
    );
    if (!this.listening) {
      if (this.ip !== "localhost") {
        this.server.listen(this.port, this.ip);
      } else {
        this.server.listen(this.port);
      }
      this.listening = true;
      this.watchAll();
    }
  }

  /**
   * @private
   * @description Close the listening server.
   */
  close() {
    if (this.listening) {
      this.server.close();
      this.listening = false;
      this.unwatchAll();
      this.logger.log(
        `Hikaru is stopping to listen on http://${this.ip}:${this.port}${
          this.getPath()
        }...`
      );
      this.server = null;
    }
  }

  /**
   * @private
   * @description Handle all processor and generator.
   */
  async handle() {
    await this.processor.process(this.site);
    this.site["files"] = await this.generator.generate(this.site);
  }

  /**
   * @description Build all site docs.
   */
  async build() {
    await Promise.all((await this.matchAll()).map(this.loadFile.bind(this)));
    await this.handle();
    this.site["assets"]
      .concat(this.site["posts"])
      .concat(this.site["pages"])
      .concat(this.site["files"])
      .map(this.saveFile.bind(this));
  }

  /**
   * @description Serve all site docs.
   */
  async serve(ip, port) {
    await Promise.all((await this.matchAll()).map(this.loadFile.bind(this)));
    await this.handle();
    this.buildServerRoutes(
      this.site["assets"]
        .concat(this.site["posts"])
        .concat(this.site["pages"])
        .concat(this.site["files"])
    );
    this.listen(ip, port);
  }
}

module.exports = Router;
