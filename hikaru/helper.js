/**
 * @module helper
 */

import {isObject, checkType, getFullDocPath} from "./utils.js";

/**
 * @description Context helper.
 * This is used to register properties to context of all decorated files, if you
 * only need to register properties to context of a specific layout, you could
 * do that while registering decorator.
 */
class Helper {
  /**
   * @param {Logger} logger
   * @return {Helper}
   */
  constructor(logger) {
    this.logger = logger;
    // Using Array because they need to be called in sequence, so user's custom
    // handlers will be called after internal handlers.
    this._ = [];
  }

  /**
   * @callback helpCallback
   * @description The returned object will be merged with context while
   * decorating with templates.
   * @param {Site} site
   * @param {File} file
   * @return {Object}
   */
  /**
   * @description Register a helper function.
   * @param {String} name
   * @param {helpCallback} fn
   * @param {String} [layout=null] If you want to run this helper
   * function on a specific layout, pass it here as a filter.
   */
  register(name, fn, layout = null) {
    checkType(name, "name", "String");
    checkType(fn, "fn", "Function");
    checkType(layout, "layout", "String", "null");
    this._.push({name, fn, layout});
  }

  /**
   * @description Run all helper functions and gather context.
   * @param {Site} site
   * @param {File} file
   * @return {Promise<Object>}
   */
  async getContext(site, file) {
    // Decorator uses layout to select template, so files without layout cannot
    // be decorated and have no context.
    if (file["layout"] == null) {
      return {};
    }
    const all = await Promise.all(this._.filter(({name, fn, layout}) => {
      return layout == null || layout === file["layout"];
    }).map(({name, fn, layout}) => {
      this.logger.debug(`Hikaru is running helper of \`${
        this.logger.blue(name)
      }\` for \`${
        this.logger.cyan(getFullDocPath(file))
      }\`...`);
      return fn(site, file);
    }));
    return all.filter((cur) => {
      return cur != null && isObject(cur);
    }).reduce((acc, cur, idx, src) => {
      return Object.assign(acc, cur);
    }, {});
  }
}

export default Helper;
