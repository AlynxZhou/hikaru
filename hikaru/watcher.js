/**
 * @module watcher
 */

import * as path from "node:path";

import chokidar from "chokidar";
import picomatch from "picomatch";

import {isString, isArray, checkType} from "./utils.js";

/**
 * @description File watcher with dependency handling.
 */
class Watcher {
  /**
   * @param {Logger} logger
   * @param {Object} rawFileDependencies File depenency tree.
   * @return {Watcher}
   */
  constructor(logger, rawFileDependencies) {
    this.logger = logger;
    this._ = new Map();
    this.fileDependencies = null;
    // We cache compiled globs here
    // so we don't need to recompile them again and again.
    this.dependencyMatchers = null;
    this.updateFileDependencies(rawFileDependencies);
    this.queue = [];
    this.handling = false;
  }

  /**
   * @private
   * @description Parse and reverse dependency tree for faster look up.
   * @param {Object} rawFileDependencies File depenency tree.
   * @return {Map} Reversed file dependency tree.
   */
  reverseFileDependencies(rawFileDependencies) {
    // Let's reverse dependency tree for fast look up.
    const fileDependencies = new Map();
    for (const srcDir in rawFileDependencies) {
      fileDependencies.set(srcDir, new Map());
      for (const k in rawFileDependencies[srcDir]) {
        for (const v of rawFileDependencies[srcDir][k]) {
          if (!fileDependencies.get(srcDir).has(v)) {
            fileDependencies.get(srcDir).set(v, new Set());
          }
          fileDependencies.get(srcDir).get(v).add(k);
        }
      }
    }
    return fileDependencies;
  }

  /**
   * @private
   * @description Compile globs in dependency tree.
   * @return {Map} Key is glob pattern string, value is compiled function.
   */
  compileDependencyMatchers() {
    const dependencyMatchers = new Map();
    for (const srcDir of this.fileDependencies.keys()) {
      for (const dep of this.fileDependencies.get(srcDir).keys()) {
        // There is no need to use `isGlob`, just let picomatch handle paths.
        if (!dependencyMatchers.has(dep)) {
          dependencyMatchers.set(dep, picomatch(dep));
        }
      }
    }
    return dependencyMatchers;
  }

  /**
   * @description Update file dependencies.
   * @param {Object} rawFileDependencies File depenency tree.
   */
  updateFileDependencies(rawFileDependencies) {
    this.fileDependencies = this.reverseFileDependencies(rawFileDependencies);
    this.dependencyMatchers = this.compileDependencyMatchers();
  }

  /**
   * @callback watchCallback
   * @description On each time a file added/changed/removed, itself will be
   * emitted, and after that, an array of dependency files are also emitted as
   * changed, this keeps related files get latest dependency.
   * @param {String} srcDir
   * @param {Object} srcPaths
   * @param {String[]} [srcPaths.added] Added files.
   * @param {String[]} [srcPaths.changed] Changed files.
   * @param {String[]} [srcPaths.removed] Removed files.
   */
  /**
   * @description Register handler for dirs.
   * @param {(String|String[])} dirs Dirs to watch.
   * @param {watchCallback} fn
   * @param {Object} [opts] Optional watch parameters. Please notice that
   * if you register a dir twice with different opts, the latter will replace
   * the former.
   * @param {Boolean} [opts.recursive=true] Whether watch files in subdirs.
   * @param {Boolean} [opts.customGlob] Custom glob pass to chokidar.
   */
  register(dirs, fn, opts = {}) {
    if (dirs == null) {
      return;
    }
    if (fn == null) {
      return;
    }
    checkType(dirs, "dirs", "Array", "String");
    checkType(fn, "fn", "Function");
    if (!isArray(dirs) && isString(dirs)) {
      dirs = [dirs];
    }
    if (opts["recursive"] !== false) {
      opts["recursive"] = true;
    }
    // Globs must not contain windows spearators.
    //
    // If we use `**/*` here as recursive glob, we will trigger a chokidar bug,
    // that we cannot get `unlink` event but only `add` event while moving dirs.
    // Because we only support watching all files, and this is the default
    // behavior when chokidar watches a dir, so we can use `./` as a workaround.
    //
    // See <https://github.com/paulmillr/chokidar/issues/1285>.
    const defaultGlob = opts["recursive"] ? "./" : "./*";
    const glob = opts["customGlob"] || defaultGlob;
    for (const srcDir of dirs) {
      if (this._.has(srcDir)) {
        const handler = this._.get(srcDir);
        handler["fns"].add(fn);
        // Always update glob.
        if (handler["glob"] !== glob && handler["watcher"] != null) {
          handler["watcher"].unwatch(handler["glob"]);
          handler["watcher"].add(glob);
          handler["glob"] = glob;
        }
        continue;
      }
      const handler = {glob, "watcher": null, "fns": new Set()};
      handler["fns"].add(fn);
      this._.set(srcDir, handler);
      const watcher = chokidar.watch(
        // See <https://github.com/paulmillr/chokidar/issues/464>.
        glob, {"cwd": path.resolve(srcDir), "ignoreInitial": true}
      );
      this._.get(srcDir)["watcher"] = watcher;
      for (const event of ["add", "change", "unlink"]) {
        watcher.on(event, (srcPath) => {
          this.logger.debug(
            `Hikaru is handling event \`${
              this.logger.blue(event)
            }\` from \`${
              this.logger.cyan(path.join(srcDir, srcPath))
            }\`...`
          );
          const i = this.queue.findIndex((p) => {
            return p["srcDir"] === srcDir && p["srcPath"] === srcPath;
          });
          if (i !== -1) {
            // We have a pending event for this file, just replace it.
            this.queue[i]["type"] = event;
          } else {
            this.queue.push({event, srcDir, srcPath});
          }
          setImmediate(this.handleEvents.bind(this));
        });
      }
    }
  }

  /**
   * @private
   * @description Look up dependency tree recursively to collect all affected
   * files.
   * @return {Set}
   */
  getDependencies(srcDir, srcPath, checkedPaths = new Set()) {
    const res = new Set();
    if (this.fileDependencies.has(srcDir)) {
      for (const dep of this.fileDependencies.get(srcDir).keys()) {
        // Check exact match first to save time. All deps are compiled so it is
        // safe to get matchers without checking.
        if (srcPath === dep || this.dependencyMatchers.get(dep)(srcPath)) {
          checkedPaths.add(srcPath);
          const subset = this.fileDependencies.get(srcDir).get(dep);
          for (const e of subset) {
            res.add(e);
          }
        }
      }
    }
    for (const p of res) {
      // Break circular dependencies here.
      if (checkedPaths.has(p)) {
        continue;
      }
      // I'm not good at handling recursive functions,
      // but this time it's different! I did a good job!
      const subres = this.getDependencies(srcDir, p, checkedPaths);
      for (const e of subres) {
        res.add(e);
      }
    }
    return res;
  }

  /**
   * @private
   */
  handleEvents() {
    if (this.queue.length === 0 || this.handling) {
      return;
    }
    this.handling = true;
    // Don't merge different events' files here, some maybe conflict,
    // e.g. A is changed and then removed.
    let e;
    while ((e = this.queue.shift()) != null) {
      if (!this._.has(e["srcDir"])) {
        continue;
      }
      const srcPaths = {"added": [], "changed": [], "removed": []};
      if (e["event"] === "add") {
        srcPaths["added"].push(e["srcPath"]);
      } else if (e["event"] === "unlink") {
        srcPaths["removed"].push(e["srcPath"]);
      } else {
        srcPaths["changed"].push(e["srcPath"]);
      }
      // Call changed on all dependencies.
      const set = this.getDependencies(e["srcDir"], e["srcPath"]);
      // Break potential circular dependencies.
      set.delete(e["srcPath"]);
      srcPaths["changed"].push(...set);
      for (const fn of this._.get(e["srcDir"])["fns"]) {
        fn(e["srcDir"], srcPaths);
      }
    }
    this.handling = false;
  }

  /**
   * @description Unregister dirs.
   * @param {(String|String[])} dirs Dirs to stop watching.
   */
  unregister(dirs) {
    if (dirs == null) {
      return;
    }
    checkType(dirs, "dirs", "Array", "String");
    if (!isArray(dirs) && isString(dirs)) {
      dirs = [dirs];
    }
    for (const srcDir of dirs) {
      if (!this._.has(srcDir)) {
        continue;
      }
      if (this._.get(srcDir)["watcher"] != null) {
        this._.get(srcDir)["watcher"].close();
      }
      this._.delete(srcDir);
    }
  }

  /**
   * @description Unregister all dirs.
   */
  close() {
    this.unregister([...this._.keys()]);
  }
}

export default Watcher;
