import {expect} from "chai";
import {Site, File} from "../hikaru/types.js";
import {
  checkType,
  escapeHTML,
  removeHTMLTags,
  getFrontMatter,
  getContentType,
  paginate,
  getPathFn,
  getURLFn,
  isCurrentHostFn,
  isCurrentPathFn,
  putSite,
  delSite,
  getFullSrcPath,
  getFullDocPath,
  parseNode,
  serializeNode,
  replaceNode,
  nodesEach,
  nodesFilter,
  getNodeText,
  setNodeText,
  getNodeAttr,
  setNodeAttr,
  resolveHeadingIDs,
  genTOC,
  getURLProtocol,
  resolveAnchors,
  resolveImages,
  resolveCodeBlocks
} from "../hikaru/utils.js";

const main = () => {
  describe("utils", () => {
    describe("checkType", () => {
      it("should throw error if provided types are not supported", () => {
        expect(() => {
          const variable = "variable";
          checkType(variable, "variable", ["String", "Null"]);
        }).to.throw(TypeError);
      });

      it("should throw error if variable is not one of provided types", () => {
        expect(() => {
          const variable = "variable";
          checkType(variable, "variable", "Array");
        }).to.throw(TypeError);
      });
    });

    describe("escapeHTML", () => {
      it("should escape special chars in HTML strings", () => {
        expect(escapeHTML("<>&\"'")).to.equal("&lt;&gt;&amp;&quot;&#039;");
      });
    });

    describe("removeHTMLTags", () => {
      it("should remove all tags in HTML strings", () => {
        expect(removeHTMLTags(
          "<a href=\"https://gallery.alynx.one/\">Gallery</a>"
        )).to.equal("Gallery");
      });
    });

    describe("getFrontMatter", () => {
      it(
        "should return no attribute if not start with `/^---+\\r?\\n/`",
        () => {
          expect(
            getFrontMatter("--\nsome strings")["attributes"]
          ).to.deep.equal({});
        }
      );

      it("should return no attribute if only one `/^---+\\r?\\n/gm`", () => {
        expect(
          getFrontMatter("---\r\nsome strings")["attributes"]
        ).to.deep.equal({});
      });

      it("should return attributes if two `/^---+\\r?\\n/gm`", () => {
        expect(
          getFrontMatter(
            "---\r\ntitle: some test\n---\nsome strings"
          )["attributes"]
        ).to.deep.equal({"title": "some test"});
      });

      it("should return body if body contains `/^---+\\r?\\n/gm`", () => {
        expect(
          getFrontMatter(
            "---\r\ntitle: some test\n---\nsome\n---\n----\nstrings"
          )["body"]
        ).to.equal("some\n---\n----\nstrings");
      });
    });

    describe("getContentType", () => {
      it("should return `application/octet-stream` if no extname", () => {
        expect(
          getContentType("/usr/bin/cat")
        ).to.equal("application/octet-stream");
      });

      it("should return `application/octet-stream` if unknown extname", () => {
        expect(getContentType("unk.nown")).to.equal("application/octet-stream");
      });

      it("should return `text/plain; charset=UTF-8` if text extname", () => {
        expect(
          getContentType("hikaru.coffee")
        ).to.equal("text/plain; charset=UTF-8");
      });

      it("should return `image/png` if png extname", () => {
        expect(
          getContentType("avatar.png")
        ).to.equal("image/png");
      });
    });

    describe("paginate", () => {
      const basePage = new File({
        "docPath": "archives/index.html",
        "docDir": "docs/",
        "layout": "archives"
      });

      it("should return only one page if no posts", () => {
        expect(paginate(basePage)).to.have.lengthOf(1);
      });

      it("should return two page if has twice of `perPage` posts", () => {
        const posts = [new File(), new File()];
        expect(paginate(basePage, posts, 1)).to.have.lengthOf(2);
      });
    });

    describe("getPathFn", () => {
      const getPath = getPathFn("/blog/");

      it("should return `/blog/` if no docPath", () => {
        expect(getPath()).to.equal("/blog/");
      });

      it("should strip `index.html` if ends with it", () => {
        expect(getPath("/archives/index.html")).to.equal("/blog/archives/");
      });

      it("should keep query strings if ends with it", () => {
        expect(
          getPath("search/index.html?q=test")
        ).to.equal("/blog/search/?q=test");
      });

      it("should keep hash if ends with it", () => {
        const result = getPath("about/index.html#comment-results");
        expect(result).to.equal("/blog/about/#comment-results");
      });

      it("should replace win32 sep with posix sep", () => {
        const result = getPath("\\posts\\My-First-Post\\index.html");
        expect(result).to.equal("/blog/posts/My-First-Post/");
      });

      it("should encode special chars in URI sep with posix sep", () => {
        const result = getPath("\\posts\\My First Post\\index.html");
        expect(result).to.equal("/blog/posts/My%20First%20Post/");
      });
    });

    describe("getURLFn", () => {
      it("should return URL if no docPath", () => {
        const getURL = getURLFn("http://localhost:2333", "/blog/");
        expect(getURL()).to.deep.equal(new URL("http://localhost:2333/blog/"));
      });

      it("should throw error if no URL protocol", () => {
        expect(getURLFn("localhost:2333", "/blog/")).to.throw();
      });
    });

    describe("isCurrentHostFn", () => {
      const isCurrentHost = isCurrentHostFn("http://localhost:2333", "/blog/");
      it("should return true if only a path is given", () => {
        return expect(isCurrentHost("tags/")).to.be.true;
      });

      it("should return false if a URL with different host is given", () => {
        return expect(isCurrentHost("//localhost:8080?p=1")).not.to.be.true;
      });

      it("should return true if a URL with the same host is given", () => {
        return expect(isCurrentHost(
          "//localhost:2333/az/#top", true
        )).to.be.true;
      });
    });

    describe("isCurrentPathFn", () => {
      const isCurrentPath = isCurrentPathFn("/blog/", "tags/linux/");
      it(
        "should return true if not strict and `currentPath` is under `testPath`",
        () => {
          return expect(isCurrentPath("tags/")).to.be.true;
        }
      );

      it(
        "should return false if strict and `currentPath` is under `testPath`",
        () => {
          return expect(isCurrentPath("tags/", true)).not.to.be.true;
        }
      );

      it(
        "should return true if strict and `testPath` is `currentPath` with hash",
        () => {
          return expect(isCurrentPath("tags/linux/#top", true)).to.be.true;
        }
      );
    });

    describe("putSite", () => {
      it("should not add file to site if not an available key", () => {
        const site = new Site();
        putSite(site, "something", new File({
          "docDir": "docs/",
          "docPath": "index.html"
        }));
        expect(site["files"]).to.have.lengthOf(0);
      });

      it("should add file to site if no matched file", () => {
        const site = new Site();
        putSite(site, "files", new File({
          "docDir": "docs/",
          "docPath": "index.html"
        }));
        putSite(site, "files", new File({
          "docDir": "docs/",
          "docPath": "about/index.html"
        }));
        expect(site["files"]).to.have.lengthOf(2);
      });

      it("should replace file to site if have matched file", () => {
        const site = new Site();
        putSite(site, "files", new File({
          "docDir": "docs/",
          "docPath": "index.html"
        }));
        putSite(site, "files", new File({
          "docDir": "docs/",
          "docPath": "index.html"
        }));
        expect(site["files"]).to.have.lengthOf(1);
      });
    });

    describe("delSite", () => {
      it("should not delete file from site if not an available key", () => {
        const site = new Site();
        putSite(site, "files", new File({
          "srcDir": "srcs/",
          "srcPath": "index.md"
        }));
        delSite(site, "something", new File({
          "srcDir": "srcs/",
          "srcPath": "index.md"
        }));
        expect(site["files"]).to.have.lengthOf(1);
      });

      it("should delete all files from site if have matched files", () => {
        const site = new Site();
        putSite(site, "files", new File({
          "srcDir": "srcs/",
          "srcPath": "index.md",
          "docDir": "docs/",
          "docPath": "index.html"
        }));
        putSite(site, "files", new File({
          "srcDir": "srcs/",
          "srcPath": "index.md",
          "docDir": "docs/",
          "docPath": "index-2.html"
        }));
        delSite(site, "files", new File({
          "srcDir": "srcs/",
          "srcPath": "index.md"
        }));
        expect(site["files"]).to.have.lengthOf(0);
      });
    });

    describe("getFullSrcPath", () => {
      it("should return `null` if no file", () => {
        return expect(getFullSrcPath()).to.be.null;
      });

      it("should return `null` if no `srcDir` or `srcPath`", () => {
        return expect(getFullSrcPath(new File())).to.be.null;
      });

      it("should return full src path", () => {
        expect(getFullSrcPath(new File({
          "srcDir": "srcs/",
          "srcPath": "index.md"
        }))).to.equal("srcs/index.md");
      });
    });

    describe("getFullDocPath", () => {
      it("should return `null` if no file", () => {
        return expect(getFullDocPath()).to.be.null;
      });

      it("should return `null` if no `docDir` or `docPath`", () => {
        return expect(getFullDocPath(new File())).to.be.null;
      });

      it("should return full doc path", () => {
        expect(getFullDocPath(new File({
          "docDir": "docs/",
          "docPath": "index.html"
        }))).to.equal("docs/index.html");
      });
    });

    describe("replaceNode", () => {
      it("should replace anchor with image", () => {
        const node = parseNode(
          "<div><a href=\"https://hikaru.alynx.one/\">Homepage</a></div>"
        );
        const anchor = node["childNodes"][0]["childNodes"][0];
        replaceNode(anchor, "<img>");
        expect(serializeNode(node)).to.equal("<div><img></div>");
      });
    });

    describe("nodesEach", () => {
      it("should traverse nodes in document sequence", () => {
        const results = [];
        const node = parseNode("<div><a><span></span></a><img></div><p></p>");
        nodesEach(node, (node) => {
          // Not all nodes have `tagName`, but all have `nodeName`.
          results.push(node["nodeName"]);
        });
        expect(results.join(" ")).to.equal("#document-fragment div a span img p");
      });
    });

    describe("nodesFilter", () => {
      it("should return all anchors in document sequence", () => {
        const node = parseNode("<div><a><a></a></a></div><p><a></a></p>");
        const results = nodesFilter(node, (node) => {
          return node["tagName"] === "a";
        });
        expect(results).to.have.lengthOf(3);
      });
    });

    describe("getNodeText", () => {
      it("should return `null` if no text", () => {
        const node = parseNode("<span></span>");
        return expect(getNodeText(node["childNodes"][0])).to.be.null;
      });

      it("should return text in span", () => {
        const node = parseNode("<span>some string</span>");
        expect(getNodeText(node["childNodes"][0])).to.equal("some string");
      });
    });

    describe("setNodeText", () => {
      it("should not set text if to text nodes", () => {
        const node = parseNode("<span>old</span>");
        setNodeText(node["childNodes"][0]["childNodes"][0], "some string");
        expect(getNodeText(node["childNodes"][0])).to.equal("old");
      });

      it("should set text", () => {
        const node = parseNode("<span>old</span>");
        setNodeText(node["childNodes"][0], "some string");
        expect(getNodeText(node["childNodes"][0])).to.equal("some string");
      });

      it("should set childNodes if HTML string is given", () => {
        const node = parseNode("<span>old</span>");
        setNodeText(node["childNodes"][0], "<a>some string</a>");
        expect(serializeNode(node)).to.equal("<span><a>some string</a></span>");
      });
    });

    describe("getNodeAttr", () => {
      it("should return `null` if no attr", () => {
        const node = parseNode("<span>old</span>");
        return expect(
          getNodeAttr(node["childNodes"][0]["childNodes"][0], "src")
        ).to.be.null;
      });

      it("should return `null` if attr name not found", () => {
        const node = parseNode("<a>old</a>");
        return expect(getNodeAttr(node["childNodes"][0], "href")).to.be.null;
      });

      it("should return value if attr name found", () => {
        const node = parseNode("<div id=\"div-1\"></div>");
        expect(
          getNodeAttr(node["childNodes"][0], "id")
        ).to.equal("div-1");
      });
    });

    describe("setNodeAttr", () => {
      it("should not set if no attr", () => {
        const node = parseNode("<span>old</span>");
        setNodeAttr(node["childNodes"][0]["childNodes"][0], "id", "span-1");
        expect(
          node["childNodes"][0]["childNodes"][0]
        ).not.to.have.property("attrs");
      });

      it("should add attr if attr name not found", () => {
        const node = parseNode("<a>old</a>");
        setNodeAttr(node["childNodes"][0], "id", "a-1");
        expect(node["childNodes"][0]["attrs"]).to.have.lengthOf(1);
      });

      it("should replace attr if attr name found", () => {
        const node = parseNode("<a id=\"a-1\">old</a>");
        setNodeAttr(node["childNodes"][0], "id", "a-2");
        expect(node["childNodes"][0]["attrs"]).to.have.lengthOf(1);
      });
    });

    describe("resolveHeadingIDs", () => {
      it("should not resolve header ID if no text", () => {
        const node = parseNode("<h1></h1>");
        resolveHeadingIDs(node);
        expect(serializeNode(node)).to.equal("<h1></h1>");
      });

      it("should resolve header ID if have text", () => {
        const node = parseNode([
          "<h1 id=\"h1\">h1</h1>",
          "<h2 id=\"h2\">h2</h2>"
        ].join(""));
        resolveHeadingIDs(node);
        expect(serializeNode(node)).to.equal([
          "<h1 id=\"h1\">",
          "<a class=\"heading-link header-link\" href=\"#h1\"></a>h1",
          "</h1>",
          "<h2 id=\"h2\">",
          "<a class=\"heading-link header-link\" href=\"#h2\"></a>h2",
          "</h2>"
        ].join(""));
      });

      it("should generate unique ID for same text", () => {
        const node = parseNode([
          "<h1 id=\"h1\">h1</h1>",
          "<h2 id=\"h2\">h2</h2>",
          "<h3>h3</h3>",
          "<h1 id=\"h1\">h1</h1>",
          "<h1>h1-1</h1>",
          "<h3 id=\"h3\">h3</h3>"
        ].join(""));
        resolveHeadingIDs(node);
        expect(serializeNode(node)).to.equal([
          "<h1 id=\"h1\">",
          "<a class=\"heading-link header-link\" href=\"#h1\"></a>h1",
          "</h1>",
          "<h2 id=\"h2\">",
          "<a class=\"heading-link header-link\" href=\"#h2\"></a>h2",
          "</h2>",
          "<h3 id=\"h3\">",
          "<a class=\"heading-link header-link\" href=\"#h3\"></a>h3",
          "</h3>",
          "<h1 id=\"h1-1\">",
          "<a class=\"heading-link header-link\" href=\"#h1-1\"></a>h1",
          "</h1>",
          "<h1 id=\"h1-1-1\">",
          "<a class=\"heading-link header-link\" href=\"#h1-1-1\"></a>h1-1",
          "</h1>",
          "<h3 id=\"h3-1\">",
          "<a class=\"heading-link header-link\" href=\"#h3-1\"></a>h3",
          "</h3>"
        ].join(""));
      });

      it("should encode Chinese character", () => {
        const node = parseNode([
          "<h1 id=\"h1\">中文</h1>",
          "<h2 id=\"h2\">中文</h2>"
        ].join(""));
        resolveHeadingIDs(node);
        expect(serializeNode(node)).to.equal([
          "<h1 id=\"%E4%B8%AD%E6%96%87\">",
          "<a class=\"heading-link header-link\" href=\"#%E4%B8%AD%E6%96%87\"></a>中文",
          "</h1>",
          "<h2 id=\"%E4%B8%AD%E6%96%87-1\">",
          "<a class=\"heading-link header-link\" href=\"#%E4%B8%AD%E6%96%87-1\"></a>中文",
          "</h2>"
        ].join(""));
      });

      it("should remove chars not supported by scrollspy", () => {
        const node = parseNode([
          "<h1 id=\"h1\">中<>文</h1>",
          "<h2 id=\"h2\">中<>文</h2>"
        ].join(""));
        resolveHeadingIDs(node);
        expect(serializeNode(node)).to.equal([
          "<h1 id=\"%E4%B8%AD%E6%96%87\">",
          "<a class=\"heading-link header-link\" href=\"#%E4%B8%AD%E6%96%87\"></a>",
          "中&lt;&gt;文",
          "</h1>",
          "<h2 id=\"%E4%B8%AD%E6%96%87-1\">",
          "<a class=\"heading-link header-link\" href=\"#%E4%B8%AD%E6%96%87-1\"></a>",
          "中&lt;&gt;文",
          "</h2>"
        ].join(""));
      });
    });

    describe("genTOC", () => {
      it("should not generate TOC if no id or text.", () => {
        const node = parseNode("<h1></h1>");
        expect(genTOC(node)).to.have.lengthOf(0);
      });

      it("should generate TOC if available", () => {
        const node = parseNode([
          "<h1 id=\"h1\">",
          "<a class=\"heading-link header-link\" href=\"#h1\" title=\"h1\"></a>h1",
          "</h1>",
          "<h2 id=\"h2\">",
          "<a class=\"heading-link header-link\" href=\"#h2\" title=\"h2\"></a>h2",
          "</h2>",
          "<h3 id=\"h3\">",
          "<a class=\"heading-link header-link\" href=\"#h3\" title=\"h3\"></a>h3",
          "</h3>",
          "<h1 id=\"h1-1\">",
          "<a class=\"heading-link header-link\" href=\"#h1-1\" title=\"h1\"></a>h1",
          "</h1>",
          "<h1 id=\"h1-1-1\">",
          "<a class=\"heading-link header-link\" href=\"#h1-1-1\" title=\"h1-1\"></a>h1-1",
          "</h1>",
          "<h3 id=\"h3-1\">",
          "<a class=\"heading-link header-link\" href=\"#h3-1\" title=\"h3\"></a>h3",
          "</h3>"
        ].join(""));
        const toc = [
          {
            "name": "h1",
            "anchor": "#h1",
            "archor": "#h1",
            "text": "h1",
            "subs": [
              {
                "name": "h2",
                "anchor": "#h2",
                "archor": "#h2",
                "text": "h2",
                "subs": [
                  {
                    "name": "h3",
                    "anchor": "#h3",
                    "archor": "#h3",
                    "text": "h3",
                    "subs": []
                  }
                ]
              }
            ]
          },
          {
            "name": "h1",
            "anchor": "#h1-1",
            "archor": "#h1-1",
            "text": "h1",
            "subs": []
          },
          {
            "name": "h1",
            "anchor": "#h1-1-1",
            "archor": "#h1-1-1",
            "text": "h1-1",
            "subs": [
              {
                "name": "h3",
                "anchor": "#h3-1",
                "archor": "#h3-1",
                "text": "h3",
                "subs": []
              }
            ]
          }
        ];
        expect(genTOC(node)).to.deep.equal(toc);
      });
    });

    describe("getURLProtocol", () => {
      it("should return `null` if invalid URL", () => {
        return expect(getURLProtocol("example.com")).to.be.null;
      });

      it("should return `https:` if HTTPS URL", () => {
        expect(getURLProtocol("https://example.com")).to.equal("https:");
      });

      it("should return `data:` if data URL", () => {
        expect(getURLProtocol("data:image/png;xxx")).to.equal("data:");
      });
    });

    describe("resolveAnchors", () => {
      it("should not resolve absolute path", () => {
        const node = parseNode("<a href=\"/about/\"></a>");
        resolveAnchors(node, "https://hikaru.alynx.one", "/blog/", "index.html");
        expect(serializeNode(node)).to.equal("<a href=\"/about/\"></a>");
      });

      it("should not resolve internal URL", () => {
        const node = parseNode(
          "<a href=\"https://hikaru.alynx.one/about/\"></a>"
        );
        resolveAnchors(node, "https://hikaru.alynx.one", "/blog/", "index.html");
        expect(
          serializeNode(node)
        ).to.equal("<a href=\"https://hikaru.alynx.one/about/\"></a>");
      });

      it("should not resolve data URL", () => {
        const node = parseNode(
          "<a href=\"data:image/png;xxx\"></a>"
        );
        resolveAnchors(node, "https://hikaru.alynx.one", "/blog/", "index.html");
        expect(
          serializeNode(node)
        ).to.equal("<a href=\"data:image/png;xxx\"></a>");
      });

      it("should resolve external URL", () => {
        const node = parseNode("<a href=\"https://example.com/\"></a>");
        resolveAnchors(node, "https://hikaru.alynx.one", "/blog/", "index.html");
        expect(getNodeAttr(node["childNodes"][0], "target")).to.equal("_blank");
      });

      it("should resolve relative path", () => {
        const node = parseNode("<a href=\"../posts/a/\"></a>");
        resolveAnchors(
          node, "https://hikaru.alynx.one", "/blog/", "about/index.html"
        );
        expect(
          serializeNode(node)
        ).to.equal("<a href=\"/blog/posts/a/\"></a>");
      });
    });

    describe("resolveImages", () => {
      it("should not resolve absolute path", () => {
        const node = parseNode("<img src=\"/about/a.webp\">");
        resolveImages(node, "/blog/", "index.html");
        expect(serializeNode(node)).to.equal("<img src=\"/about/a.webp\">");
      });

      it("should not resolve URL", () => {
        const node = parseNode(
          "<img src=\"https://hikaru.alynx.one/about/a.webp\">"
        );
        resolveImages(node, "/blog/", "index.html");
        expect(
          serializeNode(node)
        ).to.equal("<img src=\"https://hikaru.alynx.one/about/a.webp\">");
      });

      it("should not resolve data URL", () => {
        const node = parseNode(
          "<img href=\"data:image/png;xxx\">"
        );
        resolveImages(node, "/blog/", "index.html");
        expect(serializeNode(node)).to.equal("<img href=\"data:image/png;xxx\">");
      });

      it("should resolve relative path", () => {
        const node = parseNode("<img src=\"../posts/a/1.webp\">");
        resolveImages(node, "/blog/", "about/index.html");
        expect(
          serializeNode(node)
        ).to.equal("<img src=\"/blog/posts/a/1.webp\">");
      });
    });

    describe("resolveCodeBlocks", () => {
      it("should not add `<figure>` if `<pre>` is already under it", () => {
        const node = parseNode("<figure><pre><code></code></pre></figure>");
        resolveCodeBlocks(node, {"enable": false, "gutter": false});
        expect(
          serializeNode(node)
        ).to.equal("<figure><pre><code></code></pre></figure>");
      });

      it(
        "should not add `<figure>` if `<pre>` has more than one children",
        () => {
          const node = parseNode(
            "<figure><pre><code></code><code></code></pre></figure>"
          );
          resolveCodeBlocks(node, {"enable": false, "gutter": false});
          expect(
            serializeNode(node)
          ).to.equal("<figure><pre><code></code><code></code></pre></figure>");
        }
      );

      it("should add `<figure>` to `<pre><code>`", () => {
        const node = parseNode(
          "<pre><code>console.log(\"Hello world!\");</code></pre>"
        );
        resolveCodeBlocks(node, {"enable": false, "gutter": false});
        expect(node["childNodes"][0]["tagName"]).to.equal("figure");
      });

      it("should add gutter if enabled", () => {
        const node = parseNode(
          "<pre><code>console.log(\"Hello world!\");</code></pre>"
        );
        resolveCodeBlocks(node, {"enable": false, "gutter": true});
        expect(
          getNodeAttr(node["childNodes"][0]["childNodes"][0], "class")
        ).to.equal("gutter");
      });
    });
  });
};

export default main;
