/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, LitElement } from "chrome://global/content/vendor/lit.all.mjs";
import "chrome://browser/content/multilineeditor/multiline-editor.mjs";
import "chrome://global/content/elements/moz-badge.mjs";
import "chrome://global/content/elements/panel-list.js";
import { createMentionsPlugin } from "chrome://browser/content/multilineeditor/plugins/MentionsPlugin.mjs";

export default {
  title: "UI Widgets/Multiline Editor",
  component: "moz-multiline-editor",
  argTypes: {
    action: {
      options: [null, "chat", "search", "navigate"],
      control: { type: "select" },
    },
  },
  parameters: {
    status: "in-development",
  },
};

const Template = ({ placeholder }) => html`
  <moz-multiline-editor .placeholder=${placeholder}></moz-multiline-editor>
`;

export const Default = Template.bind({});
Default.args = {
  placeholder: "Placeholder text",
};

/**
 * Demo editor with mentions.
 */
class MultilineEditorWithMentions extends LitElement {
  static properties = {
    placeholder: { type: String },
    toDOM: { type: Function },
  };

  range = null;
  suggestions = [
    { id: "1", label: "One" },
    { id: "2", label: "Two" },
    { id: "3", label: "Three" },
  ];
  mentionsPlugin = createMentionsPlugin({
    triggerChar: "@",
    toDOM: node => this.toDOM?.(node) ?? ["mark", {}, node.attrs.label],
    onEnter: ({ range, view }) => {
      this.range = range;
      const panelList = this.shadowRoot.querySelector("panel-list");
      panelList.show(null, this.#createVirtualAnchor(view, range));
    },
    onChange: ({ range }) => {
      this.range = range;
    },
    onExit: () => {
      this.shadowRoot.querySelector("panel-list").hide();
    },
  });

  constructor() {
    super();
    this.placeholder = "";
  }

  // Creates a virtual anchor to pass to `panel-list`.
  #createVirtualAnchor(view, range) {
    const coordsFrom = view.coordsAtPos(range.from);
    const coordsTo = view.coordsAtPos(range.to);
    return {
      getBoundingClientRect: () => ({
        height: coordsTo.bottom - coordsFrom.top,
        width: coordsTo.right - coordsFrom.left,
        top: coordsFrom.top,
        right: coordsTo.right,
        bottom: coordsTo.bottom,
        left: coordsFrom.left,
        x: coordsFrom.left,
        y: coordsFrom.top,
      }),
      setAttribute: () => {},
      getAttribute: () => null,
      hasAttribute: () => false,
    };
  }

  handlePanelClick(e) {
    const panelItem = e.target.closest("panel-item");
    this.mentionsPlugin.mentions.insert(
      {
        type: "default",
        id: panelItem.dataset.id,
        label: panelItem.textContent,
      },
      this.range.from,
      this.range.to
    );
  }

  render() {
    return html`
      <panel-list @click=${this.handlePanelClick}>
        ${this.suggestions.map(
          item => html`
            <panel-item data-id=${item.id}>${item.label}</panel-item>
          `
        )}
      </panel-list>
      <moz-multiline-editor
        .placeholder=${this.placeholder}
        .plugins=${[this.mentionsPlugin]}
      >
      </moz-multiline-editor>
    `;
  }
}

customElements.define(
  "multiline-editor-with-mentions",
  MultilineEditorWithMentions
);

const MentionsTemplate = ({ placeholder, toDOM }) => html`
  <multiline-editor-with-mentions
    .placeholder=${placeholder}
    .toDOM=${toDOM}
  ></multiline-editor-with-mentions>
`;

export const WithMentions = MentionsTemplate.bind({});
WithMentions.args = {
  placeholder: "Type @ to see suggestions",
};

export const WithMentionsCustomElement = MentionsTemplate.bind({});
WithMentionsCustomElement.args = {
  placeholder: "Type @ to see suggestions",
  toDOM: node => [
    "moz-badge",
    {
      label: node.attrs.label,
    },
    node.attrs.label,
  ],
};
