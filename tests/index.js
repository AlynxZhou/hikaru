import testTypes from "./types.js";
import testUtils from "./utils.js";
import testLogger from "./logger.js";
import testWatcher from "./watcher.js";
import testTranslator from "./translator.js";
import testCompiler from "./compiler.js";
import testDecorator from "./decorator.js";
import testRenderer from "./renderer.js";
import testGenerator from "./generator.js";
import testProcessor from "./processor.js";
import testHelper from "./helper.js";

describe("Hikaru", () => {
  testTypes();
  testUtils();
  testLogger();
  testWatcher();
  testTranslator();
  testCompiler();
  testDecorator();
  testRenderer();
  testGenerator();
  testProcessor();
  testHelper();
});
