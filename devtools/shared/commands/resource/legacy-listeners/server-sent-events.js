/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const ResourceCommand = require("resource://devtools/shared/commands/resource/resource-command.js");

// @backward-compat { version 111 } The serverSentEvent legacy listener can be
// deleted when 111 is on the release channel.
module.exports = async function({ targetFront, onAvailable }) {
  if (!targetFront.getTrait("isBrowsingContext")) {
    // This resource is only available on browsing-context targets.
    return;
  }
  const eventSourceFront = await targetFront.getFront("eventSource");
  eventSourceFront.startListening();

  eventSourceFront.on("eventSourceConnectionClosed", httpChannelId => {
    const resource = createResource("eventSourceConnectionClosed", {
      httpChannelId,
    });
    onAvailable([resource]);
  });

  eventSourceFront.on("eventReceived", (httpChannelId, data) => {
    const resource = createResource("eventReceived", { httpChannelId, data });
    onAvailable([resource]);
  });
};

function createResource(messageType, eventParams) {
  return {
    resourceType: ResourceCommand.TYPES.SERVER_SENT_EVENT,
    messageType,
    ...eventParams,
  };
}
