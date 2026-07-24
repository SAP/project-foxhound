/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1927121 - southerndevilhd.com product thumbnails do not appear
 *
 * The page relies on the non-standard WebKitMutationObserver,
 * which we can simply alias to MutationObserver.
 */

if (!window.WebKitMutationObserver) {
  console.info(
    "WebKitMutationObserver has been shimmed for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=1927121 for details."
  );

  window.WebKitMutationObserver = window.MutationObserver;
}
