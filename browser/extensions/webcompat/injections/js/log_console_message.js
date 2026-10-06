/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals browser */

"use strict";

const msgs = window.wrappedJSObject.__webcompat;
delete window.wrappedJSObject.__webcompat;
delete window.wrappedJSObject.__webcompat_spoof_platform;

if (msgs?.size) {
  window.metadata ??= new Promise(resolve => {
    const port = browser.runtime.connect();
    port.onMessage.addListener(metadata => {
      resolve(metadata);
    });
  });

  window.metadata.then(({ bugNumber }) => {
    console.info(
      `${[...msgs].join(", ")} ${msgs.size > 1 ? "are" : "is"} being altered for compatibility reasons. See https://bugzil.la/${bugNumber} for details.`
    );
  });
}
