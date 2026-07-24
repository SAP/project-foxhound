/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "../vendor/lit.all.mjs";
import "./moz-badge.mjs";

export default {
  title: "UI Widgets/Badge",
  component: "moz-badge",
  argTypes: {
    type: {
      control: "select",
      options: ["default", "new"],
    },
  },
  parameters: {
    status: "in-development",
    fluent: `
moz-badge =
    .label = Beta
    .title = Beta experiment
`,
  },
};

const Template = ({ label, iconSrc, title, l10nId, type }) => html`
  <moz-badge
    label=${label}
    iconSrc=${ifDefined(iconSrc)}
    title=${ifDefined(title)}
    data-l10n-id=${l10nId}
    type=${ifDefined(type)}
  ></moz-badge>
`;

export const Default = Template.bind({});
Default.args = {
  label: "Beta",
  l10nId: "moz-badge",
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  label: "Beta",
  iconSrc: "chrome://global/skin/icons/info.svg",
  l10nId: "moz-badge",
};

export const New = Template.bind({});
New.args = {
  label: "New",
  type: "new",
  l10nId: "moz-badge",
};
