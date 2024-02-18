/**
 * @module renderer
 */

import * as path from "node:path";

import {File} from "./types.js";
import {
  isFunction,
  checkType,
  getFullSrcPath,
  getFullDocPath
} from "./utils.js";

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
    this.logger = logger;
    this._ = new Map();
    this.skipRenderSet = new Set(skipRenderList);
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
      // This renderer does not change extname.
      fn = docExt;
      docExt = srcExt;
    }
    checkType(srcExt, "srcExt", "String");
    checkType(docExt, "docExt", "String");
    checkType(fn, "fn", "Function");
    if (!this._.has(srcExt)) {
      this._.set(srcExt, new Map());
    }
    // Use another Map for docExt, so renderer for the same src and doc in
    // plugin can replace internal renderer.
    this._.get(srcExt).set(docExt, {srcExt, docExt, fn});
  }

  /**
   * @description Render file with renderer function.
   * @param {File} input
   * @return {Promise<File[]>} Promise of rendered files.
   */
  render(input) {
    const srcExt = path.extname(input["srcPath"]);
    // It might be OK to allow renderer for binary file, but why?
    // It has no `raw`, `text` and why you want to handle binary with a SSG?
    // So better to just skip binary here.
    if (
      this._.has(srcExt) && !input["binary"] &&
      !this.skipRenderSet.has(input["srcPath"])
    ) {
      return Promise.all([...this._.get(srcExt).values()].map((handler) => {
        const output = new File(input);
        const docExt = handler["docExt"];
        if (docExt !== srcExt) {
          const dirname = path.dirname(output["srcPath"]);
          const basename = path.basename(output["srcPath"], srcExt);
          output["docPath"] = path.join(dirname, `${basename}${docExt}`);
          this.logger.debug(`Hikaru is rendering \`${
            this.logger.cyan(getFullSrcPath(output))
          }\` to \`${
            this.logger.cyan(getFullDocPath(output))
          }\`...`);
        } else {
          output["docPath"] = output["srcPath"];
          this.logger.debug(`Hikaru is rendering \`${
            this.logger.cyan(getFullDocPath(output))
          }\`...`);
        }
        return handler["fn"](output);
      }));
    }
    const output = new File(input);
    output["docPath"] = output["srcPath"];
    // For binary files, this is useless, but we have to keep this line for
    // other text files without renderer.
    output["content"] = output["text"];
    return [output];
  }
}

export default Renderer;
