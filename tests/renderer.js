import {expect} from "chai";
import {marked} from "marked";
import {File} from "../hikaru/types.js";
import Logger from "../hikaru/logger.js";
import Renderer from "../hikaru/renderer.js";

const main = () => {
  describe("renderer", () => {
    const logger = new Logger();
    const renderer = new Renderer(logger, ["README.md"]);

    describe("register", () => {
      it("should register Markdown renderer", () => {
        marked.setOptions({"gfm": true});
        renderer.register(".md", ".html", (file) => {
          file["content"] = marked.parse(file["text"]);
          return file;
        });
        expect(renderer._).to.have.all.keys(".md");
      });
    });

    describe("render", () => {
      it("should not render binary", async () => {
        const result = await renderer.render(new File({
          "srcDir": "srcs/",
          "docDir": "docs/",
          "srcPath": "about/avatar.md",
          "text": "*hello*",
          "binary": true
        }));
        return expect(result[0]["content"]).to.equal("*hello*");
      });

      it("should not render files in `skipRenderList`", async () => {
        const result = await renderer.render(new File({
          "srcDir": "srcs/",
          "docDir": "docs/",
          "srcPath": "README.md",
          "text": "*hello*"
        }));
        expect(result[0]["content"]).to.equal("*hello*");
      });

      it("should render Markdown to HTML", async () => {
        const result = await renderer.render(new File({
          "srcDir": "srcs/",
          "docDir": "docs/",
          "srcPath": "about/index.md",
          "text": "*hello*"
        }));
        expect(result[0]["content"]).to.equal("<p><em>hello</em></p>\n");
      });

      it("should rename `.md` to `.html`", async () => {
        const result = await renderer.render(new File({
          "srcDir": "srcs/",
          "docDir": "docs/",
          "srcPath": "about/index.md",
          "text": "*hello*"
        }));
        expect(result[0]["docPath"]).to.equal("about/index.html");
      });
    });
  });
};

export default main;
