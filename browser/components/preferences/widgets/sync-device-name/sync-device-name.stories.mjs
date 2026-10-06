/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/preferences/widgets/sync-device-name.mjs";

export default {
  title: "Domain-specific UI Widgets/Settings/Sync Device Name",
  component: "sync-device-name",
  parameters: {
    status: "in-development",
  },
};

window.MozXULElement.insertFTLIfNeeded("browser/preferences/preferences.ftl");

const Template = ({ value = "", defaultValue = "", disabled = false }) => html`
  <div style="max-width: 500px">
    <sync-device-name
      value=${value}
      defaultvalue=${defaultValue}
      ?disabled=${disabled}
    ></sync-device-name>
  </div>
`;

export const Default = Template.bind({});
Default.args = {
  value: "My Device Name",
  disabled: false,
};

export const WithDefaultValue = Template.bind({});
WithDefaultValue.args = {
  ...Default.args,
  defaultValue: "My Default Device Name",
};

export const Disabled = Template.bind({});
Disabled.args = {
  ...Default.args,
  disabled: true,
};
