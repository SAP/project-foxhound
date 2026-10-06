/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line import/no-unresolved
import { html } from "lit.all.mjs";
import "./asrouter-newtab-message.mjs";
import cssFile from "./asrouter-newtab-message.css";

window.MozXULElement.insertFTLIfNeeded("browser/newtab/newtab.ftl");

export default {
  title: "Domain-specific UI Widgets/ASRouter/ASRouter New Tab Message",
  component: "asrouter-newtab-message",
  argTypes: {},
};

const Template = ({ messageData }) => html`
  <style>
    .asrouter-newtab-message-wrapper {
      background-color: var(--background-color-canvas);
      border: 2px solid var(--card-border-color);
      color: var(--text-color);
      border-radius: var(--border-radius-large);
      margin-block: 0 var(--space-xlarge);
      margin-inline: auto;
      overflow: hidden;
      max-width: 904px;
    }
  </style>
  <div class="asrouter-newtab-message-wrapper">
    <asrouter-newtab-message
      .messageData=${messageData}
      .cssOverride=${cssFile}
      .handleBlock=${() =>
        console.warn("handleBlock called — message permanently blocked")}
      .handleDismiss=${() =>
        console.warn(
          "handleDismiss called — DISMISS telemetry sent, message closed"
        )}
      .handleClose=${() => console.warn("handleClose called — message closed")}
      .handleClick=${source =>
        console.warn(
          `handleClick called — CLICK telemetry sent, source: ${source}`
        )}
    ></asrouter-newtab-message>
  </div>
`;

const BASE_MESSAGE = {
  id: "TEST_ASROUTER_NEWTAB_MESSAGE",
  template: "newtab_message",
  content: {
    messageType: "ASRouterNewTabMessage",
    // eslint-disable-next-line mozilla/no-newtab-refs-outside-newtab
    imageSrc: "chrome://newtab/content/data/content/assets/kit-in-circle.svg",
    heading: "Test Heading",
    body: "This is a test message body.",
    primaryButton: {
      label: "Primary Action",
      action: {
        type: "OPEN_URL",
        data: { args: "https://www.mozilla.org/" },
      },
    },
  },
  trigger: {
    id: "newtabMessageCheck",
  },
  groups: [],
};

export const Default = Template.bind({});
Default.args = {
  messageData: BASE_MESSAGE,
};

export const WithSecondaryButton = Template.bind({});
WithSecondaryButton.args = {
  messageData: {
    ...BASE_MESSAGE,
    content: {
      ...BASE_MESSAGE.content,
      secondaryButton: {
        label: "Not now",
        action: { type: "CANCEL" },
      },
    },
  },
};

export const WithoutDismissButton = Template.bind({});
WithoutDismissButton.args = {
  messageData: {
    ...BASE_MESSAGE,
    content: {
      ...BASE_MESSAGE.content,
      hideDismissButton: true,
    },
  },
};

export const DismissOnSecondaryButton = Template.bind({});
DismissOnSecondaryButton.args = {
  messageData: {
    ...BASE_MESSAGE,
    content: {
      ...BASE_MESSAGE.content,
      secondaryButton: {
        label: "Not Now",
        action: {
          dismiss: true,
        },
      },
    },
  },
};

export const BlockOnSecondaryButton = Template.bind({});
BlockOnSecondaryButton.args = {
  messageData: {
    ...BASE_MESSAGE,
    content: {
      ...BASE_MESSAGE.content,
      secondaryButton: {
        label: "No Thanks",
        action: {
          type: "BLOCK_MESSAGE",
          data: { id: "TEST_ASROUTER_NEWTAB_MESSAGE" },
        },
      },
    },
  },
};

export const NoImage = Template.bind({});
NoImage.args = {
  messageData: {
    ...BASE_MESSAGE,
    content: {
      ...BASE_MESSAGE.content,
      imageSrc: "",
    },
  },
};
