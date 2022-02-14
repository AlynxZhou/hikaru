"use strict";

const {isMainThread, parentPort} = require("worker_threads");
const {
  parseNode,
  resolveHeaderIDs,
  genTOC,
  resolveAnchors,
  resolveImages,
  resolveCodeBlocks,
  serializeNode
} = require("../utils");

if (isMainThread) {
  throw new Error("Worker scripts should not run in main thread.");
}

const work = ({rawContent, docPath, baseURL, rootDir, highlight}) => {
  const node = parseNode(rawContent);
  resolveHeaderIDs(node);
  const toc = genTOC(node);
  resolveAnchors(node, baseURL, rootDir, docPath);
  resolveImages(node, rootDir, docPath);
  resolveCodeBlocks(node, highlight);
  const content = serializeNode(node);
  return {content, toc};
};

parentPort.on("message", (message) => {
  parentPort.postMessage(work(message));
});
