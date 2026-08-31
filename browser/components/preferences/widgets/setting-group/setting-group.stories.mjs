/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/preferences/widgets/setting-group.mjs";

export default {
  title: "Domain-specific UI Widgets/Settings/Setting Group",
  component: "setting-group",
  parameters: {
    status: "in-development",
    handles: ["click", "input", "change"],
    fluent: `
group-example-label =
  .label = Complicated grouping
  .description = This group is showing that there can be a complicated config, not necessarily that this level of nesting should be used.
checkbox-example-input =
  .label = Checkbox example of setting-control
  .description = Could have a description like moz-checkbox.
checkbox-example-input2 =
  .label = Another checkbox
browser-layout-label =
  .label = Browser layout
browser-layout-radio-horizontal =
  .label = Horizontal tabs
  .description = Displayed at the top of the browser
browser-layout-radio-vertical =
  .label = Vertical tabs
  .description = Displayed on the side, in the sidebar
browser-layout-sidebar =
  .label = Show sidebar
  .description = Quickly access bookmarks, tabs from your phone, AI chatbots, and more without leaving your main view
cookies-and-site-data =
  .label = Cookies and Site Data
  .description = Manage and delete cookies, history, cache, and site settings.
clear-browsing-data =
    .label = Clear browsing data
storage-usage =
  .label = Your stored cookies, site data, and cache are currently using { $value } { $unit } of disk space.
manage-browsing-data =
  .label = Manage browsing data
manage-exceptions =
  .label = Manage exceptions
  .description = You can specify which websites are always or never allowed to use cookies and site data.
radio-example-input =
  .label = This is a radio group
  .description = With a lovely description.
radio-one =
  .label = One
  .description = This is the first option.
radio-two =
  .label = Two
radio-three =
  .label = Three
`,
  },
};

function getSetting() {
  return {
    value: true,
    on() {},
    off() {},
    userChange() {},
    visible: () => true,
    getControlConfig: c => c,
    controllingExtensionInfo: {},
  };
}

const Template = ({ config }) => html`
  <setting-group .config=${config} .getSetting=${getSetting}></setting-group>
`;

const BOX_GROUP_CONFIG = {
  id: "data-usage-group",
  control: "moz-box-group",
  items: [
    {
      id: "data-usage",
      l10nId: "storage-usage",
      control: "moz-box-item",
      controlAttrs: {
        "data-l10n-args": JSON.stringify({
          value: 1.8,
          unit: "GB",
        }),
      },
    },
    {
      id: "manage-browsing-data",
      l10nId: "manage-browsing-data",
      control: "moz-box-button",
    },
    {
      id: "manage-exceptions",
      l10nId: "manage-exceptions",
      control: "moz-box-button",
    },
  ],
};

export const Group = Template.bind({});
Group.args = {
  config: {
    id: "group-example",
    l10nId: "group-example-label",
    items: [
      {
        id: "checkbox-example",
        l10nId: "checkbox-example-input",
      },
      {
        id: "checkbox-example2",
        l10nId: "checkbox-example-input2",
        supportPage: "example-support",
        iconSrc: "chrome://global/skin/icons/highlights.svg",
        items: [
          {
            id: "checkbox-example",
            l10nId: "checkbox-example-input",
          },
          {
            id: "radio-example",
            l10nId: "radio-example-input",
            control: "moz-radio-group",
            options: [
              {
                l10nId: "radio-one",
                value: "one",
              },
              {
                l10nId: "radio-two",
                value: "two",
                items: [BOX_GROUP_CONFIG],
              },
              {
                l10nId: "radio-three",
                value: "three",
              },
            ],
          },
        ],
      },
    ],
  },
};

export const BrowserLayout = Template.bind({});
BrowserLayout.args = {
  config: {
    id: "browser-layout-example",
    l10nId: "browser-layout-label",
    items: [
      {
        id: "tabs-layout",
        control: "moz-radio-group",
        options: [
          {
            id: "horizontal-tabs",
            l10nId: "browser-layout-radio-horizontal",
            value: true,
          },
          {
            id: "vertical-tabs",
            l10nId: "browser-layout-radio-vertical",
            value: false,
          },
        ],
      },
      {
        id: "show-sidebar",
        l10nId: "browser-layout-sidebar",
      },
    ],
  },
};

export const BoxGroup = Template.bind({});
BoxGroup.args = {
  config: {
    id: "cookies-data",
    l10nId: "cookies-and-site-data",
    supportPage: "sure",
    items: [
      {
        l10nId: "clear-browsing-data",
        control: "moz-box-button",
        controlAttrs: {
          iconsrc: "chrome://browser/skin/flame.svg",
        },
      },
      BOX_GROUP_CONFIG,
    ],
  },
};
