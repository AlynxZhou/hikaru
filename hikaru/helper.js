/**
 * @module helper
 */

import {isFunction, isObject, getFullDocPath} from "./utils.js";

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
   */
  register(name, fn) {
    if (!isFunction(fn)) {
      throw new TypeError("fn must be a Function");
    }
    this._.push({name, fn});
  }

  /**
   * @description Run all helper functions and gather context.
   * @param {Site} site
   * @param {File} file
   * @return {Promise<Object>}
   */
  async getContext(site, file) {
    const all = await Promise.all(this._.map(({name, fn}) => {
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
