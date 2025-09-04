/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const {
  generateActorSpec,
  RetVal,
  Option,
} = require("resource://devtools/shared/protocol.js");

const processDescriptorSpec = generateActorSpec({
  typeName: "processDescriptor",

  methods: {
    getTarget: {
      request: {},
      response: {
        process: RetVal("json"),
      },
    },
    getWatcher: {
      request: {
        // Added in Fx137 for Vs.Code
        enableWindowGlobalThreadActors: Option(0, "boolean"),
      },
      response: RetVal("watcher"),
    },
    reloadDescriptor: {
      request: {
        bypassCache: Option(0, "boolean"),
      },
      response: {},
    },
  },

  events: {
    "descriptor-destroyed": {
      type: "descriptor-destroyed",
    },
  },
});

exports.processDescriptorSpec = processDescriptorSpec;
