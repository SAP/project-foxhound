/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line import/no-unresolved
import { html, ifDefined } from "lit.all.mjs";
import "./login-doorhanger-username-field.mjs";

export default {
  title:
    "Domain-specific UI Widgets/Credential Management/Doorhanger Username Field",
  component: "login-doorhanger-username-field",
  parameters: {
    status: "in-development",
    handles: ["change", "input", "dropmarker-click"],
    fluent: `
login-doorhanger-username-label =
  .label = Username:
    `,
  },
};

const Template = ({
  name: fieldName,
  value,
  disabled,
  l10nId,
  showDropmarker,
}) => html`
  <login-doorhanger-username-field
    name=${fieldName}
    value=${ifDefined(value || null)}
    ?disabled=${disabled}
    ?showdropmarker=${showDropmarker}
    data-l10n-id=${l10nId}
  ></login-doorhanger-username-field>
`;

export const Default = Template.bind({});
Default.args = {
  name: "doorhanger-username",
  value: "",
  disabled: false,
  l10nId: "login-doorhanger-username-label",
  showDropmarker: false,
};

export const WithDropmarker = Template.bind({});
WithDropmarker.args = {
  ...Default.args,
  value: "user@example.com",
  showDropmarker: true,
};
