/* This Source Code Form is subject to the terms of the Mozilla Public
      +  * License, v. 2.0. If a copy of the MPL was not distributed with this
      +  * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const ContentProcessStorage = require("resource://devtools/server/actors/resources/utils/content-process-storage.js");
const {
  CacheStorageActor,
} = require("resource://devtools/server/actors/resources/storage/cache.js");

class CacheWatcher extends ContentProcessStorage {
  constructor() {
    super(CacheStorageActor, "Cache");
  }
}

module.exports = CacheWatcher;
