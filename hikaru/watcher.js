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
    this._ = {};
    this.fileDependencies = this.reverseFileDependencies(rawFileDependencies);
    this.dirs = null;
    this.queue = [];
    this.handling = false;
  }

  /**
   * @private
   * @description Parse and reverse dependency tree for faster look up.
   * @param {Object} rawFileDependencies File depenency tree.
   * @return {Object} Reversed file dependency tree.
   */
  reverseFileDependencies(rawFileDependencies) {
    // Let's revert dependency tree for fast look up.
    const fileDependencies = {};
    for (const srcDir in rawFileDependencies) {
      fileDependencies[srcDir] = {};
      for (const k in rawFileDependencies[srcDir]) {
        for (const v of rawFileDependencies[srcDir][k]) {
          if (fileDependencies[srcDir][v] == null) {
            fileDependencies[srcDir][v] = [];
          }
          let found = false;
          for (const p of fileDependencies[srcDir][v]) {
            if (p === k) {
              found = true;
              break;
            }
          }
          if (!found) {
            fileDependencies[srcDir][v].push(k);
          }
        }
      }
    }
    return fileDependencies;
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
      if (this._[srcDir] != null) {
        this.unregister(srcDir);
      }
      this._[srcDir] = {
        "watchers": [],
        "handlers": {onAdded, onChanged, onRemoved}
      };
      // Globs must not contain windows spearators.
      const watcher = chokidar.watch(
        opts["recursive"] ? "**/*" : "*",
        {"cwd": srcDir, "ignoreInitial": true}
      );
      this._[srcDir]["watchers"].push(watcher);
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
   * @return {String[]}
   */
  getDependencies(srcDir, srcPath) {
    if (this.fileDependencies[srcDir] == null ||
      this.fileDependencies[srcDir][srcPath] == null) {
      return [];
    }
    let res = [].concat(this.fileDependencies[srcDir][srcPath]);
    for (const p of this.fileDependencies[srcDir][srcPath]) {
      res = res.concat(this.getDependencies(srcDir, p));
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
      if (this._[e["srcDir"]] == null) {
        continue;
      }
      const {onAdded, onChanged, onRemoved} = this._[e["srcDir"]]["handlers"];
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
      const array = this.getDependencies(e["srcDir"], e["srcPath"]);
      if (onChanged != null) {
        for (const p of array) {
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
      if (this._[srcDir] == null) {
        continue;
      }
      let w;
      while ((w = this._[srcDir]["watchers"].shift()) != null) {
        w.close();
      }
      this._[srcDir] = null;
    }
  }
}

module.exports = Watcher;
