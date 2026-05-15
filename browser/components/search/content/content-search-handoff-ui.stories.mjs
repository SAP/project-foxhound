/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line import/no-unresolved
import { html } from "lit.all.mjs";
import "./contentSearchHandoffUI.mjs";

window.MozXULElement.insertFTLIfNeeded("branding/brand.ftl");
window.MozXULElement.insertFTLIfNeeded("browser/newtab/newtab.ftl");
window.MozXULElement.insertFTLIfNeeded("browser/aboutPrivateBrowsing.ftl");

export default {
  title: "Domain-specific UI Widgets/Search/Handoff Search Bar",
  component: "content-search-handoff-ui",
  argTypes: {},
};

/**
 * This little dance lets us mock out the response that the ContentSearch
 * parent/child actor pair returns when the ContentSearchHandoffUIController
 * requests engine information.
 */
addEventListener("ContentSearchClient", e => {
  switch (e.detail.type) {
    case "GetEngine": {
      // We use the setTimeout(0) to queue up the response to occur on the next
      // tick of the event loop.
      setTimeout(() => {
        e.target.dispatchEvent(
          new CustomEvent("ContentSearchService", {
            detail: {
              type: "Engine",
              data: {
                engine: {
                  name: "Google",
                  iconData: "chrome://global/skin/icons/search-glass.svg",
                  isConfigEngine: true,
                },
                isPrivateEngine: false,
              },
            },
          })
        );
      }, 0);
      break;
    }
  }
});

const Template = ({ fakeFocus, disabled }) => html`
  <style>
    .search-inner-wrapper {
      display: flex;
      min-height: 52px;
      margin: 0 auto;
      width: 720px;
    }
    content-search-handoff-ui {
      --content-search-handoff-ui-fill: light-dark(#000000, #ffffff);
      height: 50px;
      width: 100%;
    }
  </style>

  <div class="search-inner-wrapper">
    <content-search-handoff-ui
      ?fakeFocus=${fakeFocus}
      ?disabled=${disabled}
    ></content-search-handoff-ui>
  </div>
`;

export const Focused = Template.bind({});
Focused.args = {
  fakeFocus: true,
  disabled: false,
};

export const Unfocused = Template.bind({});
Unfocused.args = {
  fakeFocus: false,
  disabled: false,
};
export const Disabled = Template.bind({});
Disabled.args = {
  fakeFocus: true,
  disabled: true,
};
