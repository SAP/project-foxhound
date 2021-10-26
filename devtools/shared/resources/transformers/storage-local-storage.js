/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  TYPES: { LOCAL_STORAGE },
} = require("devtools/shared/resources/resource-watcher");

const { Front, types } = require("devtools/shared/protocol.js");

module.exports = function({ resource, watcher, targetFront }) {
  if (!(resource instanceof Front) && watcher) {
    // instantiate front for local storage
    resource = types.getType("localStorage").read(resource, targetFront);
    resource.resourceType = LOCAL_STORAGE;
    resource.resourceId = LOCAL_STORAGE;
    resource.resourceKey = "localStorage";
  }

  return resource;
};
