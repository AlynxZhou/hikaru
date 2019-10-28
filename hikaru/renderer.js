'use strict'

/**
 * @module renderer
 */

const path = require('path')
const {File} = require('./types')
const {inside, isFunction} = require('./utils')

/**
 * @description File renderer.
 */
class Renderer {
  /**
   * @param {Logger} logger
   * @param {String[]} [skipRenderList] File that won't be rendered.
   * @return {Renderer}
   */
  constructor(logger, skipRenderList = []) {
    this.logger = logger
    this._ = {}
    this.skipRenderList = skipRenderList
  }

  /**
   * @callback renderCallback
   * @param {File} input
   * @return {File}
   */
  /**
   * @description Register a renderer function.
   * @param {String} srcExt Source file's extend name starts with `.`.
   * @param {String} [docExt=null] Doc file's extend name starts with `.`.
   * @param {renderCallback} fn
   */
  register(srcExt, docExt, fn) {
    if (isFunction(docExt) && fn == null) {
      fn = docExt
      docExt = null
    } else if (!isFunction(fn)) {
      throw new TypeError('fn must be a Function')
    }
    if (this._[srcExt] == null) {
      this._[srcExt] = []
    }
    this._[srcExt].push({srcExt, docExt, fn})
  }

  /**
   * @description Render file with renderer function.
   * @param {File} input
   * @return {Promise<File>} Rendered file.
   */
  render(input) {
    const srcExt = path.extname(input['srcPath'])
    const results = []
    if (
      this._[srcExt] != null &&
      !inside(this.skipRenderList, input['srcPath'])
    ) {
      for (const handler of this._[srcExt]) {
        const output = new File(input)
        const docExt = handler['docExt']
        if (docExt != null) {
          const dirname = path.dirname(output['srcPath'])
          const basename = path.basename(output['srcPath'], srcExt)
          output['docPath'] = path.join(dirname, `${basename}${docExt}`)
          this.logger.debug(`Hikaru is rendering \`${
            this.logger.cyan(output['srcPath'])
          }\` to \`${
            this.logger.cyan(output['docPath'])
          }\`...`)
        } else {
          output['docPath'] = output['srcPath']
          this.logger.debug(`Hikaru is rendering \`${
            this.logger.cyan(output['srcPath'])
          }\`...`)
        }
        results.push(handler['fn'](output))
      }
    } else {
      const output = new File(input)
      output['docPath'] = output['srcPath']
      this.logger.debug(`Hikaru is rendering \`${
        this.logger.cyan(output['srcPath'])
      }\`...`)
      output['content'] = output['raw']
      results.push(output)
    }
    return results
  }
}

module.exports = Renderer
