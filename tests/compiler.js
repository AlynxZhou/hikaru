"use strict";

const path = require("path");
const {expect} = require("chai");
const nunjucks = require("nunjucks");
const Logger = require("../hikaru/logger");
const Compiler = require("../hikaru/compiler");

describe("compiler", () => {
  const logger = new Logger();
  const compiler = new Compiler(logger);

  describe("register", () => {
    it("should register njk compiler", () => {
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
      return expect(compiler._[".njk"]).not.to.be.undefined;
    });

    it("should compile njk", async () => {
      const result = await compiler.compile(
        "example.njk", "<span>{{ content }}</span>"
      );
      expect(result).to.be.a("function");
    });
  });
});
