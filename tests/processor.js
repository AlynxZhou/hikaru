"use strict";

const {expect} = require("chai");
const {Site, File} = require("../hikaru/types");
const Logger = require("../hikaru/logger");
const Processor = require("../hikaru/processor");

describe("processor", () => {
  const logger = new Logger();
  const processor = new Processor(logger);

  describe("register", () => {
    it("should register custom processor", () => {
      processor.register("processor1", (site) => {
        site["posts"].forEach((p) => {
          p["processor1"] = true;
        });
      });
      expect(processor._).to.have.lengthOf(1);
    });
  });

  describe("process", () => {
    it("should processor files", async () => {
      const site = new Site();
      site["posts"].push(new File());
      await processor.process(site);
      expect(site["posts"][0]).to.have.property("processor1");
    });
  });
});
