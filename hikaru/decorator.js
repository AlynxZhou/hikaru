'use strict'

/**
 * @module decorator
 */

const path = require('path')
const {File} = require('./types')
const {inside, isFunction} = require('./utils')

/**
 * @description Layout decorator.
 */
class Decorator {
	/**
	 * @param {Logger}
	 * @return {Decorator}
   */
	constructor(logger) {
		this.logger = logger
		this._ = {}
	}

	/**
	 * @callback decorateCallback
	 * @param {Object} ctx
	 * @return {String}
	 */
	/**
	 * @description Register a decorate function.
	 * @param {String} layout
	 * @param {decorateCallback} fn
	 */
	register(layout, fn) {
		if (!isFunction(fn)) {
      throw new TypeError('fn must be a Function')
    }
		this._[layout] = {layout, fn}
	}

	/**
	 * @description Decorate input file with layout.
	 * @param {File} file
	 * @return {String}
	 */
	decorate(file, ctx) {
		const layout = this.getFileLayout(file)
		if (layout != null) {
			this.logger.debug(`Hikaru is decorating \`${
	      this.logger.cyan(path.join(file['docDir'], file['docPath']))
	    }\` with layout \`${
				this.logger.blue(layout)
			}\`...`)
			const handler = this._[layout]
			return handler['fn'](Object.assign(new File(), file, ctx))
		} else {
			// this.logger.debug(`Hikaru is decorating \`${
	    //   this.logger.cyan(path.join(file['docDir'], file['docPath']))
	    // }\`...`)
			return file['content']
		}
	}

	/**
   * @description List registered layout.
   * @return {String[]}
   */
  list() {
		return Object.keys(this._)
	}

	/**
	 * @private
	 * @description Get simpified layout for file.
	 * @param {File} file
	 * @param {String[]} available If not in available, fallback to `page`.
	 * @return {String}
	 */
	getFileLayout(file) {
	  if (file['layout'] == null) {
	    return null
	  }
	  if (!inside(this.list(), file['layout'])) {
	    return 'page'
	  }
	  return file['layout']
	}
}

module.exports = Decorator
