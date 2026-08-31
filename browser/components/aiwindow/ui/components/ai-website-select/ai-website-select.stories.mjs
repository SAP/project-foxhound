/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/ai-website-select.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Website select",
  component: "ai-website-select",
  argTypes: {
    linkedPanel: {
      control: "text",
    },
    label: {
      control: "text",
    },
    iconSrc: {
      control: "text",
    },
    url: {
      control: "text",
    },
    checked: {
      control: "boolean",
    },
  },
  parameters: {
    fluent: `
aiwindow-website-select-placeholder = site name
    `,
  },
};

const Template = ({ linkedPanel, label, iconSrc, url, checked }) => html`
  <ai-website-select
    .linkedPanel=${linkedPanel}
    .label=${label}
    .iconSrc=${iconSrc}
    .url=${url || ""}
    .checked=${checked ?? false}
  ></ai-website-select>
`;

export const Default = Template.bind({});
Default.args = {
  linkedPanel: "tab-1",
  label: "Mozilla Developer Network - Web Docs",
  iconSrc: "chrome://branding/content/about-logo.svg",
  url: "https://developer.mozilla.org",
  checked: false,
};
