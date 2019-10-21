'use strict'

const {isArray, isFunction} = require('./utils')

class Generator {
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

  async generate(site) {
    let results = []
    for (const {name, fn} of this._) {
      this.logger.debug(`Hikaru is generating \`${
        this.logger.blue(name)
      }\`...`)
      const res = await fn(site)
      if (res == null) {
        continue
      }
      if (!isArray(res)) {
        results.push(res)
      } else {
        results = results.concat(res)
      }
    }
    return results
  }
}

module.exports = Generator
