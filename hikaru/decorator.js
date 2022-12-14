/**
 * @module decorator
 */

import {File} from "./types.js";
import {isFunction, isString, getFullDocPath} from "./utils.js";

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
    this._ = new Map();
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
   * @param {Object} ctx Custom context if you want to pass something
   * to this decorator.
   */
  register(layout, fn, ctx = {}) {
    if (!(isFunction(fn) || isString(fn))) {
      throw new TypeError("fn must be a Function or filepath");
    }
    this._.set(layout, {layout, fn, ctx});
  }

  /**
   * @description Unregister a decorate function.
   * @param {String} layout
   */
  unregister(layout) {
    this._.delete(layout);
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
        this.logger.cyan(getFullDocPath(file))
      }\` with layout \`${
        this.logger.blue(layout)
      }\`...`);
      const handler = this._.get(layout);
      if (handler == null) {
        throw new Error(`Decorator for \`${layout}\` is not registered!`);
      }
      if (isString(handler["fn"])) {
        const fn = await this.compiler.compile(handler["fn"]);
        return fn(Object.assign(new File(), file, ctx));
      }
      return handler["fn"](Object.assign(
        new File(), file, ctx, handler["ctx"]
      ));
    }
    return file["content"];
  }

  /**
   * @description List registered layout.
   * @return {String[]}
   */
  list() {
    return [...this._.keys()];
  }

  /**
   * @private
   * @description Get simpified layout for file.
   * @param {File} file
   * @return {String}
   */
  getFileLayout(file) {
    if (file["layout"] == null) {
      return null;
    }
    if (!this._.has(file["layout"])) {
      return "page";
    }
    return file["layout"];
  }
}

export default Decorator;
