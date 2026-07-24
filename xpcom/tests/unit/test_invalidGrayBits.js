/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Check that the CC handles invalid gray bits without triggering an
// assertion. This condition arises due to OOM and rare in actual use.

function run_test() {
  // Create some weak map entries that may need to have their gray marking
  // fixed.
  let wm = new WeakMap();
  let key = {};
  wm.set(key, {});
  Cu.getJSTestingFunctions().minorgc();

  // Mark gray bits as invalid.
  Cu.getJSTestingFunctions().setGrayBitsInvalid();

  // Cycle collect.
  Cu.forceCC();
}
