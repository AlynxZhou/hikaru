"use strict";

const {expect} = require("chai");
const Logger = require("../hikaru/logger");
const Translator = require("../hikaru/translator");

describe("translator", () => {
  const logger = new Logger();
  const translator = new Translator(logger);

  describe("register", () => {
    it("should register a language", () => {
      translator.register("zh-Hans", {
        "toadCount": {
          "one": "%d 只蛤蟆 %d 张嘴。",
          "more": "%d 只蛤蟆 %d 张嘴。"
        }
      });
      expect(translator._).to.have.all.keys("zh-Hans");
    });

    it("should register the same language with an array", () => {
      translator.register(["default", "en"], {
        "toadCount": {
          "one": "%d toad has %d mouse.",
          "more": "%d toads have %d mouses."
        }
      });
      expect(translator._).to.include.all.keys("en", "default");
      expect(translator._.get("default")).to.equal(translator._.get("en"));
    });
  });

  describe("list", () => {
    it("should have 3 languages", () => {
      expect(translator.list()).to.have.lengthOf(3);
    });
  });

  describe("getTranslateFn", () => {
    it("should return `default` if not registered", () => {
      const __ = translator.getTranslateFn("en-US");
      expect(__("toadCount.one", 1, 1)).to.equal("1 toad has 1 mouse.");
    });

    it("should return registered language", () => {
      const __ = translator.getTranslateFn("zh-Hans");
      expect(__("toadCount.more", 2, 2)).to.equal("2 只蛤蟆 2 张嘴。");
    });
  });
});
