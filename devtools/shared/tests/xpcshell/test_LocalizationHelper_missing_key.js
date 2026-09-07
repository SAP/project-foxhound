/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test that l10n helpers behave as expected when the key is missing from the
 * localization file.
 */

add_task(async function test_non_strict() {
  const { LocalizationHelper } = require("resource://devtools/shared/l10n.js");
  const helper = new LocalizationHelper(
    "devtools/client/locales/startup.properties"
  );

  Assert.equal(
    helper.getStr("key"),
    "key",
    "getStr should return the key in non-strict mode if the file is missing"
  );
  Assert.equal(
    helper.getFormatStr("key"),
    "key",
    "getFormatStr should return the key in non-strict mode if the file is missing"
  );
  Assert.equal(
    helper.getFormatStrWithNumbers("key"),
    "key",
    "getFormatStrWithNumbers should return the key in non-strict mode if the file is missing"
  );
});

add_task(async function test_strict() {
  const { LocalizationHelper } = require("resource://devtools/shared/l10n.js");
  const helper = new LocalizationHelper(
    "devtools/client/locales/startup.properties",
    true // strict=true
  );
  Assert.throws(
    () => helper.getStr("key"),
    /No localization found for \[key\]/,
    "Should throw when calling getStr in strict mode"
  );
  Assert.throws(
    () => helper.getFormatStr("key", "arg"),
    /No localization found for \[key\]/,
    "Should throw when calling getFormatStr in strict mode"
  );
  Assert.throws(
    () => helper.getFormatStrWithNumbers("key", 12),
    /No localization found for \[key\]/,
    "Should throw when calling getFormatStrWithNumbers in strict mode"
  );
});
