/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/ai-chat-message.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/AI Chat Message",
  component: "ai-chat-message",
  argTypes: {
    role: {
      options: ["user", "assistant"],
      control: { type: "select" },
    },
    content: {
      control: { type: "text" },
    },
  },
};

const Template = ({ role, content }) => html`
  <ai-chat-message .role=${role} .message=${content}></ai-chat-message>
`;

export const UserMessage = Template.bind({});
UserMessage.args = {
  role: "user",
  content: "Test: What is the weather like today?",
};

export const AssistantMessage = Template.bind({});
AssistantMessage.args = {
  role: "assistant",
  content:
    "Test: I don't have access to real-time weather data, but I can help you with other tasks!",
};

export const AssistantMessageWithMarkdown = Template.bind({});
AssistantMessageWithMarkdown.args = {
  role: "assistant",
  content:
    "Here's some **bold text** and *italic text*:\n\n- Item 1\n- Item 2\n\n```javascript\nconsole.log('code block');\n```",
};
