"use strict";

const path = require("path");
const {expect} = require("chai");
const nunjucks = require("nunjucks");
const {File} = require("../hikaru/types");
const Logger = require("../hikaru/logger");
const Compiler = require("../hikaru/compiler");
const Decorator = require("../hikaru/decorator");

describe("decorator", async () => {
  const logger = new Logger();
  const compiler = new Compiler(logger);
  const decorator = new Decorator(logger, compiler);
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

  describe("register", () => {
    it("should register function with layout", async () => {
      const result = await compiler.compile(
        "example.njk", "<span>{{ content }}</span>"
      );
      decorator.register("example", result);
      expect(decorator._["example"]["fn"]).to.be.a("function");
    });
  });

  describe("list", async () => {
    const result = await compiler.compile(
      "page.njk", "<div>{{ content }}</div>"
    );
    decorator.register("page", result);

    it("should list two layouts", () => {
      expect(decorator.list()).has.lengthOf(2);
    });
  });

  describe("getFileLayout", () => {
    it("should return null if file has no layout", () => {
      return expect(decorator.getFileLayout(new File())).to.be.null;
    });

    it("should return `page` if file has unregistered layout", () => {
      expect(
        decorator.getFileLayout(new File({"layout": "index"}))
      ).to.equal("page");
    });

    it("should return layout if file has registered layout", () => {
      expect(
        decorator.getFileLayout(new File({"layout": "example"}))
      ).to.equal("example");
    });
  });

  describe("decorate", () => {
    it("should not decorate if file has no layout", async () => {
      const result = await decorator.decorate(new File({
        "content": "Hello world!"
      }));
      expect(result).to.equal("Hello world!");
    });

    it(
      "should decorate as `page` if file has unregistered layout",
      async () => {
        const result = await decorator.decorate(new File({
          "layout": "index",
          "content": "Hello world!"
        }));
        expect(result).to.equal("<div>Hello world!</div>");
      }
    );

    it(
      "should decorate with layout if file has registered layout",
      async () => {
        const result = await decorator.decorate(new File({
          "layout": "example",
          "content": "Hello world!"
        }));
        expect(result).to.equal("<span>Hello world!</span>");
      }
    );
  });
});
