/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://global/content/elements/panel-list.mjs";
import "chrome://browser/content/aiwindow/components/input-cta.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Input CTA",
  component: "input-cta",
  parameters: {
    fluent: `
aiwindow-input-cta-submit-label-chat = Ask
aiwindow-input-cta-submit-label-search = Search
aiwindow-input-cta-submit-label-navigate = Go
aiwindow-input-cta-menu-label-chat = Ask
aiwindow-input-cta-menu-label-search = Search with { $searchEngineName }
aiwindow-input-cta-menu-label-navigate = Go to site
aiwindow-input-cta-menu-label-search-with = Search with…
aiwindow-input-cta-search-submenu-header = Search
    `,
  },
  argTypes: {
    action: {
      options: ["", "chat", "search", "navigate"],
      control: { type: "select" },
    },
  },
};

const SEARCH_ENGINE_INFO = { name: "Google", icon: "" };
const SEARCH_ENGINES = [
  { name: "Google", icon: "" },
  { name: "Bing", icon: "" },
  { name: "DuckDuckGo", icon: "" },
];

const Template = ({ action, searchEngineInfo, searchEngines }) => html`
  <input-cta
    .action=${action}
    .searchEngineInfo=${searchEngineInfo}
    .searchEngines=${searchEngines}
  ></input-cta>
`;

export const Disabled = Template.bind({});
Disabled.args = {
  searchEngineInfo: SEARCH_ENGINE_INFO,
  searchEngines: SEARCH_ENGINES,
};

export const Chat = Template.bind({});
Chat.args = {
  action: "chat",
  searchEngineInfo: SEARCH_ENGINE_INFO,
  searchEngines: SEARCH_ENGINES,
};

export const Search = Template.bind({});
Search.args = {
  action: "search",
  searchEngineInfo: SEARCH_ENGINE_INFO,
  searchEngines: SEARCH_ENGINES,
};

export const Navigate = Template.bind({});
Navigate.args = {
  action: "navigate",
  searchEngineInfo: SEARCH_ENGINE_INFO,
  searchEngines: SEARCH_ENGINES,
};
