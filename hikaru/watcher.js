"use strict";

/**
 * @module watcher
 */

const path = require("path");

const chokidar = require("chokidar");

const {isArray, isString} = require("./utils");

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
    this.fileDependencies = this.reverseFileDependencies(rawFileDependencies);
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
    // Let's revert dependency tree for fast look up.
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
   * @description Update file dependencies.
   * @param {Object} rawFileDependencies File depenency tree.
   */
  updateFileDependencies(rawFileDependencies) {
    this.fileDependencies = this.reverseFileDependencies(rawFileDependencies);
  }

  /**
   * @callback watchCallback
   * @param {String} srcDir
   * @param {String} srcPath
   */
  /**
   * @description Register handler for dirs.
   * @param {(String|String[])} dirs Dirs to watch.
   * @param {watchCallback} onAdded
   * @param {watchCallback} onChanged
   * @param {watchCallback} onRemoved
   * @param {Object} [opts] Optional watch parameters.
   * @param {Boolean} [opts.recursive=true] Whether watch files in subdirs.
   * @param {Boolean} [opts.customGlob] Custom glob pass to chokidar.
   */
  register(dirs, onAdded, onChanged, onRemoved, opts = {}) {
    if (dirs == null) {
      return;
    }
    if (!isArray(dirs) && isString(dirs)) {
      dirs = [dirs];
    }
    if (opts["recursive"] !== false) {
      opts["recursive"] = true;
    }
    for (const srcDir of dirs) {
      if (!this._.has(srcDir)) {
        this.unregister(srcDir);
      }
      this._.set(srcDir, {
        "watchers": [],
        "handlers": {onAdded, onChanged, onRemoved}
      });
      // Globs must not contain windows spearators.
      const glob = opts["recursive"] ? "**/*" : "*";
      const watcher = chokidar.watch(
        opts["customGlob"] || glob,
        {"cwd": srcDir, "ignoreInitial": true}
      );
      this._.get(srcDir)["watchers"].push(watcher);
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
  getDependencies(srcDir, srcPath) {
    const res = new Set();
    if (this.fileDependencies.has(srcDir) &&
      this.fileDependencies.get(srcDir).has(srcPath)) {
      const subset = this.fileDependencies.get(srcDir).get(srcPath);
      for (const e of subset) {
        res.add(e);
      }
    }
    for (const p of res) {
      const subres = this.getDependencies(srcDir, p);
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
    let e;
    while ((e = this.queue.shift()) != null) {
      if (!this._.has(e["srcDir"])) {
        continue;
      }
      const {
        onAdded,
        onChanged,
        onRemoved
      } = this._.get(e["srcDir"])["handlers"];
      if (e["event"] === "unlink") {
        if (onRemoved != null) {
          onRemoved(e["srcDir"], e["srcPath"]);
        }
      } else if (e["event"] === "add") {
        if (onAdded != null) {
          onAdded(e["srcDir"], e["srcPath"]);
        }
      } else {
        if (onChanged != null) {
          onChanged(e["srcDir"], e["srcPath"]);
        }
      }
      // Call changed on all dependencies.
      const set = this.getDependencies(e["srcDir"], e["srcPath"]);
      if (onChanged != null) {
        for (const p of set) {
          onChanged(e["srcDir"], p);
        }
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
    if (!isArray(dirs) && isString(dirs)) {
      dirs = [dirs];
    }
    for (const srcDir of dirs) {
      if (!this._.has(srcDir)) {
        continue;
      }
      let w;
      while ((w = this._.get(srcDir)["watchers"].shift()) != null) {
        w.close();
      }
      this._.delete(srcDir);
    }
  }

  /**
   * @description Unregister all watchers.
   */
  close() {
    this.unregister([...this._.keys()]);
  }
}

module.exports = Watcher;
