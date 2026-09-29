/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Inline caches and Ion replace a string held in an object slot with its atom,
// which carries no taint. Run this under every tier configuration:
// jstests.py --jitflags=all non262/taint

// The IC for a read of a global property atomized the string held in the slot
// and wrote the atom back.
var globalTainted = taint("global value");
function readGlobal() { return globalTainted; }
function globalPropertyTest() {
  for (var i = 0; i < 100; i++)
    assertFullTainted(readGlobal());
  assertFullTainted(globalTainted);
  assertFullTainted(globalThis.globalTainted);
}

globalPropertyTest();

if (typeof reportCompare === "function")
  reportCompare(true, true);
