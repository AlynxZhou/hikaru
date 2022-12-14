import {expect} from "chai";
import {Site, File} from "../hikaru/types.js";
import Logger from "../hikaru/logger.js";
import Processor from "../hikaru/processor.js";

const main = () => {
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
};

export default main;
