/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

document.addEventListener("dialogaccept", resetPassword);

async function resetPassword() {
  var token = Cc["@mozilla.org/security/internalkeytoken;1"].createInstance(
    Ci.nsIPKCS11Token
  );
  token.reset();

  try {
    await Services.logins.removeAllUserFacingLoginsAsync();
  } catch (e) {}

  let l10n = new Localization(["security/pippki/pippki.ftl"], true);
  if (l10n) {
    Services.prompt.alert(
      window,
      l10n.formatValueSync("pippki-reset-password-confirmation-title"),
      l10n.formatValueSync("pippki-reset-password-confirmation-message")
    );
  }
}
