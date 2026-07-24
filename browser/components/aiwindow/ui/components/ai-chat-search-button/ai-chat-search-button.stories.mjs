/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/ai-chat-search-button.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Chat Search Button",
  component: "ai-chat-search-button",
  argTypes: {
    engineIcon: "",
    label: "Ada Lovelace",
    query: "Ada Lovelace",
  },
};

const Template = ({ engineIcon, label, query }) => html`
  <ai-chat-search-button
    .label=${label}
    .query=${query}
    .engineIcon=${engineIcon}
  ></ai-chat-search-button>
`;

export const Default = Template.bind({});
Default.args = {
  engineIcon: "chrome://global/skin/icons/more.svg" /* placeholder icon */,
  label: "Ada Lovelace",
  query: "Ada Lovelace",
};
