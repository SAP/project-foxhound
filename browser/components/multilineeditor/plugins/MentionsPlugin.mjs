/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  mentionNodeSpec,
  suggestionsPlugin,
  triggerCharacter,
} from "chrome://browser/content/multilineeditor/prosemirror.bundle.mjs";

/**
 * @typedef {object} MentionData
 * @property {string} type - Mention type
 * @property {string} id - Mention ID
 * @property {string} label - Mention label
 */

/**
 * Mentions class with API for programmatic access to mentions.
 */
class Mentions {
  #editor;

  /**
   * @param {object} editor - Multiline editor instance
   */
  constructor(editor) {
    if (!editor) {
      throw new Error("Mentions requires an editor instance");
    }
    this.#editor = editor;
  }

  /**
   * Insert a mention.
   *
   * @param {MentionData} mention - Mention data
   * @param {number} from - Start position
   * @param {number} to - End position
   */
  insert(mention, from, to) {
    const view = this.#editor.view;
    const { state } = view;
    const mentionNode = state.schema.nodes.mention.create({
      type: mention.type,
      id: mention.id,
      label: mention.label,
    });

    try {
      const tr = state.tr;
      tr.replaceRangeWith(from, to, mentionNode);
      tr.insertText(" ");
      view.dispatch(tr);
      view.focus();
    } catch (e) {
      console.error("Failed to insert mention:", e);
    }
  }

  /**
   * Get all mentions.
   *
   * @returns {Array<MentionData & {pos: number}>} Mentions with positions
   */
  getAll() {
    const mentions = [];
    const { state } = this.#editor.view;
    const { doc, schema } = state;

    doc.descendants((node, pos) => {
      if (node.type === schema.nodes.mention) {
        mentions.push({
          type: node.attrs.type,
          id: node.attrs.id,
          label: node.attrs.label,
          pos,
        });
      }
    });

    return mentions;
  }
}

/**
 * @typedef {[string, object?, ...(string|0)[]]} DOMOutputSpec
 */

/**
 * Creates a mention node spec for custom rendering.
 *
 * @param {(node: object) => DOMOutputSpec} toDOM - Convert mention node to DOM
 * @returns {object} ProseMirror node spec
 */
function createMentionNodeSpec(toDOM) {
  return {
    ...mentionNodeSpec,
    atom: true,
    selectable: true,
    toDOM: node => {
      const [tag, attrs = {}, ...children] = toDOM(node);
      const { class: classAttr, ...restAttr } = attrs;
      return [
        tag,
        {
          ...restAttr,
          "data-mention-type": node.attrs.type,
          "data-mention-id": node.attrs.id,
          "data-mention-label": node.attrs.label,
          class: classAttr ? `mention ${classAttr}` : "mention",
        },
        ...children,
      ];
    },
    parseDOM: [
      {
        tag: "[data-mention-type][data-mention-id]",
        getAttrs: dom => ({
          type: dom.getAttribute("data-mention-type"),
          id: dom.getAttribute("data-mention-id"),
          label: dom.getAttribute("data-mention-label"),
        }),
      },
    ],
  };
}

/**
 * Creates a markdown serializer for mentions.
 *
 * @returns {Function} Serializer function
 */
function markdownSerializer() {
  return (state, node) => {
    const label = state.esc(node.attrs.label ?? "");
    const href = encodeURIComponent(node.attrs.id);
    state.write(`[${label}](mention:?href=${href})`);
  };
}

/**
 * @typedef {object} SuggestionContext
 * @property {Mentions} mentions - Mentions API
 * @property {{from: number, to: number}} range - Text range
 * @property {string} text - Current text with trigger
 * @property {object} view - ProseMirror EditorView
 */

/**
 * Creates a mentions plugin with trigger and suggestions.
 *
 * @param {object} options - Plugin options
 * @param {string} [options.triggerChar] - Trigger character
 * @param {boolean} [options.allowSpaces] - Allow spaces in mentions
 * @param {(node: object) => DOMOutputSpec} [options.toDOM] - Render mention to DOM
 * @param {(node: object) => DOMOutputSpec} [options.nodeView] - Custom rendering for view
 * @param {(ctx: SuggestionContext) => void} [options.onEnter] - Trigger character detected
 * @param {(ctx: SuggestionContext) => void} [options.onChange] - Text changed
 * @param {(ctx: SuggestionContext) => void} [options.onExit] - Exit suggestions
 * @param {(ctx: {view: object, event: KeyboardEvent}) => boolean} [options.onKeyDown] - Handle keydown events
 * @returns {object} Plugin bundle
 */
export function createMentionsPlugin(options = {}) {
  const {
    triggerChar = "@",
    allowSpaces = false,
    toDOM = node => ["span", {}, node.attrs.label],
    nodeView,
    onEnter,
    onChange,
    onExit,
    onKeyDown,
  } = options;

  let _mentions = null;

  return {
    schemaExtension: {
      nodes: {
        mention: createMentionNodeSpec(toDOM),
      },
    },
    nodeViews: nodeView
      ? {
          mention: node => {
            const [tag, attrs = {}] = nodeView(node);
            const dom = document.createElement(tag);
            // Set properties from nodeView spec
            Object.assign(dom, attrs);
            dom.classList.add("mention");
            return {
              dom,
              update: newNode => newNode.type.name === "mention",
              selectNode: () => dom.setAttribute("selected", ""),
              deselectNode: () => dom.removeAttribute("selected"),
            };
          },
        }
      : undefined,
    toMarkdown: {
      mention: markdownSerializer(),
    },
    createPlugin: editor => {
      _mentions = new Mentions(editor);
      return suggestionsPlugin({
        matcher: triggerCharacter(triggerChar, { allowSpaces }),
        onEnter,
        onChange,
        onExit,
        onKeyDown,
      });
    },
    get mentions() {
      return _mentions;
    },
  };
}
