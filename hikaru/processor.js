/**
 * @module processor
 */

import {checkType} from "./utils.js";

/**
 * @description Site processor.
 */
class Processor {
  /**
   * @param {Logger} logger
   * @return {Processor}
   */
  constructor(logger) {
    this.logger = logger;
    // Using Array because they need to be called in sequence, so user's custom
    // handlers will be called after internal handlers.
    this._ = [];
  }

  /**
   * @callback processCallback
   * @param {Site} site
   * @return {Site}
   */
  /**
   * @description Register a processor function.
   * @param {String} name
   * @param {processCallback} fn
   */
  register(name, fn) {
    checkType(name, "name", "String");
    checkType(fn, "fn", "Function");
    this._.push({name, fn});
  }

  /**
   * @description Process site.
   * @param {Site} site
   * @return {Promise}
   */
  process(site) {
    // Process maybe async.
    return Promise.all(this._.map(({name, fn}) => {
      this.logger.debug(`Hikaru is processing \`${
        this.logger.blue(name)
      }\`...`);
      return fn(site);
    }));
  }
}

export default Processor;
