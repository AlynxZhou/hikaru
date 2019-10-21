'use strict'

const {isFunction} = require('./utils')

class Processor {
  constructor(logger) {
    this.logger = logger
    this._ = []
  }

  register(name, fn) {
    if (!isFunction(fn)) {
      throw new TypeError('fn must be a Function')
    }
    this._.push({name, fn})
  }

  async process(site) {
    for (const {name, fn} of this._) {
      this.logger.debug(`Hikaru is processing \`${
        this.logger.blue(name)
      }\`...`)
      site = await fn(site)
    }
    return site
  }
}

module.exports = Processor
