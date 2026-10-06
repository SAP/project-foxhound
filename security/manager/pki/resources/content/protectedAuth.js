/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// The C++ side passes an nsIWritablePropertyBag2 through nsIWindowWatcher
// containing the token name and a unique id scoping the observer
// notifications, so a concurrent protected-auth dialog won't react to ours.
let args = window.arguments[0].QueryInterface(Ci.nsIWritablePropertyBag2);
let tokenName = args.getPropertyAsAString("tokenName");
let promptId = args.getPropertyAsAString("promptId");

// Register at script parse time as a defense against a slow DOMContentLoaded
// — the C++ side can't deliver this notification before the dialog window
// exists, but it can fire before our load handler has run.
Services.obs.addObserver(function observer(_subject, _topic, data) {
  if (data !== promptId) {
    return;
  }
  Services.obs.removeObserver(observer, "pk11-protected-auth-complete");
  window.close();
}, "pk11-protected-auth-complete");

window.addEventListener("DOMContentLoaded", async () => {
  let [text] = await document.l10n.formatValues([
    { id: "protected-auth-prompt", args: { tokenName } },
  ]);
  document.getElementById("tokenName").textContent = text;
  window.sizeToContent();
});

// Cancel button on the <dialog> element. Notify the C++ side so it can
// return SECFailure immediately; the window will close itself afterwards
// via the default dialogcancel handling.
document.addEventListener("dialogcancel", () => {
  Services.obs.notifyObservers(null, "pk11-protected-auth-cancel", promptId);
});
