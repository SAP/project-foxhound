/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/input-cta.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Input CTA",
  component: "input-cta",
  parameters: {
    fluent: `
aiwindow-input-cta-submit-label-chat = Ask
aiwindow-input-cta-submit-label-search = Search
aiwindow-input-cta-submit-label-navigate = Go
    `,
  },
  argTypes: {
    action: {
      options: ["", "chat", "search", "navigate"],
      control: { type: "select" },
    },
  },
};

const Template = ({ action }) => html`
  <input-cta .action=${action}></input-cta>
`;

export const Disabled = Template.bind({});

export const Chat = Template.bind({});
Chat.args = {
  action: "chat",
};

export const Search = Template.bind({});
Search.args = {
  action: "search",
};

export const Navigate = Template.bind({});
Navigate.args = {
  action: "navigate",
};
