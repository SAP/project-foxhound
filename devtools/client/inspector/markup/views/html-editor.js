/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Editor = require("resource://devtools/client/shared/sourceeditor/editor.js");
const EventEmitter = require("resource://devtools/shared/event-emitter.js");

/**
 * A wrapper around the Editor component, that allows editing of HTML.
 *
 * The main functionality this provides around the Editor is the ability
 * to show/hide/position an editor inplace. It only appends once to the
 * body, and uses CSS to position the editor.  The reason it is done this
 * way is that the editor is loaded in an iframe, and calling appendChild
 * causes it to reload.
 *
 * Meant to be embedded inside of an HTML page, as in markup.xhtml.
 */
class HTMLEditor extends EventEmitter {
  /**
   * @param  {HTMLDocument} htmlDocument
   *         The document to attach the editor to.  Will also use this
   *         document as a basis for listening resize events.
   */
  constructor(htmlDocument) {
    super();

    this.doc = htmlDocument;
    this.#container = this.doc.createElement("div");
    this.#container.className = "html-editor theme-body";
    this.#container.style.display = "none";
    this.#editorInner = this.doc.createElement("div");
    this.#editorInner.className = "html-editor-inner";
    this.#container.appendChild(this.#editorInner);
    this.doc.body.appendChild(this.#container);
    this.doc.defaultView.addEventListener("resize", this.refresh, true);

    const config = {
      mode: Editor.modes.html,
      lineWrapping: true,
      styleActiveLine: false,
      keyMap: [
        { key: HTMLEditor.#ctrl("Enter"), run: this.hide },
        { key: "F2", run: this.hide },
        {
          key: "Escape",
          run: this.hide.bind(this, false),
          preventDefault: true,
        },
      ],
      theme: "mozilla markup-view",
      cm6: true,
    };

    this.#container.addEventListener("click", this.hide);
    this.#editorInner.addEventListener("click", HTMLEditor.#stopPropagation);
    // Avoid the hijack of the backspace key by the markup when the
    // html editor is open.
    this.#editorInner.addEventListener("keydown", HTMLEditor.#stopPropagation);

    this.editor = new Editor(config);
    this.editor.appendToLocalElement(this.#editorInner);

    this.hide(false);
  }

  editor = null;
  doc = null;

  #container = null;
  #editorInner = null;
  #attachedElement = null;
  #originalValue;

  static #ctrl(k) {
    return (Services.appinfo.OS == "Darwin" ? "Cmd-" : "Ctrl-") + k;
  }

  static #stopPropagation(e) {
    e.stopPropagation();
  }

  /**
   * Need to refresh position by manually setting CSS values, so this will
   * need to be called on resizes and other sizing changes.
   */
  refresh = () => {
    const element = this.#attachedElement;

    if (element) {
      this.#container.style.top = element.offsetTop + "px";
      this.#container.style.left = element.offsetLeft + "px";
      this.#container.style.width = element.offsetWidth + "px";
      this.#container.style.height = element.parentNode.offsetHeight + "px";
    }
  };

  /**
   * Anchor the editor to a particular element.
   *
   * @param  {DOMNode} element
   *         The element that the editor will be anchored to.
   *         Should belong to the HTMLDocument passed into the constructor.
   */
  #attach(element) {
    this.#detach();
    this.#attachedElement = element;
    element.classList.add("html-editor-container");
    this.refresh();
  }

  /**
   * Unanchor the editor from an element.
   */
  #detach() {
    if (this.#attachedElement) {
      this.#attachedElement.classList.remove("html-editor-container");
      this.#attachedElement = undefined;
    }
  }

  /**
   * Anchor the editor to a particular element, and show the editor.
   *
   * @param  {DOMNode} element
   *         The element that the editor will be anchored to.
   *         Should belong to the HTMLDocument passed into the constructor.
   * @param  {string} text
   *         Value to set the contents of the editor to
   * @param  {Function} cb
   *         The function to call when hiding
   */
  show = (element, text) => {
    if (this.isVisible) {
      return;
    }

    this.#originalValue = text;
    this.editor.setText(text, { saveTransactionToHistory: false });
    this.#attach(element);
    this.#container.style.display = "flex";
    this.isVisible = true;

    this.editor.focus();

    this.emit("popupshown");
  };

  /**
   * Hide the editor, optionally committing the changes
   *
   * @param  {boolean} shouldCommit
   *         A change will be committed by default.  If this param
   *         strictly equals false, no change will occur.
   */
  hide = shouldCommit => {
    if (!this.isVisible) {
      return;
    }

    this.#container.style.display = "none";
    this.#detach();

    const newValue = this.editor.getText();
    const valueHasChanged = this.#originalValue !== newValue;
    const preventCommit = shouldCommit === false || !valueHasChanged;
    this.#originalValue = undefined;
    this.isVisible = undefined;
    this.emit("popuphidden", !preventCommit, newValue);
  };

  /**
   * Destroy this object and unbind all event handlers
   */
  destroy() {
    this.doc.defaultView.removeEventListener("resize", this.refresh, true);
    this.#container.removeEventListener("click", this.hide);
    this.#editorInner.removeEventListener("click", HTMLEditor.#stopPropagation);
    this.#editorInner.removeEventListener(
      "keydown",
      HTMLEditor.#stopPropagation
    );

    this.hide(false);
    this.#container.remove();
    this.editor.destroy();
  }
}

module.exports = HTMLEditor;
