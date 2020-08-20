"use strict";

const {expect} = require("chai");
const {File} = require("../hikaru/types");

describe("types", () => {
  describe("file", () => {
    it("should init with an Object as parameter", () => {
      const file = new File({"docPath": "index.html", "docDir": "docs/"});
      expect(file["docPath"]).to.equal("index.html");
    });
  });
});
