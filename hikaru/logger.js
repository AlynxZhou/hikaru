'use strict'

const {isFunction} = require('./utils')

class Logger extends console.Console {
  constructor(isDebug, opts = {
    'stdout': process.stdout,
    'stderr': process.stderr
  }) {
    super(opts['stdout'], opts['stderr'])
    this.isDebug = isDebug
  }

  blue(str) {
    return `\x1b[34m${str}\x1b[0m`
  }

  green(str) {
    return `\x1b[32m${str}\x1b[0m`
  }

  yellow(str) {
    return `\x1b[33m${str}\x1b[0m`
  }

  red(str) {
    return `\x1b[31m${str}\x1b[0m`
  }

  cyan(str) {
    return `\x1b[36m${str}\x1b[0m`
  }

  log(...strs) {
    super.log('LOG:', ...strs)
  }

  info(...strs) {
    super.info(this.blue('INFO:'), ...strs)
  }

  debug(...strs) {
    if (this.isDebug) {
      // Node.js 8 does not support `console.debug`.
      if (isFunction(super.debug)) {
        super.debug(this.green('DEBUG:'), ...strs)
      } else {
        super.log(this.green('DEBUG:'), ...strs)
      }
    }
  }

  warn(...strs) {
    super.warn(this.yellow('WARN:'), ...strs)
  }

  error(...strs) {
    super.error(this.red('ERROR:'), ...strs)
  }
}

module.exports = Logger
