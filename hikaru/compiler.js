"use strict";

/**
 * @module compiler
 */

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
   * @description Typically you should configure your templating engines to load
   * template from your theme's layout dir.
   * @param {String} srcPath File path relative to your theme's layout dir.
   * @param {String} [content] If this is null, you need to compile file.
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
   * @param {String} srcPath
   * @param {String} [content]
   * @return {Function}
   */
  async compile(srcPath, content) {
    const ext = path.extname(srcPath);
    if (!this._.has(ext)) {
      throw new Error(`No avaliable compiler for ${ext}`);
    }
    const handler = this._.get(ext);
    return handler["fn"](srcPath, content);
  }
}

module.exports = Compiler;
