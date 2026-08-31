/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/chat-assistant-error.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Chat Assistant Error",
  component: "chat-assistant-error",
  argTypes: {
    error: {
      control: "object",
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
smartwindow-assistant-error-generic-header = Something went wrong. Please try again.
smartwindow-assistant-error-budget-header = You’ve reached today’s chat limit.
smartwindow-assistant-error-budget-body = You can still browse in this window. Chat will be available again after midnight ET.
smartwindow-assistant-error-many-requests-header = Please wait a moment and try again. Too many messages were sent in a short time.
smartwindow-assistant-error-max-length-header = It’s time to start a new chat. This one’s reached its length limit.
smartwindow-retry-btn = Try Again
smartwindow-clear-btn = New chat
    `,
  },
};

const Template = ({ error, errorText, actionButton }) => html`
  <chat-assistant-error
    .error=${error}
    .errorText=${errorText}
    .actionButton=${actionButton}
  ></chat-assistant-error>
`;

export const Default = Template.bind({});
Default.args = {
  error: {
    error: "generic error message that is not a number",
  },
  errorText: {
    header: "smartwindow-assistant-error-generic-header",
  },
  actionButton: {
    label: "smartwindow-retry-btn",
  },
};

export const Budget = Template.bind({});
Budget.args = {
  error: {
    error: 1,
  },
  errorText: {
    header: "smartwindow-assistant-error-budget-header",
    body: "smartwindow-assistant-error-budget-body",
  },
};

export const ManyRequests = Template.bind({});
ManyRequests.args = {
  error: {
    error: 2,
  },
  errorText: {
    header: "smartwindow-assistant-error-many-requests-header",
  },
};

export const MaxLength = Template.bind({});
MaxLength.args = {
  error: {
    error: 3,
  },
  errorText: {
    header: "smartwindow-assistant-error-max-length-header",
  },
  actionButton: {
    label: "smartwindow-clear-btn",
  },
};
