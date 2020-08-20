"use strict";

const {Writable} = require("stream");
const {expect} = require("chai");
const Logger = require("../hikaru/logger");

describe("logger", () => {
  it("should set `color` to `true` if not given", () => {
    const logger = new Logger();
    return expect(logger.opts["color"]).to.be.true;
  });

  it("should set `debug` to `false` if not given", () => {
    const logger = new Logger();
    return expect(logger.opts["debug"]).not.to.be.true;
  });

  it("should set `stdout` to `process.stdout` if not given", () => {
    const logger = new Logger();
    expect(logger.opts["stdout"]).to.equal(process.stdout);
  });

  it("should set `stderr` to `process.stderr` if not given", () => {
    const logger = new Logger();
    expect(logger.opts["stderr"]).to.equal(process.stderr);
  });

  it("should set `color` to `false` if not in TTY", () => {
    const logger = new Logger({"stderr": new Writable(), "color": true});
    return expect(logger.opts["color"]).not.to.be.true;
  });
});
