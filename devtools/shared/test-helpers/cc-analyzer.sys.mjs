/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { setTimeout } from "resource://gre/modules/Timer.sys.mjs";

/**
 * Helper class to retrieve CC/GC Logs via nsICycleCollectorListener interface.
 */
export class CCAnalyzer {
  clear() {
    this.processingCount = 0;
    this.graph = {};
    this.roots = [];
    this.garbage = [];
    this.edges = [];
    this.listener = null;
    this.count = 0;
  }

  /**
   * Run the analyzer by running the CC/GC, which would allow use
   * to call nsICycleCollectorListener.processNext()
   * which would call nsICycleCollectorListener.{noteRefCountedObject,noteGCedObject,noteEdge}.
   *
   * @param {boolean} wantAllTraces
   *        See nsICycleCollectorListener.allTraces() jsdoc.
   */
  async run(wantAllTraces = false) {
    this.clear();

    // Instantiate and configure the CC logger
    this.listener = Cu.createCCLogger();
    if (wantAllTraces) {
      dump("CC Analyzer >> all traces!\n");
      this.listener = this.listener.allTraces();
    }

    this.listener.disableLog = true;
    this.listener.wantAfterProcessing = true;

    // Register the CC logger
    Cu.forceCC(this.listener);

    // Process the entire heap step by step in 10K chunks
    let done = false;
    while (!done) {
      for (let i = 0; i < 10000; i++) {
        if (!this.listener.processNext(this)) {
          done = true;
          break;
        }
      }
      dump("Process CC/GC logs " + this.count + "\n");
      // Process next chunk after an event loop to avoid freezing the process
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    await new Promise(resolve => setTimeout(resolve, 0));
    dump("Done!\n");
  }

  noteRefCountedObject(address, refCount, objectDescription) {
    const o = this.ensureObject(address);
    o.address = address;
    o.refcount = refCount;
    o.name = objectDescription;
  }

  noteGCedObject(address, marked, objectDescription, compartmentAddr) {
    const o = this.ensureObject(address);
    o.address = address;
    o.gcmarked = marked;
    o.name = objectDescription;
    o.compartment = compartmentAddr;
  }

  noteEdge(fromAddress, toAddress, edgeName) {
    const fromObject = this.ensureObject(fromAddress);
    const toObject = this.ensureObject(toAddress);
    fromObject.edges.push({ name: edgeName, to: toObject });
    toObject.owners.push({ name: edgeName, from: fromObject });

    this.edges.push({
      name: edgeName,
      from: fromObject,
      to: toObject,
    });
  }

  describeRoot(address, knownEdges) {
    const o = this.ensureObject(address);
    o.root = true;
    o.knownEdges = knownEdges;
    this.roots.push(o);
  }

  describeGarbage(address) {
    const o = this.ensureObject(address);
    o.garbage = true;
    this.garbage.push(o);
  }

  ensureObject(address) {
    if (!this.graph[address]) {
      this.count++;
      this.graph[address] = new CCObject();
    }

    return this.graph[address];
  }

  find(text) {
    const result = [];
    for (const address in this.graph) {
      const o = this.graph[address];
      if (!o.garbage && o.name.includes(text)) {
        result.push(o);
      }
    }
    return result;
  }

  findNotJS() {
    const result = [];
    for (const address in this.graph) {
      const o = this.graph[address];
      if (!o.garbage && o.name.indexOf("JS") != 0) {
        result.push(o);
      }
    }
    return result;
  }
}

class CCObject {
  constructor() {
    this.name = "";
    this.address = null;
    this.refcount = 0;
    this.gcmarked = false;
    this.root = false;
    this.garbage = false;
    this.knownEdges = 0;
    this.edges = [];
    this.owners = [];
  }
}
