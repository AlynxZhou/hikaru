"use script";

const {"Worker": Thread} = require("worker_threads");
const {isString} = require("./utils");

class Worker {
  constructor(logger) {
    this.logger = logger;
    this._ = new Map();
  }

  register(scriptPath, threadsLength = 1) {
    if (!isString(scriptPath)) {
      return;
    }
    if (threadsLength < 1) {
      throw new Error("Worker needs at least 1 thread.");
    }
    this._.set(scriptPath, {
      "queue": [],
      "threads": [],
      "threadsLength": threadsLength
    });
    for (let i = 0; i < threadsLength; ++i) {
      this._.get(scriptPath)["threads"].push({
        "thread": new Thread(scriptPath),
        "name": `Thread ${i}`,
        "running": false
      });
    }
  }

  handleTask(handler, thread, task) {
    const cleanUp = (handler, thread) => {
      thread["thread"].removeAllListeners("message");
      thread["thread"].removeAllListeners("error");
      thread["running"] = false;
      if (handler["queue"].length !== 0) {
        this.handleTask(handler, thread, handler["queue"].shift());
      }
    };
    thread["running"] = true;
    thread["thread"].once("message", (message) => {
      task["onMessage"](message);
      cleanUp(handler, thread);
    });
    thread["thread"].once("error", (error) => {
      task["onError"](error);
      cleanUp(handler, thread);
    });
    thread["thread"].postMessage(task["message"]);
  }

  work(scriptPath, message) {
    if (!this._.has(scriptPath)) {
      return null;
    }
    const handler = this._.get(scriptPath);
    return new Promise((resolve, reject) => {
      const task = {
        "message": message,
        "onMessage": resolve,
        "onError": reject
      };
      const thread = handler["threads"].find((e) => {return !e["running"];});
      if (thread == null) {
        handler["queue"].push(task);
      } else {
        this.handleTask(handler, thread, task);
      }
    });
  }

  unregister(scriptPath) {
    if (!isString(scriptPath)) {
      return;
    }
    for (const thread of this._.get(scriptPath)["threads"]) {
      thread["thread"].terminate();
    }
    this._.delete(scriptPath);
  }

  close() {
    for (const scriptPath of this._.keys()) {
      this.unregister(scriptPath);
    }
  }
}

module.exports = Worker;
