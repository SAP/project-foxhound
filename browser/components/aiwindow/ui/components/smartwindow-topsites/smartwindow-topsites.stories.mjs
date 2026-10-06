/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/smartwindow-topsites.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Smartwindow Topsites",
  component: "smartwindow-topsites",
  parameters: {
    status: "in-development",
    docs: {
      description: {
        component:
          "A single row of Top Sites tiles shown below the Smartbar in Smart Window fullpage mode. Each tile shows a favicon and title; selecting one dispatches a `SmartWindowTopSites:site-selected` event with the site URL.",
      },
    },
  },
};

const sampleSites = [
  {
    url: "https://www.wikipedia.org/",
    label: "Wikipedia",
    favicon: "https://www.wikipedia.org/static/favicon/wikipedia.ico",
  },
  {
    url: "https://www.youtube.com/",
    label: "YouTube",
    favicon: "https://www.youtube.com/favicon.ico",
  },
  {
    url: "https://apnews.com/",
    label: "AP News",
    favicon: "https://apnews.com/favicon.ico",
  },
  {
    url: "https://www.reddit.com/",
    label: "Reddit",
    favicon: "https://www.reddit.com/favicon.ico",
  },
];

const Template = ({ sites }) => html`
  <div style="width: 100%; min-height: 200px; padding: 20px;">
    <smartwindow-topsites
      .sites=${sites}
      @SmartWindowTopSites:site-selected=${e => {
        alert(`Selected: ${e.detail.url}`);
      }}
    ></smartwindow-topsites>
  </div>
`;

export const Default = Template.bind({});
Default.args = {
  sites: sampleSites,
};

export const Empty = Template.bind({});
Empty.args = {
  sites: [],
};
