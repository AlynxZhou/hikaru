/**
 * @module translator
 */

import {format} from "node:util";
import {isString, checkType} from "./utils.js";

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
   * @param {String} lang Language name.
   * @param {Object} obj Language dict from yaml file.
   */
  register(lang, obj) {
    checkType(lang, "lang", "String");
    checkType(obj, "obj", "Object");
    this._.set(lang, obj);
  }

  /**
   * @description Unregister a kind of language.
   * @param {String} lang Language name.
   */
  unregister(lang) {
    checkType(lang, "lang", "String");
    this._.delete(lang);
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

export default Translator;
