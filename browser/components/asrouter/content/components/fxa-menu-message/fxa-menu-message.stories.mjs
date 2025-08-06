/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line import/no-unresolved
import { html } from "lit.all.mjs";
import "chrome://global/content/elements/moz-card.mjs";
import "./fxa-menu-message.mjs";

export default {
  title: "Domain-specific UI Widgets/ASRouter/FxA Menu Message",
  component: "fxa-menu-message",
  argTypes: {},
};

const Template = ({
  buttonText,
  imageURL,
  primaryText,
  secondaryText,
  imageVerticalOffset,
}) => html`
  <moz-card style="width: 22.5rem;">
    <fxa-menu-message
      buttonText="${buttonText}"
      primaryText="${primaryText}"
      secondaryText="${secondaryText}"
      imageURL="${imageURL}"
      style="--illustration-margin-block-offset: ${imageVerticalOffset}px"
    >
    </fxa-menu-message>
  </moz-card>
`;

export const Default = Template.bind({});
Default.args = {
  buttonText: "Sign up",
  imageURL:
    "chrome://browser/content/asrouter/assets/fox-with-box-on-cloud.svg",
  primaryText: "Bounce between devices",
  secondaryText:
    "Sync and encrypt your bookmarks, passwords, and more on all your devices.",
  imageVerticalOffset: -20,
};
