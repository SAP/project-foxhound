/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/website-chip-container.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Website Chip Container",
  component: "website-chip-container",
  // Constrained container to simulate a chat bubble.
  decorators: [
    story => html`
      <div
        style="
          width: 326px;
          padding: 16px;
          box-sizing: border-box;
          border: 1px dashed #ccc;
        "
      >
        ${story()}
      </div>
    `,
  ],
};

const websites = [
  {
    id: "https://example.com",
    label: "example.com",
    iconSrc: "chrome://branding/content/about-logo.svg",
  },
  {
    id: "https://firefox.com",
    label: "firefox.com",
    iconSrc: "chrome://branding/content/icon16.png",
  },
  {
    id: "https://example.com",
    label: "example.com",
    iconSrc: "chrome://branding/content/about-logo.svg",
  },
];

export const Default = () => html`
  <website-chip-container
    .chipType=${"context-chip"}
    .websites=${websites}
  ></website-chip-container>
`;
