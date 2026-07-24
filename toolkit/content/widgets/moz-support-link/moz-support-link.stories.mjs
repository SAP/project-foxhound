/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "../vendor/lit.all.mjs";
import "./moz-support-link.mjs";

const fluentStrings = ["moz-support-link-text-amo", "moz-support-link-text"];

export default {
  title: "UI Widgets/Support Link",
  component: "moz-support-link",
  argTypes: {
    l10nId: {
      options: fluentStrings,
      control: { type: "select" },
    },
    onClick: { action: "clicked" },
    "data-l10n-id": {
      table: {
        disable: true,
      },
    },
  },
  parameters: {
    status: "stable",
    fluent: `
moz-support-link-text-amo = Learn more about add-ons
moz-support-link-text = Learn more
    `,
  },
};

const Template = ({
  l10nId,
  "support-page": supportPage,
  "utm-content": utmContent,
}) => html`
  <a
    is="moz-support-link"
    data-l10n-id=${ifDefined(l10nId)}
    support-page=${ifDefined(supportPage)}
    utm-content=${ifDefined(utmContent)}
  >
  </a>
`;

export const withAMOUrl = Template.bind({});
withAMOUrl.args = {
  l10nId: "moz-support-link-text-amo",
  "support-page": "addons",
  "utm-content": "promoted-addon-badge",
};

export const Primary = Template.bind({});
Primary.args = {
  "support-page": "preferences",
  "utm-content": "",
};
