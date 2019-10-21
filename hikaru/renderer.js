'use strict'

const path = require('path')
const {File} = require('./types')
const {inside, isFunction} = require('./utils')

class Renderer {
  constructor(logger, skipRenderList = []) {
    this.logger = logger
    this._ = {}
    this.skipRenderList = skipRenderList
  }

  register(srcExt, docExt, fn) {
    if (!isFunction(fn)) {
      throw new TypeError('fn must be a Function')
    }
    if (this._[srcExt] == null) {
      this._[srcExt] = []
    }
    this._[srcExt].push({srcExt, docExt, fn})
  }

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
