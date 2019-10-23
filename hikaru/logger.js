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
   * @param {Boolean} isDebug
   * @param {Object} [opts] Optional arguments for `console.Console`.
   * @param {Object} [opts.stdout=process.stdout]
   * @param {Object} [opts.stderr=process.stderr]
   * @return {BotLogger}
   */
  constructor(isDebug, opts = {
    'stdout': process.stdout,
    'stderr': process.stderr
  }) {
    super(opts['stdout'], opts['stderr'])
    this.isDebug = isDebug
  }

  /**
   * @param {String} str
   * @return {String}
   */
  blue(str) {
    return `\x1b[34m${str}\x1b[0m`
  }

  /**
   * @param {String} str
   * @return {String}
   */
  green(str) {
    return `\x1b[32m${str}\x1b[0m`
  }

  /**
   * @param {String} str
   * @return {String}
   */
  yellow(str) {
    return `\x1b[33m${str}\x1b[0m`
  }

  /**
   * @param {String} str
   * @return {String}
   */
  red(str) {
    return `\x1b[31m${str}\x1b[0m`
  }

  /**
   * @param {String} str
   * @return {String}
   */
  cyan(str) {
    return `\x1b[36m${str}\x1b[0m`
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
    if (this.isDebug) {
      // Node.js 8 does not support `console.debug`.
      if (isFunction(super.debug)) {
        return super.debug(this.green('DEBUG:'), ...strs)
      } else {
        return super.log(this.green('DEBUG:'), ...strs)
      }
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
