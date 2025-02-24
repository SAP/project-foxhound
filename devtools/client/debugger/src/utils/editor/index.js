/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

export * from "./source-documents";
export * from "./source-search";
export * from "../ui";
export * from "./tokens";

import { createEditor } from "./create-editor";

import { isWasm, lineToWasmOffset, wasmOffsetToLine } from "../wasm";
import { createLocation } from "../location";
import { features } from "../prefs";

let editor;

export function getEditor(useCm6) {
  if (editor) {
    return editor;
  }

  editor = createEditor(useCm6);
  return editor;
}

export function removeEditor() {
  editor = null;
}

/**
 *  Update line wrapping for the codemirror editor.
 */
export function updateEditorLineWrapping(value) {
  if (!editor) {
    return;
  }
  editor.setLineWrapping(value);
}

function getCodeMirror() {
  return editor && editor.hasCodeMirror ? editor.codeMirror : null;
}

export function startOperation() {
  const codeMirror = getCodeMirror();
  if (!codeMirror) {
    return;
  }

  codeMirror.startOperation();
}

export function endOperation() {
  const codeMirror = getCodeMirror();
  if (!codeMirror) {
    return;
  }

  codeMirror.endOperation();
}

export function toEditorLine(sourceId, lineOrOffset) {
  if (isWasm(sourceId)) {
    // TODO ensure offset is always "mappable" to edit line.
    return wasmOffsetToLine(sourceId, lineOrOffset) || 0;
  }

  if (features.codemirrorNext) {
    return lineOrOffset;
  }

  return lineOrOffset ? lineOrOffset - 1 : 1;
}

export function fromEditorLine(sourceId, line, sourceIsWasm) {
  if (sourceIsWasm) {
    return lineToWasmOffset(sourceId, line) || 0;
  }

  if (features.codemirrorNext) {
    return line;
  }

  return line + 1;
}

export function toEditorPosition(location) {
  // Note that Spidermonkey, Debugger frontend and CodeMirror are all consistant regarding column
  // and are 0-based. But only CodeMirror consider the line to be 0-based while the two others
  // consider lines to be 1-based.
  return {
    line: toEditorLine(location.source.id, location.line),
    column:
      isWasm(location.source.id) || (!location.column ? 0 : location.column),
  };
}

export function toSourceLine(sourceId, line) {
  if (isWasm(sourceId)) {
    return lineToWasmOffset(sourceId, line);
  }
  if (features.codemirrorNext) {
    return line;
  }
  return line + 1;
}

export function markText({ codeMirror }, className, { start, end }) {
  return codeMirror.markText(
    { ch: start.column, line: start.line },
    { ch: end.column, line: end.line },
    { className }
  );
}

export function lineAtHeight({ codeMirror }, sourceId, event) {
  const _editorLine = codeMirror.lineAtHeight(event.clientY);
  return toSourceLine(sourceId, _editorLine);
}

export function getSourceLocationFromMouseEvent({ codeMirror }, source, e) {
  const { line, ch } = codeMirror.coordsChar({
    left: e.clientX,
    top: e.clientY,
  });

  return createLocation({
    source,
    line: fromEditorLine(source.id, line, isWasm(source.id)),
    column: isWasm(source.id) ? 0 : ch + 1,
  });
}

export function forEachLine(codeMirror, iter) {
  codeMirror.operation(() => {
    codeMirror.doc.iter(0, codeMirror.lineCount(), iter);
  });
}

export function removeLineClass(codeMirror, line, className) {
  codeMirror.removeLineClass(line, "wrap", className);
}

export function clearLineClass(codeMirror, className) {
  forEachLine(codeMirror, line => {
    removeLineClass(codeMirror, line, className);
  });
}

export function getTextForLine(codeMirror, line) {
  return codeMirror.getLine(line - 1).trim();
}

export function getCursorLine(codeMirror) {
  return codeMirror.getCursor().line;
}

export function getCursorColumn(codeMirror) {
  return codeMirror.getCursor().ch;
}
