/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/preferences/widgets/dialog-button.mjs";

export default {
  title: "Domain-specific UI Widgets/Settings/Dialog Button",
  component: "dialog-button",
};

window.gSubDialog = {
  open(dialogId = "dialog-id") {
    const dialog = document
      .querySelector("with-common-styles")
      .shadowRoot.getElementById(dialogId);

    if (!dialog) {
      console.error(`Dialog with id "${dialogId}" not found.`);
      return;
    }

    dialog.showModal();
  },
};

const Template = () => html`
  <dialog-button
    label="Manage certificates..."
    dialog="dialog-id"
  ></dialog-button>
  <dialog id="dialog-id">
    <form method="dialog">
      <p>Here's a dialog for demo purposes</p>
      <button>Close</button>
    </form>
  </dialog>
`;

export const Default = Template.bind({});
Default.args = {};
