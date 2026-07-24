/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Bug 1963270 - app.kosmi.io - missing "local file" media selection option
 *
 * The site does not show its "local file" option when selecting media
 * unless the captureStream API is available, and does not check for the
 * prefixed version (which it seems to work with, so we unprefix it here).
 */

if (!HTMLMediaElement.captureStream) {
  console.info(
    "HTMLMediaElement.captureStream has been set to HTMLMediaElement.mozCaptureStream for compatibility reasons. See https://bugzilla.mozilla.org/show_bug.cgi?id=1963270 for details."
  );

  const { prototype } = HTMLMediaElement;
  prototype.captureStream = prototype.mozCaptureStream;
}
