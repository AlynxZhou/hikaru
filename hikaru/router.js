"use strict";

/**
 * @module router
 */

const fse = require("fs-extra");
const http = require("http");
const {Site, File} = require("./types");
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
  isCurrentHostFn,
  isCurrentPathFn,
  getContentType,
  putSite,
  delSite,
  getFullSrcPath,
  getFullDocPath,
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
   * @param {Watcher} [watcher]
   * @return {Router}
   */
  constructor(
    logger,
    renderer,
    processor,
    generator,
    decorator,
    translator,
    site,
    watcher = null
  ) {
    this.logger = logger;
    this.renderer = renderer;
    this.processor = processor;
    this.generator = generator;
    this.decorator = decorator;
    this.translator = translator;
    this.site = site;
    this._ = new Map();
    this.server = null;
    this.ip = null;
    this.port = null;
    this.listening = false;
    this.watcher = watcher;
    this.queuedFlush = false;
    this.getPath = getPathFn(this.site["siteConfig"]["rootDir"]);
    this.getURL = getURLFn(
      this.site["siteConfig"]["baseURL"], this.site["siteConfig"]["rootDir"]
    );
    this.isCurrentHost = isCurrentHostFn(
      this.site["siteConfig"]["baseURL"], this.site["siteConfig"]["rootDir"]
    );
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
      "getVersion": getVersion,
      "getPath": this.getPath,
      "getURL": this.getURL,
      "isCurrentHost": this.isCurrentHost,
      "isCurrentPath": isCurrentPathFn(
        this.site["siteConfig"]["rootDir"], file["docPath"]
      ),
      "isArray": isArray,
      "isString": isString,
      "isFunction": isFunction,
      "isObject": isObject,
      // Damn it, you cannot use `new` in Nunjucks.
      // Every time a decorator starts, context will be loaded,
      // and we can get decorate date here.
      "decorateDate": new Date(),
      "__": this.translator.getTranslateFn(lang)
    };
  }

  /**
   * @private
   * @description Match all src files.
   * @return {Promise<File[]>}
   */
  async matchAll() {
    // Globs must not contain windows spearators.
    return (await matchFiles("**/*", {
      "ignoreHidden": false,
      "workDir": this.site["siteConfig"]["themeSrcDir"]
    })).map((srcPath) => {
      return new File(
        this.site["siteConfig"]["docDir"],
        this.site["siteConfig"]["themeSrcDir"],
        srcPath
      );
    }).concat((await matchFiles("**/*", {
      "ignoreHidden": false,
      "workDir": this.site["siteConfig"]["srcDir"]
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
    this._.clear();
    for (const f of allFiles) {
      const key = this.getPath(f["docPath"]);
      this.logger.debug(`Hikaru is serving \`${this.logger.cyan(key)}\`...`);
      this._.set(key, f);
    }
  }

  /**
   * @private
   * @description Queue operations and handle only once.
   */
  flush() {
    if (!this.queuedFlush) {
      this.queuedFlush = true;
      setImmediate(async () => {
        this.queuedFlush = false;
        await this.handle();
        this.buildServerRoutes(
          this.site["assets"]
            .concat(this.site["posts"])
            .concat(this.site["pages"])
            .concat(this.site["files"])
        );
      });
    }
  }

  /**
   * @private
   * @description Watch all src files.
   */
  watchAll() {
    if (this.watcher == null) {
      return;
    }
    this.watcher.register(
      [
        this.site["siteConfig"]["themeSrcDir"],
        this.site["siteConfig"]["srcDir"]
      ],
      async (srcDir, srcPaths) => {
        const {added, changed, removed} = srcPaths;
        for (const srcPath of removed) {
          const file = new File(
            this.site["siteConfig"]["docDir"], srcDir, srcPath
          );
          for (const key of Site.arrayKeys) {
            delSite(this.site, key, file);
          }
        }
        await Promise.all(added.concat(changed).map((srcPath) => {
          const newFile = new File(
            this.site["siteConfig"]["docDir"], srcDir, srcPath
          );
          return this.loadFile(newFile);
        }));
        this.flush();
      }
    );
  }

  /**
   * @private
   * @description Unwatch all src files.
   */
  unwatchAll() {
    if (this.watcher == null) {
      return;
    }
    this.watcher.unregister([
      this.site["siteConfig"]["themeSrcDir"],
      this.site["siteConfig"]["srcDir"]
    ]);
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
    // Use custom 404 file if available.
    const real404File = this._.get(this.getPath("404.html")) || new File({
      "content": default404,
      "docPath": this.getPath("404.html")
    });
    this.server = http.createServer(async (request, response) => {
      // Remove query string.
      const pathname = request["url"].split(/[?#]/)[0];
      const code = this._.has(pathname) ? 200 : 404;
      const file = this._.get(pathname) || real404File;
      this.logger.log(`${
        code === 200 ? this.logger.blue(code) : this.logger.yellow(code)
      } ${this.logger.cyan(pathname)}`);
      response.writeHead(code, {
        "Content-Type": getContentType(file["docPath"])
      });
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
    this.logger.log(`Hikaru is starting to listen on \`${
      this.logger.cyan(`http://${this.ip}:${this.port}${this.getPath()}`)
    }\`...`);
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
      this.logger.log(`Hikaru is stopping to listen on \`${
        this.logger.cyan(`http://${this.ip}:${this.port}${this.getPath()}`)
      }\`...`);
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
