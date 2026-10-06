/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/preferences/widgets/update-state.mjs";

export default {
  title: "Domain-specific UI Widgets/Settings/Update State",
  component: "update-state",
  parameters: {
    status: "in-development",
  },
  argTypes: {
    value: {
      control: "select",
      options: [
        "checkForUpdates",
        "apply",
        "checkingForUpdates",
        "downloading",
        "applying",
        "downloadFailed",
        "policyDisabled",
        "noUpdatesFound",
        "checkingFailed",
        "otherInstanceHandlingUpdates",
        "manualUpdate",
        "unsupportedSystem",
        "restarting",
        "internalError",
      ],
    },
  },
};

window.MozXULElement.insertFTLIfNeeded("browser/aboutDialog.ftl");

const Template = ({
  value = "",
  linkURL = "https://support.mozilla.org",
  transfer = "1.0 of 1.4 KB",
}) => html`
  <div style="max-width: 700px">
    <update-state
      value=${ifDefined(value)}
      linkURL=${linkURL}
      transfer=${transfer}
    ></update-state>
  </div>
`;

export const Default = Template.bind({});
Default.args = {
  value: "noUpdatesFound",
};
