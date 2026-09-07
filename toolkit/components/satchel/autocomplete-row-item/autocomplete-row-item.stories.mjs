/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line import/no-unresolved
import { html } from "lit.all.mjs";
import "./autocomplete-row-item.mjs";

export default {
  title: "Domain-specific UI Widgets/Credential Management/Autocomplete",
  component: "autocomplete-row-item",
  argTypes: {
    label: { control: { type: "text" } },
    description: { control: { type: "text" } },
    value: { control: { type: "text" } },
    icon: { control: { type: "text" } },
    actions: { control: { type: "object" } },
  },
};

const Template = ({ label, description, value, icon, actions }) => html`
  <autocomplete-row-item
    .label=${label}
    .description=${description}
    .value=${value}
    .icon=${icon}
    .actions=${actions}
  ></autocomplete-row-item>
`;

export const Default = Template.bind({});
Default.args = {
  label: "example@example.com",
  description: "From this website",
  value: "example@example.com",
  icon: "chrome://global/skin/icons/defaultFavicon.svg",
  actions: {
    primary: () => alert("Primary action!"),
  },
};

export const WithSingleSecondaryAction = Template.bind({});
WithSingleSecondaryAction.args = {
  label: "example@example.com",
  description: "From this website",
  value: "example@example.com",
  icon: "chrome://global/skin/icons/defaultFavicon.svg",
  actions: {
    primary: () => alert("Primary action!"),
    secondary: {
      type: "edit",
      action: () => alert("secondary action"),
    },
  },
};
