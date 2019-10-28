'use strict'

/**
 * @module Logger
 */

const {isFunction} = require('./utils')

/**
 * @description A Logger with colored output.
 * @extends console.Console
 */
class Logger extends console.Console {
  /**
   * @param {Object} [opts] Optional arguments for `console.Console`.
   * @param {Boolean} [opts.debug=false] Enable debug output.
   * @param {Boolean} [opts.color=true] Enable colored output.
   * @param {Object} [opts.stdout=process.stdout]
   * @param {Object} [opts.stderr=process.stderr]
   * @return {BotLogger}
   */
  constructor(opts = {}) {
    super(
      opts['stdout'] || process.stdout,
      opts['stderr'] || process.stderr
    )
    this.opts = {}
    this.opts['debug'] = opts['debug'] || false
    this.opts['color'] = opts['color'] == null ? true : opts['color']
  }

  /**
   * @param {String} str
   * @return {String}
   */
  blue(str) {
    if (this.opts['color']) {
      return `\x1b[34m${str}\x1b[0m`
    }
    return str
  }

  /**
   * @param {String} str
   * @return {String}
   */
  green(str) {
    if (this.opts['color']) {
      return `\x1b[32m${str}\x1b[0m`
    }
    return str
  }

  /**
   * @param {String} str
   * @return {String}
   */
  yellow(str) {
    if (this.opts['color']) {
      return `\x1b[33m${str}\x1b[0m`
    }
    return str
  }

  /**
   * @param {String} str
   * @return {String}
   */
  red(str) {
    if (this.opts['color']) {
      return `\x1b[31m${str}\x1b[0m`
    }
    return str
  }

  /**
   * @param {String} str
   * @return {String}
   */
  cyan(str) {
    if (this.opts['color']) {
      return `\x1b[36m${str}\x1b[0m`
    }
    return str
  }

  /**
   * @param {...*} strs
   */
  log(...strs) {
    return super.log('LOG:', ...strs)
  }

  /**
   * @param {...*} strs
   */
  info(...strs) {
    return super.info(this.blue('INFO:'), ...strs)
  }

  /**
   * @param {...*} strs
   */
  debug(...strs) {
    if (this.opts['debug']) {
      // Node.js 8 does not support `console.debug`.
      if (isFunction(super.debug)) {
        return super.debug(this.green('DEBUG:'), ...strs)
      }
      return super.log(this.green('DEBUG:'), ...strs)
    }
  }

  /**
   * @param {...*} strs
   */
  warn(...strs) {
    return super.warn(this.yellow('WARN:'), ...strs)
  }

  /**
   * @param {...*} strs
   */
  error(...strs) {
    return super.error(this.red('ERROR:'), ...strs)
  }
}

module.exports = Logger
