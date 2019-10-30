'use strict'

/**
 * @module processor
 */

const {isFunction} = require('./utils')

/**
 * @description Site processor.
 */
class Processor {
  /**
   * @param {Logger} logger
   * @return {Processor}
   */
  constructor(logger) {
    this.logger = logger
    this._ = []
  }

  /**
   * @callback processCallback
   * @param {Site} site
   * @return {site}
   */
  /**
   * @description Register a processor function.
   * @param {String} name
   * @param {processCallback} fn
   */
  register(name, fn) {
    if (!isFunction(fn)) {
      throw new TypeError('fn must be a Function')
    }
    this._.push({name, fn})
  }

  /**
   * @description Process site.
   * @param {Site} site
   * @return {Promise<Site>} Processed site.
   */
  async process(site) {
    for (const {name, fn} of this._) {
      this.logger.debug(`Hikaru is processing \`${
        this.logger.blue(name)
      }\`...`)
      await fn(site)
    }
  }
}

module.exports = Processor
