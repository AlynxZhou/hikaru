"use strict";

/**
 * @module translator
 */

const {format} = require("util");
const {isObject, isArray, isString} = require("./utils");

/**
 * @description String translator.
 */

class Translator {
  /**
   * @param {Logger} logger
   * @return {Translator}
   */
  constructor(logger) {
    this.logger = logger;
    this._ = new Map();
  }

  /**
   * @description Register a kind of language.
   * @param {(String|String[])} lang Language names.
   * @param {Object} obj Language dict from yaml file.
   */
  register(lang, obj) {
    if (!isObject(obj)) {
      throw new TypeError(
        "obj must be a Object generated from yaml language file"
      );
    }
    if (isArray(lang)) {
      for (const l of lang) {
        this._.set(l, obj);
      }
    } else {
      this._.set(lang, obj);
    }
  }

  /**
   * @description Unregister a kind of language.
   * @param {(String|String[])} lang Language names.
   */
  unregister(lang) {
    if (isArray(lang)) {
      for (const l of lang) {
        this._.delete(l);
      }
    } else {
      this._.delete(lang);
    }
  }

  /**
   * @description List registered language.
   * @return {String[]}
   */
  list() {
    return [...this._.keys()];
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
      const keys = key.toString().trim().split(".");
      let res = this._.get(lang);
      if (res == null) {
        this.logger.info(`Hikaru cannot find language \`${
          this.logger.blue(lang)
        }\`, using default.`);
        res = this._.get("default");
      }
      for (const k of keys) {
        if (res[k] == null) {
          // If not found, return original parameter.
          res = key;
          break;
        }
        res = res[k];
      }
      if (!isString(res)) {
        res = key;
      }
      if (args.length > 0) {
        return format(res, ...args);
      }
      return res;
    };
  }
}

module.exports = Translator;
