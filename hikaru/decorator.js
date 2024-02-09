/**
 * @module decorator
 */

import {File} from "./types.js";
import {isString, checkType, getFullDocPath} from "./utils.js";

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
   * @param {Object} [ctx=null] Custom context if you want to pass something to
   * this decorator. This is deprecated and you should use helper function with
   * layout filter.
   */
  register(layout, fn, ctx = null) {
    checkType(layout, "layout", "String");
    checkType(fn, "fn", ["Function", "String"]);
    if (ctx != null) {
      this.logger.warn("Hikaru suggests you to pass context for specific layouts by using helper function with layout filter because passing context while registering decorator function is deprecated!");
    }
    this._.set(layout, {layout, fn, ctx});
  }

  /**
   * @description Unregister a decorate function.
   * @param {String} layout
   */
  unregister(layout) {
    checkType(layout, "layout", "String");
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
        throw new Error(`Decorator for \`${layout}\` is not registered.`);
      }
      if (isString(handler["fn"])) {
        const fn = await this.compiler.compile(handler["fn"]);
        return fn(new File(file, handler["ctx"], ctx));
      }
      return handler["fn"](new File(file, handler["ctx"], ctx));
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
