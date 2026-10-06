/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var gRemovePasswordDialog = {
  _token: null,
  _okButton: null,
  _password: null,
  init() {
    this._okButton = document.getElementById("removemp").getButton("accept");
    document.l10n.setAttributes(this._okButton, "pw-remove-button");
    this._password = document.getElementById("password");
    this._token = Cc["@mozilla.org/security/internalkeytoken;1"].createInstance(
      Ci.nsIPKCS11Token
    );
    document.addEventListener("dialogaccept", event =>
      this.removePassword(event)
    );
  },

  async createAlert(titleL10nId, messageL10nId) {
    const [title, message] = await document.l10n.formatValues([
      { id: titleL10nId },
      { id: messageL10nId },
    ]);
    Services.prompt.alert(window, title, message);
  },

  removePassword(event) {
    try {
      this._token.changePassword(this._password.value, "");
      this.createAlert("pw-change-success-title", "settings-pp-erased-ok");
    } catch (e) {
      this.createAlert("pw-change-failed-title", "incorrect-pp");
      event.preventDefault();
    }
  },
};

window.addEventListener("load", () => gRemovePasswordDialog.init());
