import {expect} from "chai";
import Logger from "../hikaru/logger.js";
import Watcher from "../hikaru/watcher.js";

const main = () => {
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
        expect(watcher.fileDependencies).to.deep.equal(
          new Map([["/tmp", new Map([["2.txt", new Set(["1.txt"])]])]])
        );
      });
    });

    describe("getDependencies", () => {
      it("should return all files that needs to update", () => {
        const dependencies = watcher.getDependencies("/tmp", "2.txt");
        expect(dependencies).to.deep.equal(new Set(["1.txt"]));
      });
    });
  });
};

export default main;
