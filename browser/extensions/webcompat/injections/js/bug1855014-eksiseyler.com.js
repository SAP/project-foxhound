/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * eksiseyler.com - Set window.loggingEnabled = false
 * WebCompat issue #77221 - https://webcompat.com/issues/77221
 *
 * A scripting error on the site causes images to not load unless
 * window.loggingEnabled = false
 */

if (typeof loggingEnabled == "undefined") {
  console.info(
    "loggingEnabled been set to true for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=1855014 for details."
  );

  window.loggingEnabled = false;
}
