"use strict";

/**
 * @module compiler
 */

const fse = require("fs-extra");
const path = require("path");
const {isFunction} = require("./utils");

/**
 * @description Template compiler.
 */
class Compiler {
  /**
   * @param {Logger} logger
   * @return {Compiler}
   */
  constructor(logger) {
    this.logger = logger;
    this._ = new Map();
  }

  /**
   * @callback compileCallback
   * @param {String} filepath
   * @param {String} content
   * @return {Function}
   */
  /**
   * @description Register a compile funtion.
   * @param {String} ext Template extname starts with `.`.
   * @param {compileCallback}
   */
  register(ext, fn) {
    if (!isFunction(fn)) {
      throw new TypeError("fn must be a Function");
    }
    this._.set(ext, {ext, fn});
  }

  /**
   * @description Compile template into function.
   * @param {String} filepath
   * @param {String} content
   * @return {Function}
   */
  async compile(filepath, content) {
    if (content == null) {
      content = await fse.readFile(filepath, "utf8");
    }
    const ext = path.extname(filepath);
    const handler = this._.get(ext);
    return handler["fn"](filepath, content);
  }
}

module.exports = Compiler;
