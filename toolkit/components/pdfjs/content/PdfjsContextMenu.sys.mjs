/* Copyright 2026 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const lazy = {};

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "PDFJS_ENABLE_COMMENT",
  "pdfjs.enableComment",
  false
);

export class PdfjsContextMenu {
  #contextMenu;

  #isInPDFViewer = false;

  #isInPDFEditor = false;

  #isInPagesEditor = false;

  #pdfStates = null;

  constructor(aContextMenu, aContext) {
    this.#contextMenu = aContextMenu;
    this.#isInPDFViewer = aContext.inPDFViewer;
    this.#pdfStates = aContext.pdfStates;
    this.#isInPDFEditor = !!this.#pdfStates?.isEditing;
    this.#isInPagesEditor = this.#pdfStates?.hasSelectedPages;
  }

  initItems() {
    const contextMenu = this.#contextMenu;
    for (const id of [
      "context-pdfjs-undo",
      "context-pdfjs-redo",
      "context-sep-pdfjs-redo",
      "context-pdfjs-cut",
      "context-pdfjs-copy",
      "context-pdfjs-paste",
      "context-pdfjs-delete",
      "context-pdfjs-select-all",
      "context-sep-pdfjs-select-all",
    ]) {
      contextMenu.showItem(id, this.#isInPDFEditor);
    }
    for (const id of [
      "context-pdfjs-copy-page",
      "context-pdfjs-cut-page",
      "context-pdfjs-delete-page",
      "context-pdfjs-save-page",
      "context-sep-pdfjs-save-page",
    ]) {
      contextMenu.showItem(id, this.#isInPagesEditor);
    }

    if (this.#isInPDFViewer && this.#isInPagesEditor) {
      contextMenu.showItem("context-savepage", false);
      return;
    }

    if (this.#isInPDFViewer && this.#isInPDFEditor) {
      contextMenu.showItem("context-selectall", false);
      contextMenu.showItem("context-saveimage", false);
    }

    const hasSelectedText = this.#pdfStates?.hasSelectedText ?? false;
    contextMenu.showItem(
      "context-pdfjs-comment-selection",
      lazy.PDFJS_ENABLE_COMMENT && hasSelectedText
    );
    contextMenu.showItem("context-pdfjs-highlight-selection", hasSelectedText);

    if (!this.#isInPDFEditor) {
      return;
    }

    const {
      isEmpty,
      hasSomethingToUndo,
      hasSomethingToRedo,
      hasSelectedEditor,
    } = this.#pdfStates;

    const hasEmptyClipboard = !Services.clipboard.hasDataMatchingFlavors(
      ["application/pdfjs"],
      Ci.nsIClipboard.kGlobalClipboard
    );

    contextMenu.setItemAttr(
      "context-pdfjs-undo",
      "disabled",
      !hasSomethingToUndo
    );
    contextMenu.setItemAttr(
      "context-pdfjs-redo",
      "disabled",
      !hasSomethingToRedo
    );
    contextMenu.setItemAttr(
      "context-sep-pdfjs-redo",
      "disabled",
      !hasSomethingToUndo && !hasSomethingToRedo
    );
    contextMenu.setItemAttr(
      "context-pdfjs-cut",
      "disabled",
      isEmpty || !hasSelectedEditor
    );
    contextMenu.setItemAttr(
      "context-pdfjs-copy",
      "disabled",
      isEmpty || !hasSelectedEditor
    );
    contextMenu.setItemAttr(
      "context-pdfjs-paste",
      "disabled",
      hasEmptyClipboard
    );
    contextMenu.setItemAttr(
      "context-pdfjs-delete",
      "disabled",
      isEmpty || !hasSelectedEditor
    );
    contextMenu.setItemAttr("context-pdfjs-select-all", "disabled", isEmpty);
    contextMenu.setItemAttr(
      "context-sep-pdfjs-select-all",
      "disabled",
      isEmpty
    );
  }

  cmd(aName) {
    aName = aName.replace("context-pdfjs-", "");
    if (["cut", "copy", "paste"].includes(aName)) {
      const cmd = `cmd_${aName}`;
      this.#contextMenu.document.commandDispatcher
        .getControllerForCommand(cmd)
        .doCommand(cmd);
      if (Cu.isInAutomation) {
        this.#contextMenu.browser.sendMessageToActor(
          "PDFJS:Editing",
          { name: aName },
          "Pdfjs"
        );
      }
      return;
    }
    this.#contextMenu.browser.sendMessageToActor(
      "PDFJS:Editing",
      { name: aName.replaceAll(/-([a-z])/g, (_, char) => char.toUpperCase()) },
      "Pdfjs"
    );
  }
}
