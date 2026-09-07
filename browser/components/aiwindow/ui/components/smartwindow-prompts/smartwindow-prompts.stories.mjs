/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/smartwindow-prompts.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Smartwindow Prompts",
  component: "smartwindow-prompts",
  argTypes: {
    mode: {
      options: ["sidebar", "fullpage"],
      control: { type: "select" },
    },
  },
};

const samplePrompts = [
  { text: "Write a first draft", type: "chat" },
  { text: "Brainstorm ideas", type: "chat" },
  { text: "Compare tabs", type: "chat" },
];

const Template = ({ mode, swPrompts }) => html`
  <div style="width: 100%; min-height: 400px; padding: 20px;">
    <smartwindow-prompts
      .mode=${mode}
      .swPrompts=${swPrompts}
      @prompt-selected=${e => {
        alert(`Selected: ${e.detail.text} (type: ${e.detail.type})`);
      }}
    ></smartwindow-prompts>
  </div>
`;

export const SidebarMode = Template.bind({});
SidebarMode.args = {
  mode: "sidebar",
  swPrompts: samplePrompts,
};

export const FullpageMode = Template.bind({});
FullpageMode.args = {
  mode: "fullpage",
  swPrompts: samplePrompts,
};
