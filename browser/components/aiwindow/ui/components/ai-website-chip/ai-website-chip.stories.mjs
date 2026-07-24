/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/ai-website-chip.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Website Chip",
  component: "ai-website-chip",
  argTypes: {
    type: {
      control: "select",
      options: ["in-line", "context-chip"],
    },
    label: {
      control: "text",
    },
    iconSrc: {
      control: "text",
    },
    href: {
      control: "text",
    },
  },
  parameters: {
    fluent: `
aiwindow-website-chip-placeholder = Tag a tab or site
aiwindow-website-chip-remove-button =
  .aria-label = Remove
    `,
  },
};

const Template = ({ type, label, iconSrc, href }) => html`
  <ai-website-chip
    .type=${type}
    .label=${label}
    .iconSrc=${iconSrc}
    .href=${href || ""}
  ></ai-website-chip>
`;

export const InLineDefault = Template.bind({});
InLineDefault.args = {
  type: "in-line",
  label: "mozilla.org",
  iconSrc: "chrome://branding/content/about-logo.svg",
};

export const InLineEmpty = Template.bind({});
InLineEmpty.args = {
  type: "in-line",
  label: "",
  iconSrc: "",
};

export const InLineCollection = () => html`
  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
    <ai-website-chip
      type="in-line"
      label="mozilla.org"
      iconSrc="chrome://branding/content/icon16.png"
    ></ai-website-chip>
    <ai-website-chip type="in-line" label=""></ai-website-chip>
  </div>
`;

export const ContextChip = Template.bind({});
ContextChip.args = {
  type: "context-chip",
  label: "example.com",
  iconSrc: "chrome://branding/content/icon16.png",
};

export const MixedCollection = () => html`
  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
    <ai-website-chip
      type="in-line"
      label="mozilla.org"
      iconSrc="chrome://branding/content/icon16.png"
    ></ai-website-chip>
    <ai-website-chip type="in-line" label=""></ai-website-chip>
    <ai-website-chip
      type="context-chip"
      label="example.com"
      iconSrc="chrome://branding/content/about-logo.svg"
      href="https://example.com"
    ></ai-website-chip>
  </div>
`;
