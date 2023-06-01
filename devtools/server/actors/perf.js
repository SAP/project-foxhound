/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { Actor } = require("resource://devtools/shared/protocol.js");
const { perfSpec } = require("resource://devtools/shared/specs/perf.js");

const {
  actorBridgeWithSpec,
} = require("resource://devtools/server/actors/common.js");
const {
  ActorReadyGeckoProfilerInterface,
} = require("resource://devtools/shared/performance-new/gecko-profiler-interface.js");

/**
 * Pass on the events from the bridge to the actor.
 * @param {Object} actor The perf actor
 * @param {Array<string>} names The event names
 */
function _bridgeEvents(actor, names) {
  for (const name of names) {
    actor.bridge.on(name, (...args) => actor.emit(name, ...args));
  }
}

/**
 * The PerfActor wraps the Gecko Profiler interface
 */
exports.PerfActor = class PerfActor extends Actor {
  constructor(conn, targetActor) {
    super(conn, perfSpec);
    // The "bridge" is the actual implementation of the actor. It is separated
    // for historical reasons, and could be merged into this class.
    this.bridge = new ActorReadyGeckoProfilerInterface();

    _bridgeEvents(this, ["profiler-started", "profiler-stopped"]);
  }

  destroy() {
    super.destroy();
    this.bridge.destroy();
  }

  // Connect the rest of the ActorReadyGeckoProfilerInterface's methods to the PerfActor.
  startProfiler = actorBridgeWithSpec("startProfiler");
  stopProfilerAndDiscardProfile = actorBridgeWithSpec(
    "stopProfilerAndDiscardProfile"
  );
  getSymbolTable = actorBridgeWithSpec("getSymbolTable");
  getProfileAndStopProfiler = actorBridgeWithSpec("getProfileAndStopProfiler");
  isActive = actorBridgeWithSpec("isActive");
  isSupportedPlatform = actorBridgeWithSpec("isSupportedPlatform");
  getSupportedFeatures = actorBridgeWithSpec("getSupportedFeatures");
};
