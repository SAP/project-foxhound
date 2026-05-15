/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";
requestLongerTimeout(2);

// Test that an element referring to another element via multiple attributes doesn't result in a crash.
// https://bugzilla.mozilla.org/show_bug.cgi?id=2008810
addAccessibleTask(
  `
  <label id="label" for="output" aria-labelledby="output"></label>
  <output id="output"></output>
  `,
  async function test(browser, accDoc) {
    const label = findAccessibleChildByID(accDoc, "label");
    const output = findAccessibleChildByID(accDoc, "output");

    await testCachedRelation(output, RELATION_LABEL_FOR, label);
    await testCachedRelation(output, RELATION_LABELLED_BY, label);
  }
);
