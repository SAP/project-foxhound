/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file exports only the ProseMirror APIs that are being used.
// When adding new functionality the required exports can be added here before
// rebuilding the bundle with.

// Core
export { baseKeymap } from "prosemirror-commands";
export { history, undo, redo } from "prosemirror-history";
export { keymap } from "prosemirror-keymap";
export { Schema, DOMSerializer, DOMParser } from "prosemirror-model";
export { schema as basicSchema } from "prosemirror-schema-basic";
export { EditorState, Plugin, PluginKey, TextSelection } from "prosemirror-state";
export { EditorView, Decoration, DecorationSet } from "prosemirror-view";

// Non-core
export {
  defaultMarkdownParser,
  defaultMarkdownSerializer,
  MarkdownParser,
  MarkdownSerializer,
} from "prosemirror-markdown";

// Third-party
export {
  markdownParser,
  markdownSerializer,
  mentionNodeSpec,
  suggestionsPlugin,
  triggerCharacter,
} from "./prosemirror-suggestions/src/index.js";
