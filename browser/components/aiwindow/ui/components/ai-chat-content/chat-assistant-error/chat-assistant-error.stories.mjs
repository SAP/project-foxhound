/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/chat-assistant-error.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Chat Assistant Error",
  component: "chat-assistant-error",
  argTypes: {
    errorStatus: {
      control: "select",
      options: [400, 413, 429, 500],
    },
    actionButton: {
      control: "object",
    },
    errorText: {
      control: "object",
    },
  },
  parameters: {
    fluent: `
smartwindow-assistant-error-generic-header = We could not proceed with your request, please try again.
smartwindow-assistant-error-budget-header = You’ve hit the maximum number of interactions allowed in a single day. Your access will reset at midnight ET.
smartwindow-assistant-error-budget-body = You can still search and navigate in Smart Window but chat functionality will be limited.
smartwindow-assistant-error-long-message-header = This chat has reached the maximum length. Clear the chat or start a new conversation to continue.
smartwindow-assistant-error-connection-header = Connection was lost or unsuccessful. Check your connection and try again.
smartwindow-retry-btn = Retry
smartwindow-switch-btn = Switch to Classic Window
smartwindow-clear-btn = Clear chat
    `,
  },
};

const Template = ({ errorStatus, errorText, actionButton }) => html`
  <chat-assistant-error
    .errorStatus=${errorStatus}
    .errorText=${errorText}
    .actionButton=${actionButton}
  ></chat-assistant-error>
`;

export const Default = Template.bind({});
Default.args = {
  errorStatus: 400,
  errorText: {
    header: "smartwindow-assistant-error-generic-header",
  },
  actionButton: null,
};

export const Budget = Template.bind({});
Budget.args = {
  errorStatus: 429,
  errorText: {
    header: "smartwindow-assistant-error-budget-header",
    body: "smartwindow-assistant-error-budget-body",
  },
  actionButton: {
    label: "smartwindow-switch-btn",
  },
};

export const Long = Template.bind({});
Long.args = {
  errorStatus: 413,
  errorText: {
    header: "smartwindow-assistant-error-long-message-header",
  },
  actionButton: null,
};

export const Connection = Template.bind({});
Connection.args = {
  errorStatus: 500,
  errorText: {
    header: "smartwindow-assistant-error-connection-header",
  },
  actionButton: {
    label: "smartwindow-retry-btn",
  },
};
