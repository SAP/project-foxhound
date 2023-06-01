/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Resources = require("resource://devtools/server/actors/resources/index.js");

module.exports = {
  async addSessionDataEntry(targetActor, entries, isDocumentCreation) {
    await Resources.watchResources(targetActor, entries);
  },

  removeSessionDataEntry(targetActor, entries, isDocumentCreation) {
    Resources.unwatchResources(targetActor, entries);
  },
};
