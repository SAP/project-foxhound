/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/smartwindow-panel-list.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Smartwindow Panel List",
  component: "smartwindow-panel-list",
  argTypes: {
    groups: {
      control: "object",
    },
    placeholderL10nId: {
      control: "text",
    },
  },
  decorators: [],
  parameters: {
    fluent: `
smartbar-mentions-list-no-results-label = No results found
smartbar-mentions-single-tab-label = Recent Sites
smartbar-mentions-list-open-tabs-label = Tabs
smartbar-mentions-list-previously-visited-pages-label = Previously visited
    `,
  },
};

const Template = ({ groups, placeholderL10nId }) => html`
  <div style="width: 300px; height: 400px; position: relative;">
    <smartwindow-panel-list
      .groups=${groups}
      .placeholderL10nId=${placeholderL10nId}
      .anchor=${{ left: 20, top: 20, width: 100, height: 30 }}
      .alwaysOpen=${true}
    ></smartwindow-panel-list>
  </div>
`;

export const Empty = Template.bind({});
Empty.args = {
  groups: [],
  placeholderL10nId: "smartbar-mentions-list-no-results-label",
};

export const SingleTab = Template.bind({});
SingleTab.args = {
  groups: [
    {
      headerL10nId: "smartbar-mentions-single-tab-label",
      items: [
        {
          id: "current-tab",
          label: "Smart window chat",
          icon: "chrome://branding/content/icon16.png",
        },
        {
          id: "closed1",
          label: "MDN Web Docs",
          icon: "chrome://branding/content/icon16.png",
        },
        {
          id: "closed2",
          label: "Wikipedia",
          icon: "chrome://branding/content/icon16.png",
        },
        {
          id: "closed3",
          label: "GitHub",
          icon: "chrome://branding/content/icon16.png",
        },
      ],
    },
  ],
  placeholderL10nId: "",
};

export const SingleGroup = Template.bind({});
SingleGroup.args = {
  groups: [
    {
      headerL10nId: "smartbar-mentions-list-open-tabs-label",
      items: [
        {
          id: "tab1",
          label: "Mozilla Firefox",
          icon: "chrome://branding/content/icon16.png",
        },
        {
          id: "tab2",
          label: "GitHub",
          icon: "chrome://branding/content/icon16.png",
        },
        {
          id: "tab3",
          label: "Stack Overflow",
          icon: "chrome://branding/content/icon16.png",
        },
      ],
    },
  ],
  placeholderL10nId: "",
};

export const MultipleGroups = Template.bind({});
MultipleGroups.args = {
  groups: [
    {
      headerL10nId: "smartbar-mentions-list-open-tabs-label",
      items: [
        {
          id: "tab1",
          label: "Mozilla Firefox",
          icon: "chrome://branding/content/icon16.png",
        },
        {
          id: "tab2",
          label: "GitHub",
          icon: "chrome://branding/content/icon16.png",
        },
        {
          id: "tab3",
          label: "Stack Overflow",
          icon: "chrome://branding/content/icon16.png",
        },
      ],
    },
    {
      headerL10nId: "smartbar-mentions-list-previously-visited-pages-label",
      items: [
        {
          id: "closed1",
          label: "MDN Web Docs",
          icon: "chrome://branding/content/icon16.png",
        },
        {
          id: "closed2",
          label: "Wikipedia",
          icon: "chrome://branding/content/icon16.png",
        },
      ],
    },
  ],
  placeholderL10nId: "",
};
