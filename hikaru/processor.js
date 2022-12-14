/**
 * @module processor
 */

import {isFunction} from "./utils.js";

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
    if (!isFunction(fn)) {
      throw new TypeError("fn must be a Function");
    }
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
