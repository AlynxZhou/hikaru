"use strict";

/**
 * @module generator
 */

const {isArray, isFunction} = require("./utils");

/**
 * @description File generator.
 */
class Generator {
  /**
   * @param {Logger} logger
   * @return {Generator}
   */
  constructor(logger) {
    this.logger = logger;
    this._ = [];
  }

  /**
   * @callback generateCallback
   * @param {Site} site
   * @return {(File|File[])}
   */
  /**
   * @description Register a generator function.
   * @param {String} name
   * @param {generateCallback} fn
   */
  register(name, fn) {
    if (!isFunction(fn)) {
      throw new TypeError("fn must be a Function");
    }
    this._.push({name, fn});
  }

  /**
   * @description Generator files for site.
   * @param {Site} site
   * @return {File[]} Generated files.
   */
  async generate(site) {
    let results = [];
    for (const {name, fn} of this._) {
      this.logger.debug(`Hikaru is generating \`${
        this.logger.blue(name)
      }\`...`);
      const res = await fn(site);
      if (res == null) {
        continue;
      }
      if (!isArray(res)) {
        results.push(res);
      } else {
        results = results.concat(res);
      }
    }
    return results;
  }
}

module.exports = Generator;
