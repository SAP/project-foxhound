/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, ifDefined } from "../vendor/lit.all.mjs";
import "./moz-label.mjs";

const fluentStrings = [
  "moz-label-default-label",
  "moz-label-label-with-colon",
  "moz-label-label-disabled",
];

export default {
  title: "UI Widgets/Label",
  component: "moz-label",
  argTypes: {
    inputType: {
      options: ["checkbox", "radio"],
      control: { type: "select" },
    },
    l10nId: {
      options: fluentStrings,
      control: { type: "select" },
    },
    textContent: {
      table: {
        disable: true,
      },
    },
    "data-l10n-id": {
      table: {
        disable: true,
      },
    },
  },
  parameters: {
    status: {
      type: "stable",
      links: [
        {
          title: "Learn more",
          href: "?path=/docs/ui-widgets-label-readme--page#component-status",
        },
      ],
    },
    fluent: `
moz-label-default-label = I love cheese 🧀
moz-label-label-with-colon = I love cheese 🧀:
moz-label-label-disabled = I love cheese 🧀
    `,
  },
};

const Template = ({ accesskey, inputType, disabled, l10nId }) => html`
  <style>
    div {
      display: flex;
      align-items: center;
    }

    label {
      margin-inline-end: 8px;
    }
  </style>
  <div>
    <label
      is="moz-label"
      accesskey=${ifDefined(accesskey)}
      data-l10n-id=${ifDefined(l10nId)}
      for="cheese"
    >
    </label>
    <input
      type=${inputType}
      name="cheese"
      id="cheese"
      ?disabled=${disabled}
      checked
    />
  </div>
`;

export const AccessKey = Template.bind({});
AccessKey.args = {
  accesskey: "c",
  inputType: "checkbox",
  disabled: false,
  l10nId: "moz-label-default-label",
};

export const AccessKeyNotInLabel = Template.bind({});
AccessKeyNotInLabel.args = {
  ...AccessKey.args,
  accesskey: "x",
  l10nId: "moz-label-label-with-colon",
};

export const DisabledCheckbox = Template.bind({});
DisabledCheckbox.args = {
  ...AccessKey.args,
  disabled: true,
  l10nId: "moz-label-label-disabled",
};
