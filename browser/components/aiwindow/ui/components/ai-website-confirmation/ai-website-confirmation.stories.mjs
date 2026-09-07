/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/ai-website-confirmation.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Website confirmation",
  component: "ai-website-confirmation",
  argTypes: {
    tabs: {
      control: "object",
    },
  },
  parameters: {
    fluent: `
smart-window-confirm-select-all =
    .tooltiptext = Select all
    .aria-label = Select all
    .label = Select all
smart-window-confirm-deselect-all =
    .tooltiptext = Deselect all
    .aria-label = Deselect all
    .label = Deselect all
smart-window-close-confirm =
    .tooltiptext = Close confirm
    .aria-label = Close confirm
smart-window-confirm-close-tab = Close
smart-window-confirm-close-tabs =
    { $count ->
        [one] Close { $count } tab
       *[other] Close { $count } tabs
    }
    `,
  },
};

const Template = ({ tabs }) => html`
  <ai-website-confirmation .tabs=${tabs}></ai-website-confirmation>
`;

export const Default = Template.bind({});
Default.args = {
  tabs: [
    {
      linkedPanel: "tab-1",
      title: "Mozilla Developer Network - Web Docs",
      iconSrc: "chrome://branding/content/about-logo.svg",
      url: "https://developer.mozilla.org",
      checked: true,
    },
    {
      linkedPanel: "tab-2",
      title: "Stack Overflow - Where Developers Learn",
      iconSrc: "chrome://global/skin/icons/defaultFavicon.svg",
      url: "https://stackoverflow.com",
      checked: false,
    },
    {
      linkedPanel: "tab-3",
      title: "GitHub - Build and ship software",
      iconSrc: "chrome://global/skin/icons/defaultFavicon.svg",
      url: "https://github.com",
      checked: true,
    },
    {
      linkedPanel: "tab-4",
      title: "MDN Web Docs - Resources for developers",
      iconSrc: "chrome://branding/content/about-logo.svg",
      url: "https://developer.mozilla.org/en-US/",
      checked: false,
    },
    {
      linkedPanel: "tab-5",
      title: "W3Schools - Learn to Code",
      iconSrc: "chrome://global/skin/icons/defaultFavicon.svg",
      url: "https://www.w3schools.com",
      checked: true,
    },
    {
      linkedPanel: "tab-6",
      title: "CSS-Tricks - Tips, Tricks, and Techniques",
      iconSrc: "chrome://global/skin/icons/defaultFavicon.svg",
      url: "https://css-tricks.com",
      checked: false,
    },
    {
      linkedPanel: "tab-7",
      title: "JavaScript.info - The Modern JavaScript Tutorial",
      iconSrc: "chrome://global/skin/icons/defaultFavicon.svg",
      url: "https://javascript.info",
      checked: true,
    },
    {
      linkedPanel: "tab-8",
      title: "React - A JavaScript library for building user interfaces",
      iconSrc: "chrome://global/skin/icons/defaultFavicon.svg",
      url: "https://reactjs.org",
      checked: false,
    },
  ],
};
