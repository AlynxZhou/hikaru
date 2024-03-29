import * as path from "node:path";
import {expect} from "chai";
import nunjucks from "nunjucks";
import Logger from "../hikaru/logger.js";
import Compiler from "../hikaru/compiler.js";

const main = () => {
  describe("compiler", () => {
    const logger = new Logger();
    const compiler = new Compiler(logger);

    describe("register", () => {
      it("should register nunjucks compiler", () => {
        const njkCompiler = (filepath, content) => {
          const njkEnv = nunjucks.configure(
            path.dirname(filepath), {"autoEscape": false}
          );
          const template = nunjucks.compile(content, njkEnv, filepath);
          // For template you must give a render function as content.
          return (ctx) => {
            return new Promise((resolve, reject) => {
              template.render(ctx, (error, result) => {
                if (error != null) {
                  return reject(error);
                }
                return resolve(result);
              });
            });
          };
        };
        compiler.register(".njk", njkCompiler);
        expect(compiler._).to.have.all.keys(".njk");
      });

      it("should compile nunjucks", async () => {
        const result = await compiler.compile(
          "example.njk", "<span>{{ content }}</span>"
        );
        expect(result).to.be.a("function");
      });
    });
  });
};

export default main;
