/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/aiwindow/components/ai-action-result.mjs";

export default {
  title: "Domain-specific UI Widgets/AI Window/AI Action Result",
  component: "ai-action-result",
  parameters: {
    fluent: `
smartwindow-nl-undo-button =
    .label = Undo
  `,
  },
  argTypes: {
    label: { control: "text" },
    summary: { control: "text" },
    canUndo: { control: "boolean" },
    isExpanded: { control: "boolean" },
    rows: { control: "object" },
  },
};

const Template = ({ label, summary, canUndo, isExpanded, rows }) => html`
  <ai-action-result
    label=${label}
    summary=${summary}
    ?can-undo=${canUndo}
    ?is-expanded=${isExpanded}
    .rows=${rows}
  ></ai-action-result>
`;

export const Collapsed = Template.bind({});
Collapsed.args = {
  label: "Closed tab",
  summary: "I closed any open tabs about NYC hotels.",
  canUndo: true,
  isExpanded: false,
  rows: [
    {
      label: "Closed tab",
      items: [{ url: "https://nychotels.com", label: "NYC Hotels - Queens" }],
    },
  ],
};

export const Expanded = Template.bind({});
Expanded.args = {
  label: "Closed tab",
  summary: "I closed any open tabs about NYC hotels.",
  canUndo: true,
  isExpanded: true,
  rows: [
    {
      label: "Closed tab",
      items: [{ url: "https://nychotels.com", label: "NYC Hotels - Queens" }],
    },
  ],
};

export const ExpandedBulk = Template.bind({});
ExpandedBulk.args = {
  label: "Closed 3 tabs",
  summary: "I closed any open tabs about NYC hotels.",
  canUndo: true,
  isExpanded: true,
  rows: [
    {
      label: "Closed tabs",
      items: [
        { url: "https://nychotels.com", label: "NYC Hotels - Queens" },
        { url: "https://besthotels.com", label: "Best Hotels in New York" },
        { url: "https://brooklyn-stay.com", label: "Brooklyn New York Stay" },
      ],
    },
  ],
};

export const ExpandedAfterUndo = Template.bind({});
ExpandedAfterUndo.args = {
  label: "Closed tab",
  summary: "I closed any open tabs about NYC hotels.",
  canUndo: false,
  isExpanded: true,
  rows: [
    {
      label: "Closed tab",
      items: [{ url: "https://nychotels.com", label: "NYC Hotels - Queens" }],
    },
    {
      label: "Undo – reopened tab",
      items: [],
    },
  ],
};

export const ExpandedBulkAfterUndo = Template.bind({});
ExpandedBulkAfterUndo.args = {
  label: "Closed 3 tabs",
  summary: "I closed any open tabs about NYC hotels.",
  canUndo: false,
  isExpanded: true,
  rows: [
    {
      label: "Closed tabs",
      items: [
        { url: "https://nychotels.com", label: "NYC Hotels - Queens" },
        { url: "https://besthotels.com", label: "Best Hotels in New York" },
        { url: "https://brooklyn-stay.com", label: "Brooklyn New York Stay" },
      ],
    },
    {
      label: "Restored tabs",
      items: [],
    },
  ],
};
