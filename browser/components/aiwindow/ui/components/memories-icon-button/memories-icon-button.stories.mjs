/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/memories-icon-button.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/Memories Icon Button",
  component: "memories-icon-button",
  argTypes: {
    pressed: {
      control: { type: "boolean" },
    },
    show: {
      control: { type: "boolean" },
    },
  },
  parameters: {
    fluent: `
aiwindow-memories-on =
  .tooltiptext = Memories on
aiwindow-memories-off =
  .tooltiptext = Memories off
    `,
  },
};

const Template = ({ pressed, show }) => html`
  <memories-icon-button
    ?pressed=${pressed}
    ?show=${show}
  ></memories-icon-button>
`;

export const Pressed = Template.bind({});
Pressed.args = {
  pressed: true,
  show: true,
};

export const Unpressed = Template.bind({});
Unpressed.args = {
  pressed: false,
  show: true,
};

export const Hidden = Template.bind({});
Hidden.args = {
  pressed: false,
  show: false,
};
