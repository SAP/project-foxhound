/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/smartwindow-promo.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Smartwindow Promo",
  component: "smartwindow-promo",
  argTypes: {
    type: {
      options: ["default", "vibrant"],
      control: { type: "select" },
    },
    imageAlignment: {
      options: ["start", "end", "center"],
      control: { type: "select" },
    },
    imageWidth: {
      options: ["small", "large"],
      control: { type: "radio" },
    },
    imageDisplay: {
      options: ["cover", "padded"],
      control: { type: "radio" },
    },
  },
  parameters: {
    status: "in-development",
    docs: {
      description: {
        component:
          "An asrouter-driven promotional card rendered inside the AI window. Receives resolved content (heading, message, image, action labels) via the `message` property and dispatches `SmartWindowPromo:PrimaryAction`, `SmartWindowPromo:Close`, and `SmartWindowPromo:Impression` events.",
      },
    },
  },
};

const Template = ({
  type,
  heading,
  message,
  imageSrc,
  imageAlignment,
  imageWidth,
  imageDisplay,
  primaryActionText,
  secondaryActionText,
}) => html`
  <div style="width: 360px; padding: 16px;">
    <smartwindow-promo
      .message=${{
        type,
        heading,
        message,
        imageSrc,
        imageAlignment,
        imageWidth,
        imageDisplay,
        primaryActionText,
        secondaryActionText,
      }}
      @SmartWindowPromo:PrimaryAction=${() =>
        // eslint-disable-next-line no-console
        console.log("SmartWindowPromo:PrimaryAction")}
      @SmartWindowPromo:Close=${() =>
        // eslint-disable-next-line no-console
        console.log("SmartWindowPromo:Close")}
      @SmartWindowPromo:Impression=${() =>
        // eslint-disable-next-line no-console
        console.log("SmartWindowPromo:Impression")}
    ></smartwindow-promo>
  </div>
`;

export const Default = Template.bind({});
Default.args = {
  type: "vibrant",
  heading: "Make Smart Window your default?",
  message: "Firefox will open in Smart Window every time.",
  imageSrc:
    "chrome://browser/content/aiwindow/assets/smart-window-promo-default.svg",
  imageAlignment: "start",
  imageWidth: "small",
  imageDisplay: "padded",
  primaryActionText: "Set as default",
  secondaryActionText: "Not now",
};

export const PrimaryActionOnly = Template.bind({});
PrimaryActionOnly.args = {
  ...Default.args,
  secondaryActionText: "",
};

export const NoImage = Template.bind({});
NoImage.args = {
  ...Default.args,
  imageSrc: "",
};

export const DefaultType = Template.bind({});
DefaultType.args = {
  ...Default.args,
  type: "default",
};

export const LongCopy = Template.bind({});
LongCopy.args = {
  ...Default.args,
  heading: "A longer heading to verify wrapping inside the promo card",
  message:
    "A much longer message to confirm wrapping and spacing within the promo card across different image sizes and alignments.",
};
