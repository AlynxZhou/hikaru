import {expect} from "chai";
import Logger from "../hikaru/logger.js";
import Helper from "../hikaru/helper.js";

const main = () => {
  describe("helper", () => {
    const logger = new Logger();
    const helper = new Helper(logger);

    describe("register", () => {
      it("should register a base context", () => {
        helper.register("base context", (site, file) => {
          return {
            "base": "base"
          };
        });
        expect(helper._).to.have.lengthOf(1);
      });

      it("should register a test context for test layout", () => {
        helper.register("test context", (site, file) => {
          return {
            "test": "test"
          };
        }, "test");
        expect(helper._).to.have.lengthOf(2);
      });
    });

    describe("getContext", () => {
      it("should return empty context for file without layout", async () => {
        const context = await helper.getContext(null, {"layout": null});
        expect(Object.keys(context)).to.have.lengthOf(0);
      });

      it("should return base context", async () => {
        const context = await helper.getContext(null, {"layout": "base"});
        expect(context).to.have.all.keys("base");
      });

      it("should return base and test context", async () => {
        const context = await helper.getContext(null, {"layout": "test"});
        expect(context).to.have.all.keys("base", "test");
      });
    });
  });
};

export default main;
