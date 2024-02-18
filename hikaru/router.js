/**
 * @module router
 */

import fse from "fs-extra";

import * as http from "node:http";
import {Site, File} from "./types.js";
import {
  isBinaryPath,
  default404,
  matchFiles,
  getPathFn,
  getContentType,
  putSite,
  delSite,
  getFullSrcPath,
  getFullDocPath,
  parseFrontMatter
} from "./utils.js";

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
   * @param {Helper} helper
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
    helper,
    translator,
    site,
    watcher = null
  ) {
    this.logger = logger;
    this.renderer = renderer;
    this.processor = processor;
    this.generator = generator;
    this.decorator = decorator;
    this.helper = helper;
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
  }

  /**
   * @private
   * @description Get decorated content with context.
   * @param {File} file
   * @return {Promise<String>}
   */
  async getDecoratedContent(file) {
    // Running helper and decorator for file without layout is meaningless,
    // because layout is used for decorator to select template.
    if (!file["binary"] && file["layout"] != null) {
      return this.decorator.decorate(
        file, await this.helper.getContext(this.site, file)
      );
    }
    return file["content"];
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
   * @param {(Buffer|String)} content This is for decorated content, if the file
   * is not decorated, leave this empty and file's content property is used.
   */
  write(file, content) {
    return file["binary"]
      ? fse.copy(getFullSrcPath(file), getFullDocPath(file))
      : fse.outputFile(getFullDocPath(file), content || file["content"]);
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
    // Binary files are not supposed to be handled by SSGs. We can copy or pipe
    // it to save memory.
    file["binary"] = isBinaryPath(getFullSrcPath(file));
    if (!file["binary"]) {
      file["raw"] = await this.read(getFullSrcPath(file));
      file["text"] = file["raw"].toString("utf8");
      file = parseFrontMatter(file);
    }
    const results = await this.renderer.render(file);
    for (const result of results) {
      if (result["layout"] === "post") {
        putSite(this.site, "posts", result);
      } else if (result["layout"] != null) {
        putSite(this.site, "pages", result);
      } else {
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
    const content = await this.getDecoratedContent(file);
    this.logger.debug(`Hikaru is writing \`${
      this.logger.cyan(getFullDocPath(file))
    }\`...`);
    this.write(file, content);
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
      return new File({
        "docDir": this.site["siteConfig"]["docDir"],
        "srcDir": this.site["siteConfig"]["themeSrcDir"],
        "srcPath": srcPath
      });
    }).concat((await matchFiles("**/*", {
      "ignoreHidden": false,
      "workDir": this.site["siteConfig"]["srcDir"]
    })).map((srcPath) => {
      return new File({
        "docDir": this.site["siteConfig"]["docDir"],
        "srcDir": this.site["siteConfig"]["srcDir"],
        "srcPath": srcPath
      });
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
          const file = new File({
            "docDir": this.site["siteConfig"]["docDir"],
            "srcDir": srcDir,
            "srcPath": srcPath
          });
          for (const key of Site.arrayKeys) {
            delSite(this.site, key, file);
          }
        }
        await Promise.all(added.concat(changed).map((srcPath) => {
          const newFile = new File({
            "docDir": this.site["siteConfig"]["docDir"],
            "srcDir": srcDir,
            "srcPath": srcPath
          });
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
    this.server = http.createServer(async (request, response) => {
      // Remove query string.
      const pathname = request["url"].split(/[?#]/)[0];
      const code = this._.has(pathname) ? 200 : 404;
      // Use custom 404 file if available.
      const real404File = this._.get(this.getPath("404.html")) || new File({
        "docDir": "docs",
        "docPath": this.getPath("404.html"),
        "content": default404
      });
      const file = this._.get(pathname) || real404File;
      this.logger.log(`${
        code === 200 ? this.logger.blue(code) : this.logger.yellow(code)
      } ${this.logger.cyan(pathname)}`);
      response.writeHead(code, {
        "Content-Type": getContentType(file["docPath"])
      });
      if (!file["binary"]) {
        const content = await this.getDecoratedContent(file);
        this.logger.debug(
          `Hikaru is sending \`${this.logger.cyan(getFullDocPath(file))}\`...`
        );
        response.write(content);
        response.end();
      } else {
        // Pipe a binary instead of send.
        this.logger.debug(
          `Hikaru is piping \`${this.logger.cyan(getFullDocPath(file))}\`...`
        );
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

export default Router;
