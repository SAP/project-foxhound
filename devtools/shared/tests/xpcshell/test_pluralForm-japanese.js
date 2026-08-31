/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * This unit test makes sure the plural form for Japanese works.
 * Japanese uses a legacy locale on gecko ja-JP-mac, which is not a valid locale
 * for Intl.Locale, so make sure PluralForm doesn't throw for this locale.
 * See Bug 1997708.
 */

const { PluralForm } = require("resource://devtools/shared/plural-form.js");

function run_test() {
  const origAvLocales = Services.locale.availableLocales;
  registerCleanupFunction(() => {
    Services.locale.availableLocales = origAvLocales;
  });

  Services.locale.availableLocales = ["ja-JP-mac", "en-US"];
  Services.locale.requestedLocales = ["ja-JP-mac"];
  PluralForm.init();

  // Japanese has 1 plural form
  Assert.equal(1, PluralForm.numForms());
}
