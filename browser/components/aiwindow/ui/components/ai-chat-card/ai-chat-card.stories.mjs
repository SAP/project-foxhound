/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/ai-chat-card.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/AI Chat Card",
  component: "ai-chat-card",
  argTypes: {
    title: { control: { type: "text" } },
    url: {
      control: { type: "text" },
    },
  },
  parameters: {},
};

const Template = ({ url, title, favicon, thumbnail, timestamp }) => html`
  <ai-chat-card
    url=${url}
    title=${title}
    favicon=${favicon}
    thumbnail=${thumbnail}
    timestamp=${timestamp}
  ></ai-chat-card>
`;

export const WithImage = Template.bind({});
WithImage.args = {
  title: "A History URL",
  url: "https://www.sitewithareallylongname.com/some/image",
  favicon: "chrome://branding/content/about-logo.svg",
  thumbnail:
    "chrome://browser/content/asrouter/assets/fox-with-box-on-cloud.svg",
  timestamp: "Just now",
};

export const WithOutImage = Template.bind({});
WithOutImage.args = {
  title: "A History URL",
  url: "https://www.site.com/some/image",
  favicon: "chrome://branding/content/about-logo.svg",
  timestamp: "Just now",
};

export const WithOutImageOrFavicon = Template.bind({});
WithOutImageOrFavicon.args = {
  title: "A History URL",
  url: "https://www.site.com/some/image",
  timestamp: "Just now",
};
