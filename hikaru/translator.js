'use strict'

/**
 * @module Translator
 */

const {format} = require('util')
const {isObject, isArray, isString} = require('./utils')

/**
 * @description String translator.
 */

class Translator {
  /**
   * @param {Logger} logger
   * @return {Translator}
   */
  constructor(logger) {
    this.logger = logger
    this._ = {}
  }

  /**
   * @description Register a kind of language.
   * @param {(String|String[])} lang Language names.
   * @param {Object} obj Language dict from yaml file.
   */
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

  /**
   * @description List registered language.
   * @return {String[]}
   */
  list() {
    return Object.keys(this._)
  }

  /**
   * @callback translate
   * @description `printf()` like translator function.
   * @param {String} key A string for a key in language dict.
   * @param {...*} args Args to be formatted.
   * @return {String}
   */
  /**
   * @description Get a translator function for given language.
   * @param {String} lang Registered language.
   * @return {translate}
   */
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
          // If not found, return original parameter.
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
