/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";
import {
  Decoration,
  DecorationSet,
  EditorState,
  EditorView,
  MarkdownParser,
  MarkdownSerializer,
  Plugin as PmPlugin,
  Schema,
  TextSelection,
  baseKeymap,
  basicSchema,
  defaultMarkdownParser,
  defaultMarkdownSerializer,
  history as historyPlugin,
  keymap,
  redo as historyRedo,
  undo as historyUndo,
} from "chrome://browser/content/multilineeditor/prosemirror.bundle.mjs";

/**
 * @typedef {object} MultilineEditorPlugin
 * @property {object} [schemaExtension] - Schema extensions
 * @property {object} [schemaExtension.nodes] - Node specs
 * @property {object} [schemaExtension.marks] - Mark specs
 * @property {function(MultilineEditor): PmPlugin} [createPlugin] - Create plugin
 * @property {object} [parseMarkdown] - Markdown token specs
 * @property {object} [toMarkdown] - Markdown serializer functions
 */

/**
 * @class MultilineEditor
 *
 * A ProseMirror-based multiline editor.
 *
 * @property {string} placeholder - Placeholder text for the editor.
 * @property {Array<MultilineEditorPlugin>} plugins - Editor plugins.
 * @property {boolean} readOnly - Whether the editor is read-only.
 */
export class MultilineEditor extends MozLitElement {
  static shadowRootOptions = {
    ...MozLitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static properties = {
    placeholder: { type: String, reflect: true, fluent: true },
    readOnly: { type: Boolean, reflect: true, attribute: "readonly" },
    plugins: { type: Array, attribute: false },
  };

  static schema = new Schema({
    nodes: {
      doc: basicSchema.spec.nodes.get("doc"),
      paragraph: basicSchema.spec.nodes.get("paragraph"),
      text: basicSchema.spec.nodes.get("text"),
    },
  });

  #pendingValue = "";
  #placeholderPlugin;
  #plugins;
  #suppressInputEvent = false;
  #view;
  #markdownSerializer;

  constructor() {
    super();

    this.placeholder = "";
    this.plugins = [];
    this.readOnly = false;
    this.#placeholderPlugin = this.#createPlaceholderPlugin();
    const plugins = [
      historyPlugin(),
      keymap({
        Enter: () => true,
        "Shift-Enter": (state, dispatch) =>
          this.#insertParagraph(state, dispatch),
        "Mod-z": historyUndo,
        "Mod-y": historyRedo,
        "Shift-Mod-z": historyRedo,
      }),
      keymap(baseKeymap),
      this.#placeholderPlugin,
    ];

    if (document.contentType === "application/xhtml+xml") {
      plugins.push(this.#createCleanupOrphanedBreaksPlugin());
    }

    this.#plugins = plugins;
  }

  /**
   * The ProseMirror view instance.
   *
   * @type {EditorView}
   */
  get view() {
    return this.#view;
  }

  /**
   * Whether the editor is composing.
   *
   * @type {boolean}
   */
  get composing() {
    return this.#view?.composing ?? false;
  }

  /**
   * The current text content of the editor.
   *
   * @type {string}
   */
  get value() {
    if (!this.#view) {
      return this.#pendingValue;
    }
    if (this.#markdownSerializer) {
      return this.#markdownSerializer.serialize(this.#view.state.doc);
    }
    return this.#view.state.doc.textBetween(
      0,
      this.#view.state.doc.content.size,
      "\n",
      "\n"
    );
  }

  /**
   * Set the text content of the editor.
   *
   * @param {string} val
   */
  set value(val) {
    if (!this.#view) {
      this.#pendingValue = val;
      return;
    }

    if (val === this.value) {
      return;
    }

    const state = this.#view.state;
    const schema = state.schema;
    const lines = val.split("\n");
    const paragraphs = lines.map(line => {
      const content = line ? [schema.text(line)] : [];
      return schema.node("paragraph", null, content);
    });
    const doc = schema.node("doc", null, paragraphs);

    const tr = state.tr.replaceWith(0, state.doc.content.size, doc.content);
    tr.setMeta("addToHistory", false);

    const cursorPos = this.#posFromTextOffset(val.length, tr.doc);
    // Suppress input events when updating only the text selection.
    this.#suppressInputEvent = true;
    try {
      this.#view.dispatch(
        tr.setSelection(
          TextSelection.between(
            tr.doc.resolve(cursorPos),
            tr.doc.resolve(cursorPos)
          )
        )
      );
    } finally {
      this.#suppressInputEvent = false;
    }
  }

  /**
   * The start offset of the selection.
   *
   * @type {number}
   */
  get selectionStart() {
    if (!this.#view) {
      return 0;
    }
    return this.#textOffsetFromPos(this.#view.state.selection.from);
  }

  /**
   * Set the start offset of the selection.
   *
   * @param {number} val
   */
  set selectionStart(val) {
    this.setSelectionRange(val, this.selectionEnd ?? val);
  }

  /**
   * The end offset of the selection.
   *
   * @type {number}
   */
  get selectionEnd() {
    if (!this.#view) {
      return 0;
    }
    return this.#textOffsetFromPos(this.#view.state.selection.to);
  }

  /**
   * Set the end offset of the selection.
   *
   * @param {number} val
   */
  set selectionEnd(val) {
    this.setSelectionRange(this.selectionStart ?? 0, val);
  }

  /**
   * Set the selection range in the editor.
   *
   * @param {number} start
   * @param {number} end
   */
  setSelectionRange(start, end) {
    if (!this.#view) {
      return;
    }

    const doc = this.#view.state.doc;
    const docSize = doc.content.size;
    const maxOffset = this.#textLength(doc);
    const fromOffset = Math.max(0, Math.min(start ?? 0, maxOffset));
    const toOffset = Math.max(0, Math.min(end ?? fromOffset, maxOffset));
    const from = Math.max(
      0,
      Math.min(this.#posFromTextOffset(fromOffset, doc), docSize)
    );
    const to = Math.max(
      0,
      Math.min(this.#posFromTextOffset(toOffset, doc), docSize)
    );

    if (
      this.#view.state.selection.from === from &&
      this.#view.state.selection.to === to
    ) {
      return;
    }

    let selection;
    try {
      selection = TextSelection.between(doc.resolve(from), doc.resolve(to));
    } catch (_e) {
      const anchor = Math.max(0, Math.min(to, docSize));
      selection = TextSelection.near(doc.resolve(anchor));
    }
    this.#view.dispatch(
      this.#view.state.tr.setSelection(selection).scrollIntoView()
    );
    this.#dispatchSelectionChange();
  }

  /**
   * Select all text in the editor.
   */
  select() {
    this.setSelectionRange(0, this.value.length);
    this.focus();
  }

  /**
   * Focus the editor.
   */
  focus() {
    this.#view?.focus();
    super.focus();
  }

  /**
   * Called when the element is added to the DOM.
   */
  connectedCallback() {
    super.connectedCallback();
    this.setAttribute("role", "presentation");
  }

  /**
   * Called when the element is removed from the DOM.
   */
  disconnectedCallback() {
    this.#destroyView();
    this.#pendingValue = "";
    super.disconnectedCallback();
  }

  /**
   * Called after the element’s DOM has been rendered for the first time.
   */
  firstUpdated() {
    this.#createView();
  }

  /**
   * Called when the element’s properties are updated.
   *
   * @param {Map} changedProps
   */
  updated(changedProps) {
    if (
      changedProps.has("placeholder") ||
      changedProps.has("plugins") ||
      changedProps.has("readOnly")
    ) {
      this.#refreshView();
    }
  }

  #buildSchema() {
    const nodes = {};
    const marks = {};

    for (const plugin of this.plugins) {
      Object.assign(nodes, plugin.schemaExtension?.nodes ?? {});
      Object.assign(marks, plugin.schemaExtension?.marks ?? {});
    }

    if (Object.keys(nodes).length === 0 && Object.keys(marks).length === 0) {
      return MultilineEditor.schema;
    }

    const baseSchemaSpec = MultilineEditor.schema.spec;
    return new Schema({
      nodes: baseSchemaSpec.nodes.append(nodes),
      marks: baseSchemaSpec.marks.append(marks),
    });
  }

  #createMarkdownClipboardPlugin(schema) {
    const parsers = {};
    const serializers = {};

    for (const plugin of this.plugins) {
      Object.assign(parsers, plugin.parseMarkdown ?? {});
      Object.assign(serializers, plugin.toMarkdown ?? {});
    }

    if (
      Object.keys(parsers).length === 0 &&
      Object.keys(serializers).length === 0
    ) {
      return null;
    }

    // Filter parser tokens that reference nodes or marks not in the schema.
    const filterParserTokens = tokens => {
      const filtered = {};
      for (const [key, spec] of Object.entries(tokens)) {
        if (
          Object.values(spec).every(
            val =>
              typeof val !== "string" || schema.nodes[val] || schema.marks[val]
          )
        ) {
          filtered[key] = spec;
        }
      }
      return filtered;
    };

    const filterBySchema = (items, schemaItems) => {
      const filtered = {};
      for (const [key, value] of Object.entries(items)) {
        if (schemaItems[key]) {
          filtered[key] = value;
        }
      }
      return filtered;
    };

    const parser = new MarkdownParser(schema, defaultMarkdownParser.tokenizer, {
      ...filterParserTokens(defaultMarkdownParser.tokens),
      ...parsers,
    });
    const serializer = new MarkdownSerializer(
      {
        ...defaultMarkdownSerializer.nodes,
        ...filterBySchema(serializers, schema.nodes),
      },
      {
        ...defaultMarkdownSerializer.marks,
        ...filterBySchema(serializers, schema.marks),
      }
    );
    this.#markdownSerializer = serializer;

    return new PmPlugin({
      props: {
        clipboardTextParser: text => parser.parse(text)?.content,
        clipboardTextSerializer: slice => serializer.serialize(slice.content),
      },
    });
  }

  #createView() {
    const mount = this.renderRoot.querySelector(".multiline-editor");
    if (!mount) {
      return;
    }

    const schema = this.#buildSchema();
    const markdownPlugin = this.#createMarkdownClipboardPlugin(schema);
    const customPlugins = this.plugins
      .map(plugin => plugin.createPlugin?.(this))
      .filter(Boolean);

    const state = EditorState.create({
      schema,
      plugins: [
        ...this.#plugins,
        ...(markdownPlugin ? [markdownPlugin] : []),
        ...customPlugins,
      ],
    });

    this.#view = new EditorView(mount, {
      state,
      attributes: this.#viewAttributes(),
      editable: () => !this.readOnly,
      dispatchTransaction: this.#dispatchTransaction,
      nodeViews: Object.assign(
        {},
        ...this.plugins.map(plugin => plugin.nodeViews).filter(Boolean)
      ),
    });

    if (this.#pendingValue) {
      this.value = this.#pendingValue;
      this.#pendingValue = "";
    }
  }

  #destroyView() {
    this.#view?.destroy();
    this.#view = null;
  }

  #dispatchTransaction = tr => {
    if (!this.#view) {
      return;
    }

    const prevText = this.value;
    const prevSelection = this.#view.state.selection;
    const nextState = this.#view.state.apply(tr);
    this.#view.updateState(nextState);

    const selectionChanged =
      tr.selectionSet &&
      (prevSelection.from !== nextState.selection.from ||
        prevSelection.to !== nextState.selection.to);

    if (selectionChanged) {
      this.#dispatchSelectionChange();
    }

    if (tr.docChanged && !this.#suppressInputEvent) {
      const nextText = this.value;
      let insertedText = "";
      for (const step of tr.steps) {
        insertedText += step.slice?.content?.textBetween(
          0,
          step.slice.content.size,
          "",
          ""
        );
      }
      this.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          composed: true,
          data: insertedText || null,
          inputType:
            insertedText || nextText.length >= prevText.length
              ? "insertText"
              : "deleteContentBackward",
        })
      );
    }
  };

  #dispatchSelectionChange() {
    this.dispatchEvent(
      new Event("selectionchange", { bubbles: true, composed: true })
    );
  }

  #insertParagraph(state, dispatch) {
    const paragraph = state.schema.nodes.paragraph;
    if (!paragraph) {
      return false;
    }
    const { $from } = state.selection;
    let tr = state.tr;
    if (!state.selection.empty) {
      tr = tr.deleteSelection();
    }
    tr = tr.split(tr.mapping.map($from.pos)).scrollIntoView();
    dispatch(tr);
    return true;
  }

  /**
   * Creates a plugin that shows a placeholder when the editor is empty.
   *
   * @returns {PmPlugin}
   */
  #createPlaceholderPlugin() {
    return new PmPlugin({
      props: {
        decorations: ({ doc }) => {
          if (
            doc.childCount !== 1 ||
            !doc.firstChild.isTextblock ||
            doc.firstChild.content.size !== 0 ||
            !this.placeholder
          ) {
            return null;
          }

          return DecorationSet.create(doc, [
            Decoration.node(0, doc.firstChild.nodeSize, {
              class: "placeholder",
              "data-placeholder": this.placeholder,
            }),
          ]);
        },
      },
    });
  }

  /**
   * Creates a plugin that removes orphaned hard breaks from empty paragraphs.
   *
   * In XHTML contexts the trailing break element in paragraphs are rendered as
   * uppercase (<BR> instead of <br>). ProseMirror seems to have issues parsing
   * these breaks, which leads to orphaned breaks after deleting text content.
   *
   * @returns {PmPlugin}
   */
  #createCleanupOrphanedBreaksPlugin() {
    return new PmPlugin({
      appendTransaction(transactions, prevState, nextState) {
        if (!transactions.some(tr => tr.docChanged)) {
          return null;
        }

        const tr = nextState.tr;
        let modified = false;

        nextState.doc.descendants((nextNode, nextPos) => {
          if (
            nextNode.type.name !== "paragraph" ||
            nextNode.textContent ||
            nextNode.childCount === 0
          ) {
            return true;
          }

          for (let i = 0; i < nextNode.childCount; i++) {
            if (nextNode.child(i).type.name === "hard_break") {
              const prevNode = prevState.doc.nodeAt(nextPos);
              if (prevNode?.type.name === "paragraph" && prevNode.textContent) {
                tr.replaceWith(
                  nextPos + 1,
                  nextPos + nextNode.content.size + 1,
                  []
                );
                modified = true;
              }
              break;
            }
          }

          return true;
        });

        return modified ? tr : null;
      },
    });
  }

  #refreshView() {
    if (!this.#view) {
      return;
    }

    this.#view.setProps({
      attributes: this.#viewAttributes(),
      editable: () => !this.readOnly,
    });
    this.#view.dispatch(this.#view.state.tr);
  }

  #textOffsetFromPos(pos, doc = this.#view?.state.doc) {
    if (!doc) {
      return 0;
    }
    return doc.textBetween(0, pos, "\n", "\n").length;
  }

  #posFromTextOffset(offset, doc = this.#view?.state.doc) {
    if (!doc) {
      return 0;
    }
    const target = Math.max(0, Math.min(offset ?? 0, this.#textLength(doc)));
    let seen = 0;
    let pos = doc.content.size;
    let found = false;
    let paragraphCount = 0;
    doc.descendants((node, nodePos) => {
      if (found) {
        return false;
      }
      if (node.type.name === "paragraph") {
        if (paragraphCount > 0) {
          if (target <= seen + 1) {
            pos = nodePos;
            found = true;
            return false;
          }
          seen += 1;
        }
        paragraphCount++;
      }
      if (node.isText) {
        const textNodeLength = node.text.length;
        const start = nodePos;
        if (target <= seen + textNodeLength) {
          pos = start + (target - seen);
          found = true;
          return false;
        }
        seen += textNodeLength;
      } else if (node.type.name === "hard_break") {
        if (target <= seen + 1) {
          pos = nodePos;
          found = true;
          return false;
        }
        seen += 1;
      }
      return true;
    });
    return pos;
  }

  #textLength(doc) {
    if (!doc) {
      return 0;
    }
    return doc.textBetween(0, doc.content.size, "\n", "\n").length;
  }

  #viewAttributes() {
    return {
      "aria-label": this.placeholder,
      "aria-multiline": "true",
      "aria-readonly": this.readOnly ? "true" : "false",
      role: "textbox",
    };
  }

  render() {
    return html`
      <link
        rel="stylesheet"
        href="chrome://browser/content/multilineeditor/prosemirror.css"
      />
      <link
        rel="stylesheet"
        href="chrome://browser/content/multilineeditor/multiline-editor.css"
      />
      <div class="multiline-editor"></div>
    `;
  }
}

customElements.define("moz-multiline-editor", MultilineEditor);
