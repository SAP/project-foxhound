/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import MozButton from "chrome://global/content/elements/moz-button.mjs";

class DialogButton extends MozButton {
  /**
   * @param {string} dialog - The chrome url of the dialog to open.
   * @param {string} features - The window features for the dialog. They get
   * directly passed into window.openDialog.
   * @param {Array} dialogArgs - The arguments to pass into the dialog's content
   * window. These arguments are dialog specific.
   */
  static properties = {
    dialog: { type: String },
    features: { type: String },
    dialogArgs: { type: Array },
  };

  constructor() {
    super();
    this.ariaHasPopup = "dialog";
  }

  firstUpdated() {
    super.firstUpdated();
    this.addEventListener("click", this.onClick.bind(this));
  }

  onClick() {
    let dialog = this.getAttribute("dialog");
    let features = this.getAttribute("features");
    let dialogOptions = features ? { features } : undefined;
    let targetDialogWindowArguments = this.dialogArgs ?? [];
    window.gSubDialog.open(
      dialog,
      dialogOptions,
      ...targetDialogWindowArguments
    );
  }
}
customElements.define("dialog-button", DialogButton);
