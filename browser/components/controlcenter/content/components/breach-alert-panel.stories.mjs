/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line import/no-unresolved
import { html } from "lit.all.mjs";
import "./breach-alert-panel.mjs";

export default {
  title: "Domain-specific UI Widgets/Trust Panel/Breach Alert",
  component: "breach-alert-panel",
};

window.MozXULElement.insertFTLIfNeeded("branding/brand.ftl");
window.MozXULElement.insertFTLIfNeeded("toolkit/branding/brandings.ftl");
window.MozXULElement.insertFTLIfNeeded("browser/browser.ftl");

export const AnonymousBreachAlert = ({ hidden, breachStatus }) => {
  return html`
    <breach-alert-panel ?hidden=${hidden} .breachStatus=${breachStatus}>
    </breach-alert-panel>
  `;
};

AnonymousBreachAlert.argTypes = {
  hidden: {
    defaultValue: false,
    type: "boolean",
  },
  breachStatus: {
    defaultValue: "breached",
    type: { name: "enum", value: ["disabled", "breached", "not-breached"] },
  },
};
