/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  STATES: THREAD_STATES,
} = require("resource://devtools/server/actors/thread.js");

module.exports = {
  async addOrSetSessionDataEntry(
    targetActor,
    entries,
    isDocumentCreation,
    updateType
  ) {
    const { threadActor } = targetActor;
    // The thread actor has to be initialized in order to have functional breakpoints
    if (threadActor.state == THREAD_STATES.DETACHED) {
      threadActor.attach();
    }
    if (updateType == "set") {
      threadActor.setActiveEventBreakpoints(entries);
    } else {
      threadActor.addEventBreakpoints(entries);
    }
  },

  removeSessionDataEntry(targetActor, entries) {
    targetActor.threadActor.removeEventBreakpoints(entries);
  },
};
