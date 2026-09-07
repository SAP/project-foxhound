/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/chat-assistant-loader.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Chat Assistant Loader",
  component: "chat-assistant-loader",
  parameters: {
    fluent: `smartwindow-nl-thinking = Looking for matching tabs...`,
  },
  argTypes: {
    mode: {
      control: { type: "select" },
      options: ["default", "search", "nl"],
    },
  },
};

const Template = ({ mode }) => html`
  <chat-assistant-loader .mode=${mode ?? "default"}></chat-assistant-loader>
`;

export const Default = Template.bind({});

export const Search = Template.bind({});
Search.args = {
  mode: "search",
};

export const NaturalLanguage = Template.bind({});
NaturalLanguage.args = {
  mode: "nl",
};
