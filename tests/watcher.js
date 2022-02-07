"use strict";

const {expect} = require("chai");
const Logger = require("../hikaru/logger");
const Watcher = require("../hikaru/watcher");

describe("watcher", () => {
  const logger = new Logger();
  const rawFileDependencies = {
    "/tmp": {
      "1.txt": ["2.txt"]
    }
  };
  const watcher = new Watcher(logger, rawFileDependencies);

  describe("reverseFileDependencies", () => {
    it("should reverse file dependency tree", () => {
      expect(JSON.stringify(watcher.fileDependencies)).to.equal(
        "{\"/tmp\":{\"2.txt\":[\"1.txt\"]}}"
      );
    });
  });

  describe("getDependencies", () => {
    it("should return all files that needs to update", () => {
      const dependencies = watcher.getDependencies("/tmp", "2.txt");
      expect(JSON.stringify(dependencies)).to.equal("[\"1.txt\"]");
    });
  });
});
