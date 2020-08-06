"use strict";

/**
 * @module decorator
 */

const path = require("path");
const {File} = require("./types");
const {isFunction, isString} = require("./utils");

/**
 * @description Layout decorator.
 */
class Decorator {
  /**
   * @param {Logger} logger
   * @param {Compiler} compiler
   * @return {Decorator}
   */
  constructor(logger, compiler) {
    this.logger = logger;
    this.compiler = compiler;
    this._ = {};
  }

  /**
   * @callback decorateCallback
   * @param {Object} ctx
   * @return {String}
   */
  /**
   * @description Register a decorate function.
   * @param {String} layout
   * @param {decorateCallback|String} fn If string,
   * will call Compiler while decorating.
   */
  register(layout, fn) {
    if (!(isFunction(fn) || isString(fn))) {
      throw new TypeError("fn must be a Function or filepath");
    }
    this._[layout] = {layout, fn};
  }

  /**
   * @description Decorate input file with layout.
   * @param {File} file
   * @return {String}
   */
  async decorate(file, ctx) {
    const layout = this.getFileLayout(file);
    if (layout != null) {
      this.logger.debug(`Hikaru is decorating \`${
        this.logger.cyan(path.join(file["docDir"], file["docPath"]))
      }\` with layout \`${
        this.logger.blue(layout)
      }\`...`);
      const handler = this._[layout];
      if (handler == null) {
        throw new Error(`Decorator for \`${layout}\` is not registered!`);
      }
      if (isString(handler["fn"])) {
        const fn = await this.compiler.compile(handler["fn"]);
        return await fn(Object.assign(new File(), file, ctx));
      }
      return await handler["fn"](Object.assign(new File(), file, ctx));
    }
    return file["content"];
  }

  /**
   * @description List registered layout.
   * @return {String[]}
   */
  list() {
    return Object.keys(this._);
  }

  /**
   * @private
   * @description Get simpified layout for file.
   * @param {File} file
   * @param {String[]} available If not in available, fallback to `page`.
   * @return {String}
   */
  getFileLayout(file) {
    if (file["layout"] == null) {
      return null;
    }
    if (!this.list().includes(file["layout"])) {
      return "page";
    }
    return file["layout"];
  }
}

module.exports = Decorator;
