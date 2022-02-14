"use strict";

const {isMainThread, parentPort} = require("worker_threads");
const {marked} = require("marked");

if (isMainThread) {
  throw new Error("Worker scripts should not run in main thread.");
}

const work = (content) => {
  return marked.parse(content);
};

parentPort.on("message", (message) => {
  parentPort.postMessage(work(message));
});
