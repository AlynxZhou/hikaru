import {expect} from "chai";
import {File} from "../hikaru/types.js";

const main = () => {
  describe("types", () => {
    describe("file", () => {
      it("should init with an Object as parameter", () => {
        const file = new File({"docPath": "index.html", "docDir": "docs/"});
        expect(file["docPath"]).to.equal("index.html");
      });
    });
  });
};

export default main;
