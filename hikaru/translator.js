'use strict'

const {format} = require('util')
const {isObject, isArray, isString} = require('./utils')

class Translator {
  constructor(logger) {
    this.logger = logger
    this._ = {}
  }

  register(lang, obj) {
    if (!isObject(obj)) {
      throw new TypeError(
        'obj must be a Object generated from yaml language file'
      )
    }
    if (isArray(lang)) {
      for (const l in lang) {
        this._[l] = obj
      }
    } else {
      this._[lang] = obj
    }
  }

  list() {
    return Object.keys(this._)
  }

  getTranslateFn(lang) {
    return (key, ...args) => {
      const keys = key.toString().trim().split('.')
      let res = this._[lang]
      if (res == null) {
        this.logger.info(`Hikaru cannot find language \`${
          this.logger.blue(lang)
        }\`, using default.`)
        res = this._['default']
      }
      for (const k of keys) {
        if (res[k] == null) {
          // If not found, return original string.
          res = key
          break
        }
        res = res[k]
      }
      if (!isString(res)) {
        res = key
      }
      if (args.length > 0) {
        return format(res, ...args)
      }
      return res
    }
  }
}

module.exports = Translator
