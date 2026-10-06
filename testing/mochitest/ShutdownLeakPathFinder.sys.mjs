/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Uses parallel arrays indexed by node ID to minimize allocations when
// processing large CC graphs.

export class ShutdownLeakPathFinder {
  constructor() {
    this.addressToIndex = new Map();
    this.addresses = [];
    this.names = [];
    this.refcounts = [];

    // Edges as parallel arrays.
    this.edgeFroms = [];
    this.edgeTos = [];
    this.edgeNames = [];

    // Sparse per-node properties.
    this.rootKnownEdges = new Map();
    this.garbageNodes = new Set();

    // Reverse adjacency list, built after capture.
    this.ownerOffsets = null;
  }

  async findAndPrintPaths(leakedWindows, logger) {
    logger.info(
      "ShutdownLeakPathFinder | Capturing CC graph to find leak paths " +
        "for " +
        leakedWindows.length +
        " leaked window(s) - this may take a moment..."
    );

    this._captureGraph();
    this._buildOwnerIndex();

    logger.info(
      "ShutdownLeakPathFinder | CC graph captured (" +
        this.addresses.length +
        " nodes). Searching for leak paths..."
    );

    for (let info of leakedWindows) {
      let idx = this.addressToIndex.get(info.address);
      if (idx === undefined) {
        this._logLeak(logger, info, {
          detail: "not found in CC graph at " + info.address,
        });
        continue;
      }

      let path = this._findPathToRoot(idx);
      if (!path) {
        let detail = "no path to root found";
        if (this.garbageNodes.has(idx)) {
          detail += " (garbage cycle)";
        }
        this._logLeak(logger, info, { idx, detail });
        continue;
      }

      this._logLeak(logger, info, { path });
    }
  }

  _captureGraph() {
    let start = ChromeUtils.now();
    let listener = Cu.createCCLogger();
    listener = listener.allTraces();
    listener.disableLog = true;
    listener.wantAfterProcessing = true;

    Cu.forceCC(listener);

    while (listener.processNext(this)) {
      // processNext returns true if there is more data.
    }

    ChromeUtils.addProfilerMarker("ShutdownLeaks:captureGraph", {
      category: "Test",
      startTime: start,
    });
  }

  _buildOwnerIndex() {
    let nodeCount = this.addresses.length;
    let owners = new Array(nodeCount).fill(null);
    for (let i = 0; i < this.edgeFroms.length; i++) {
      let to = this.edgeTos[i];
      if (!owners[to]) {
        owners[to] = [i];
      } else {
        owners[to].push(i);
      }
    }
    this.ownerOffsets = owners;
  }

  noteRefCountedObject(address, refCount, name) {
    let idx = this._ensureIndex(address);
    this.refcounts[idx] = refCount;
    this.names[idx] = name;
  }

  noteGCedObject(address, marked, name) {
    let idx = this._ensureIndex(address);
    this.names[idx] = name;
  }

  noteEdge(fromAddress, toAddress, edgeName) {
    this.edgeFroms.push(this._ensureIndex(fromAddress));
    this.edgeTos.push(this._ensureIndex(toAddress));
    this.edgeNames.push(edgeName);
  }

  noteWeakMapEntry(mapAddr, keyAddr, keyDelegateAddr, valueAddr) {
    if (valueAddr == "0x0") {
      return;
    }
    // A weak map entry keeps the value alive if both the map and the key are
    // alive. As an approximation, we only record the edge from the key to the
    // value, ignoring the path to the map (which is usually a global variable
    // and less interesting). We also ignore key delegates.
    let fromAddr = keyAddr != "0x0" ? keyAddr : mapAddr;
    if (fromAddr == "0x0") {
      return;
    }
    this.edgeFroms.push(this._ensureIndex(fromAddr));
    this.edgeTos.push(this._ensureIndex(valueAddr));
    this.edgeNames.push("WeakMap value via key " + keyAddr);
  }

  describeRoot(address, knownEdges) {
    this.rootKnownEdges.set(this._ensureIndex(address), knownEdges);
  }

  describeGarbage(address) {
    this.garbageNodes.add(this._ensureIndex(address));
  }

  _ensureIndex(address) {
    let idx = this.addressToIndex.get(address);
    if (idx === undefined) {
      idx = this.addresses.length;
      this.addressToIndex.set(address, idx);
      this.addresses.push(address);
      this.names.push("");
      this.refcounts.push(0);
    }
    return idx;
  }

  // BFS backward through owners using a parent map for path reconstruction.
  _findPathToRoot(targetIdx) {
    let nodeCount = this.addresses.length;
    let parentNode = new Int32Array(nodeCount).fill(-1);
    let parentEdge = new Int32Array(nodeCount).fill(-1);
    let visited = new Uint8Array(nodeCount);
    visited[targetIdx] = 1;

    let queue = [targetIdx];
    let head = 0;

    while (head < queue.length) {
      let current = queue[head++];
      if (this.rootKnownEdges.has(current)) {
        let nodeIndices = [];
        let edgeIndices = [];
        let cur = current;
        while (cur !== targetIdx) {
          nodeIndices.push(cur);
          edgeIndices.push(parentEdge[cur]);
          cur = parentNode[cur];
        }
        nodeIndices.push(targetIdx);
        return { nodeIndices, edgeIndices };
      }
      let owners = this.ownerOffsets[current];
      if (!owners) {
        continue;
      }
      for (let e of owners) {
        let owner = this.edgeFroms[e];
        if (!visited[owner]) {
          visited[owner] = 1;
          parentNode[owner] = current;
          parentEdge[owner] = e;
          queue.push(owner);
        }
      }
    }
    return null;
  }

  _extractURL(name) {
    // CC node names for windows look like:
    //   "nsGlobalWindowInner # 124 inner chrome://browser/content/browser.xhtml"
    //   "nsGlobalWindowOuter # 123 outer "
    let match = name.match(
      /nsGlobalWindow(?:Inner|Outer) # \d+ (?:inner|outer) (\S+)/
    );
    return match ? match[1] : null;
  }

  _formatNode(idx) {
    let name = this.names[idx];
    // "JS Object (Function - getChromeURI)" -> "JS Function - getChromeURI"
    name = name.replace(/^JS Object \((.+)\)$/, "JS $1");
    let rootInfo = "";
    if (this.rootKnownEdges.has(idx)) {
      let unknownRefs = this.refcounts[idx] - this.rootKnownEdges.get(idx);
      rootInfo = " [root, " + unknownRefs + " unknown ref(s)]";
    }
    return name + rootInfo;
  }

  // Log a leaked window as a structured test_status FAIL.
  // If |path| is provided, format the retention path as the stack.
  // Otherwise use |idx| (node index) and |detail| for context.
  _logLeak(logger, windowInfo, { idx = null, detail = null, path = null }) {
    let stack;
    let url;

    if (path) {
      let { nodeIndices, edgeIndices } = path;
      let lines = [];
      for (let i = 0; i < nodeIndices.length; i++) {
        let ni = nodeIndices[i];
        let node = this._formatNode(ni) + " @ " + this.addresses[ni];
        if (i === 0) {
          lines.push(node);
        } else {
          lines.push("  " + this.edgeNames[edgeIndices[i - 1]] + " — " + node);
        }
      }
      stack = lines.join("\n");
      let targetIdx = nodeIndices[nodeIndices.length - 1];
      url = this._extractURL(this.names[targetIdx]);
    } else {
      let nodeDesc =
        idx != null ? this._formatNode(idx) : "serial=" + windowInfo.serial;
      stack = nodeDesc + "\n" + detail;
      url = idx != null ? this._extractURL(this.names[idx]) : null;
    }

    let data = {
      test: windowInfo.test,
      subtest: "Shutdown",
      status: "FAIL",
      expected: "PASS",
      message:
        "leaked window until shutdown [url = " + (url || "unknown") + "]",
      stack,
    };
    if (windowInfo.time) {
      data.time = windowInfo.time;
    }
    logger.logData("test_status", data);
  }
}
