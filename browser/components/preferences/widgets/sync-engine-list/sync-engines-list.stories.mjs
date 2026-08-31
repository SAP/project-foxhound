/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/preferences/widgets/sync-engines-list.mjs";
import "chrome://browser/content/preferences/widgets/placeholder-message.mjs";

export default {
  title: "Domain-specific UI Widgets/Settings/Sync Engines List",
  component: "sync-engines-list",
  parameters: {
    status: "in-development",
  },
  argTypes: {
    engines: {
      control: "check",
      options: [
        "bookmarks",
        "history",
        "tabs",
        "passwords",
        "settings",
        "addresses",
        "payments",
        "addons",
      ],
    },
  },
};

window.MozXULElement.insertFTLIfNeeded("browser/preferences/preferences.ftl");

const Template = ({ engines = [] }) => html`
  <div style="max-width: 520px">
    <sync-engines-list .engines=${engines}></sync-engines-list>
  </div>
`;

export const Default = Template.bind({});
Default.args = {
  // Note: "addons" icon currently doesn’t render in Storybook.
  engines: [
    "bookmarks",
    "history",
    "tabs",
    "passwords",
    "settings",
    "addresses",
    "payments",
  ],
};

export const EmptyState = Template.bind({});
EmptyState.args = {
  engines: [],
};
