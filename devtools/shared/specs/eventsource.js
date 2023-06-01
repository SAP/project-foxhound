/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const {
  Arg,
  generateActorSpec,
} = require("resource://devtools/shared/protocol.js");

// @backward-compat { version 111 } This spec file can be deleted when 111 is on
// the release channel.
const eventSourceSpec = generateActorSpec({
  typeName: "eventSource",

  /**
   * The set of events the EventSourceActor emits over RDP.
   */
  events: {
    // In order to avoid a naming collision, we rename the server event.
    serverEventSourceConnectionClosed: {
      type: "eventSourceConnectionClosed",
      httpChannelId: Arg(0, "number"),
    },
    serverEventReceived: {
      type: "eventReceived",
      httpChannelId: Arg(0, "number"),
      data: Arg(1, "json"),
    },
  },

  methods: {
    startListening: {
      request: {},
      oneway: true,
    },
    stopListening: {
      request: {},
      oneway: true,
    },
  },
});

exports.eventSourceSpec = eventSourceSpec;
