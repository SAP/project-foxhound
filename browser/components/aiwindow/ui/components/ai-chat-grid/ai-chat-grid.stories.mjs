/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/ai-chat-grid.mjs";
import "chrome://browser/content/aiwindow/components/ai-chat-card.mjs";

window.MozXULElement.insertFTLIfNeeded("locales-preview/aiWindow.ftl");

export default {
  title: "Domain-specific UI Widgets/AI Window/AI Chat Grid",
  component: "ai-chat-grid",
  argTypes: {
    view: { control: { type: "text" } },
    showSwitch: { control: { type: "boolean" } },
  },
  parameters: {},
};

const Template = ({ showSwitch, view, items, gridItem, rowItem }) => html`
  <ai-chat-grid
    ?showswitch=${showSwitch}
    view=${view}
    .items=${items}
    .gridItem=${gridItem}
    .rowItem=${rowItem}
  ></ai-chat-grid>
`;

const items = [
  {
    url: "https://firefox.com",
    title: "Item One",
    favicon: "chrome://branding/content/about-logo.svg",
    thumbnail:
      "chrome://browser/content/asrouter/assets/fox-with-box-on-cloud.svg",
    timestamp: "Just now",
  },
  {
    url: "https://firefox.com",
    title: "Item Two",
    favicon: "chrome://branding/content/about-logo.svg",
    thumbnail:
      "chrome://browser/content/asrouter/assets/fox-with-box-on-cloud.svg",
    timestamp: "Just now",
  },
  {
    url: "https://firefox.com",
    title: "Item Three",
    favicon: "chrome://branding/content/about-logo.svg",
    thumbnail:
      "chrome://browser/content/asrouter/assets/fox-with-box-on-cloud.svg",
    timestamp: "Just now",
  },
  {
    url: "https://firefox.com",
    title: "Item Four",
    favicon: "chrome://branding/content/about-logo.svg",
    thumbnail:
      "chrome://browser/content/asrouter/assets/fox-with-box-on-cloud.svg",
    timestamp: "Just now",
  },
  {
    url: "https://firefox.com",
    title: "Item Five",
    favicon: "chrome://branding/content/about-logo.svg",
    thumbnail:
      "chrome://browser/content/asrouter/assets/fox-with-box-on-cloud.svg",
    timestamp: "Just now",
  },
  {
    url: "https://firefox.com",
    title: "Item Six",
    favicon: "chrome://branding/content/about-logo.svg",
    thumbnail:
      "chrome://browser/content/asrouter/assets/fox-with-box-on-cloud.svg",
    timestamp: "Just now",
  },
];

export const WithSwitch = Template.bind({});
WithSwitch.args = {
  showSwitch: true,
  view: "grid",
  gridItem: item => {
    return html`<ai-chat-card
      title=${item.title}
      url=${item.url}
      favicon=${item.favicon}
      thumbnail=${item.thumbnail}
      timestamp=${item.timestamp}
    ></ai-chat-card>`;
  },
  rowItem: item => {
    return html`
      <style>
        .text-row {
          display: flex;
          gap: 8px;
          justify-content: center;
          align-items: center;

          .title {
            flex-grow: 1;
          }
        }
      </style>
      <div class="text-row">
        <img src=${item.favicon} width="16" height="16" />
        <span class="title">${item.title}</span>
        <span>${item.timestamp}</span>
      </div>
    `;
  },
  items,
};

export const WithOutSwitchGrid = Template.bind({});
WithOutSwitchGrid.args = {
  showSwitch: false,
  view: "grid",
  gridItem: item => {
    return html`<ai-chat-card
      title=${item.title}
      url=${item.url}
      favicon=${item.favicon}
      thumbnail=${item.thumbnail}
      timestamp=${item.timestamp}
    ></ai-chat-card>`;
  },
  items,
};

export const WithOutSwitchList = Template.bind({});
WithOutSwitchList.args = {
  showSwitch: false,
  view: "list",
  rowItem: item => {
    return html`
      <style>
        .text-row {
          display: flex;
          gap: 8px;
          justify-content: center;
          align-items: center;

          .title {
            flex-grow: 1;
          }
        }
      </style>
      <div class="text-row">
        <img src=${item.favicon} width="16" height="16" />
        <span class="title">${item.title}</span>
        <span>${item.timestamp}</span>
      </div>
    `;
  },
  items,
};
