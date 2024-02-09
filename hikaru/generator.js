/**
 * @module generator
 */

import {isArray, checkType} from "./utils.js";

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
    // Using Array because they need to be called in sequence, so user's custom
    // handlers will be called after internal handlers.
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
    checkType(name, "name", "String");
    checkType(fn, "fn", "Function");
    this._.push({name, fn});
  }

  /**
   * @description Generator files for site.
   * @param {Site} site
   * @return {Promise<File[]>} Generated files.
   */
  async generate(site) {
    const all = await Promise.all(this._.map(({name, fn}) => {
      this.logger.debug(`Hikaru is generating \`${
        this.logger.blue(name)
      }\`...`);
      return fn(site);
    }));
    return all.filter((cur) => {
      return cur != null;
    }).map((cur) => {
      return isArray(cur) ? cur : [cur];
    }).reduce((acc, cur, idx, src) => {
      return acc.concat(cur);
    }, []);
  }
}

export default Generator;
