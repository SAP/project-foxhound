/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "../vendor/lit.all.mjs";
import "./moz-promo.mjs";
import "../moz-button/moz-button.mjs";
import "../moz-support-link/moz-support-link.mjs";

const fluentStrings = [
  "moz-promo-message",
  "moz-promo-message-heading",
  "moz-promo-message-heading-long",
];

export default {
  title: "UI Widgets/Promo",
  component: "moz-promo",
  argTypes: {
    type: {
      options: ["default", "vibrant"],
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
    width: {
      control: { type: "number" },
    },
    imageAlignment: {
      options: ["start", "end", "center"],
      control: { type: "select" },
    },
  },
  parameters: {
    status: "in-development",
    fluent: `
moz-promo-message =
  .message = Information about a new feature to check out
moz-promo-message-heading =
  .heading = Check out this new feature
  .message = Information about a new feature to check out
moz-promo-message-heading-long =
  .heading = A longer version of the heading to check for text wrapping, neat!
  .message = A much longer message to check text wrapping within the promotional element. A much longer message to check text wrapping within the promotional element.  
    `,
  },
};

const Template = ({
  type,
  heading,
  message,
  l10nId,
  width,
  imageSrc,
  imageAlignment,
  hasActionButton,
  hasSupportLink,
}) => html`
  <div style="width: ${width}px">
    <moz-promo
      type=${type}
      heading=${ifDefined(heading)}
      message=${ifDefined(message)}
      data-l10n-id=${ifDefined(l10nId)}
      imageSrc=${ifDefined(imageSrc)}
      imageAlignment=${ifDefined(imageAlignment)}
    >
      ${hasActionButton
        ? html` <moz-button slot="actions">Actions button</moz-button>`
        : ""}
      ${hasSupportLink
        ? html` <a is="moz-support-link" slot="support-link" href="#"></a>`
        : ""}
    </moz-promo>
  </div>
`;

export const Default = Template.bind({});
Default.args = {
  width: 600,
  type: "default",
  l10nId: "moz-promo-message",
  hasActionButton: false,
  hasSupportLink: false,
};

export const Vibrant = Template.bind({});
Vibrant.args = {
  ...Default.args,
  type: "vibrant",
};

export const WithHeading = Template.bind({});
WithHeading.args = {
  ...Vibrant.args,
  l10nId: "moz-promo-message-heading",
};

export const WithWrappedMessage = Template.bind({});
WithWrappedMessage.args = {
  ...Vibrant.args,
  width: 400,
  l10nId: "moz-promo-message-heading-long",
};

export const ImageAtStart = Template.bind({});
ImageAtStart.args = {
  ...Default.args,
  imageSrc: "chrome://global/skin/illustrations/about-license.svg",
  imageAlignment: "start",
};

export const ImageAtEnd = Template.bind({});
ImageAtEnd.args = {
  ...ImageAtStart.args,
  imageAlignment: "end",
};

export const ImageAtCenter = Template.bind({});
ImageAtCenter.args = {
  ...ImageAtStart.args,
  imageAlignment: "center",
};

export const SquareImage = Template.bind({});
SquareImage.args = {
  ...ImageAtStart.args,
};

export const RectangleImage = Template.bind({});
RectangleImage.args = {
  ...ImageAtStart.args,
  imageSrc: "chrome://global/content/aboutconfig/background.svg",
};

export const SlottedAction = Template.bind({});
SlottedAction.args = {
  ...Default.args,
  hasActionButton: true,
};

export const SlottedSupportLink = Template.bind({});
SlottedSupportLink.args = {
  ...Default.args,
  hasSupportLink: true,
};
