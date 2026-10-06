/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/ai-chat-content.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/AI Chat Content",
  component: "ai-chat-content",
  argTypes: {
    conversationState: { control: { type: "object" } },
  },
  parameters: {
    fluent: `
aiwindow-memories-used =
  .label = Memories used
aiwindow-retry-without-memories =
  .label = Retry without memories
aiwindow-retry =
  .tooltiptext = Retry
aiwindow-copy-message =
  .tooltiptext = Copy
    `,
  },
};

const Template = ({ conversationState }) => html`
  <ai-chat-content .conversationState=${conversationState}></ai-chat-content>
`;

export const Empty = Template.bind({});
Empty.args = { conversationState: [] };

export const SingleUserMessage = Template.bind({});
SingleUserMessage.args = {
  conversationState: [
    { role: "user", body: "What is the weather like today?" },
  ],
};

export const Conversation = Template.bind({});
Conversation.args = {
  conversationState: [
    { role: "user", body: "What is the weather like today?" },
    {
      role: "assistant",
      messageId: "a1",
      body: "I don't have access to real-time weather data, but I can help you with other tasks!",
      appliedMemories: [],
    },
    { role: "user", body: "Can you help me with coding?" },
    {
      role: "assistant",
      messageId: "a2",
      body: "Yes, I can help you with coding! What programming language or problem are you working on?",
      appliedMemories: [
        "Looking for help with coding",
        "Looking for real time weather data",
      ],
    },
  ],
};
