/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "../vendor/lit.all.mjs";
import "./moz-message-bar.mjs";
import "../moz-support-link/moz-support-link.mjs";

const fluentStrings = [
  "moz-message-bar-message",
  "moz-message-bar-message-heading",
  "moz-message-bar-message-heading-long",
  "moz-message-bar-message-with-link",
];

export default {
  title: "UI Widgets/Message Bar",
  component: "moz-message-bar",
  argTypes: {
    type: {
      options: ["info", "warning", "success", "error"],
      control: { type: "select" },
    },
    l10nId: {
      options: fluentStrings,
      control: { type: "select" },
    },
    heading: {
      table: {
        disable: true,
      },
    },
    message: {
      table: {
        disable: true,
      },
    },
  },
  parameters: {
    status: "stable",
    fluent: `
moz-message-bar-message =
  .message = For your information message
moz-message-bar-message-heading =
  .heading = Heading
  .message = For your information message
moz-message-bar-message-heading-long =
  .heading = A longer heading to check text wrapping in the message bar
  .message = Some message that we use to check text wrapping. Some message that we use to check text wrapping.
moz-message-bar-button = Click me!
moz-message-bar-message-slot = This is a message inside of a slot that contains a <a data-l10n-name="moz-message-bar-link">link</a>
    `,
  },
};

const Template = ({
  type,
  heading,
  message,
  l10nId,
  dismissable,
  hasSupportLink,
  hasActionButton,
  hasSlottedMessage,
}) => html`
  <moz-message-bar
    type=${type}
    heading=${ifDefined(heading)}
    message=${ifDefined(message)}
    data-l10n-id=${ifDefined(l10nId)}
    ?dismissable=${dismissable}
  >
    ${hasSlottedMessage
      ? html` <span slot="message" data-l10n-id="moz-message-bar-message-slot"
          ><a
            data-l10n-name="moz-message-bar-link"
            href="http://example.com"
          ></a
        ></span>`
      : ""}
    ${hasSupportLink
      ? html`
          <a
            is="moz-support-link"
            support-page="addons"
            slot="support-link"
          ></a>
        `
      : ""}
    ${hasActionButton
      ? html`
          <button data-l10n-id="moz-message-bar-button" slot="actions"></button>
        `
      : ""}
  </moz-message-bar>
`;

export const Default = Template.bind({});
Default.args = {
  type: "info",
  l10nId: "moz-message-bar-message",
  dismissable: false,
  hasSupportLink: false,
  hasActionButton: false,
  hasSlottedMessage: false,
};

export const Dismissable = Template.bind({});
Dismissable.args = {
  type: "info",
  l10nId: "moz-message-bar-message",
  dismissable: true,
  hasSupportLink: false,
  hasActionButton: false,
};

export const WithActionButton = Template.bind({});
WithActionButton.args = {
  type: "info",
  l10nId: "moz-message-bar-message",
  dismissable: false,
  hasSupportLink: false,
  hasActionButton: true,
};

export const WithSupportLink = Template.bind({});
WithSupportLink.args = {
  type: "info",
  l10nId: "moz-message-bar-message",
  dismissable: false,
  hasSupportLink: true,
  hasActionButton: false,
};

export const WithHeading = Template.bind({});
WithHeading.args = {
  ...Default.args,
  l10nId: "moz-message-bar-message-heading",
};

export const WithMessageSlot = Template.bind({});
WithMessageSlot.args = {
  ...Default.args,
  hasSlottedMessage: true,
};
