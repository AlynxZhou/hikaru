"use strict";

const {expect} = require("chai");
const {Site, File} = require("../hikaru/types");
const Logger = require("../hikaru/logger");
const Generator = require("../hikaru/generator");

describe("generator", () => {
  const logger = new Logger();
  const generator = new Generator(logger);

  describe("register", () => {
    it("should register custom generator", () => {
      generator.register("generator1", () => {
        return new File();
      });
      expect(generator._).to.have.lengthOf(1);
    });
  });

  describe("generate", () => {
    it("should generate 3 files", async () => {
      generator.register("generator2", async () => {
        return new Promise((resolve, reject) => {
          setImmediate(() => {
            resolve([new File(), new File()]);
          });
        });
      });
      const results = await generator.generate(new Site());
      expect(results).to.have.lengthOf(3);
    });
  });
});
