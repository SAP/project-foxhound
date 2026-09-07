/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @import {MultilineEditor} from "chrome://browser/content/multilineeditor/multiline-editor.mjs"
 */

/**
 * Controller for the Smartbar editor.
 *
 * The controller abstracts the underlying editor implementation allowing
 * the Smartbar to also work with a standard HTML input.
 */
export class SmartbarInputController {
  /**
   * @param {object} adapter
   *   Adapter with input and editor references.
   *   @param {MultilineEditor | HTMLInputElement} adapter.input
   *     The input element.
   *   @param {object} adapter.editor
   *     The editor object.
   */
  constructor(adapter) {
    /** @type {MultilineEditor | HTMLInputElement} */
    this.input = adapter.input;
    /** @type {object} */
    this.editor = adapter.editor;
  }

  /**
   * Focuses the input element.
   */
  focus() {
    this.input.focus();
  }

  /**
   * Removes focus from the input element.
   */
  blur() {
    this.input.blur();
  }

  /**
   * Whether the input is read-only.
   *
   * @type {boolean}
   */
  get readOnly() {
    return this.input.readOnly;
  }

  set readOnly(val) {
    this.input.readOnly = val;
  }

  /**
   * The placeholder text for the input.
   *
   * @type {string}
   */
  get placeholder() {
    return this.input.placeholder ?? "";
  }

  set placeholder(val) {
    this.input.placeholder = val ?? "";
  }

  /**
   * The current value of the input.
   *
   * @type {string}
   */
  get value() {
    return this.input.value ?? "";
  }

  /**
   * Sets the value of the input.
   *
   * @param {string} val
   */
  setValue(val) {
    this.input.value = val ?? "";
  }

  /**
   * The start offset of the selection.
   *
   * @type {number}
   */
  get selectionStart() {
    return this.input.selectionStart ?? 0;
  }

  set selectionStart(val) {
    this.setSelectionRange(val, this.selectionEnd ?? val);
  }

  /**
   * The end offset of the selection.
   *
   * @type {number}
   */
  get selectionEnd() {
    return this.input.selectionEnd ?? 0;
  }

  set selectionEnd(val) {
    this.setSelectionRange(this.selectionStart ?? 0, val);
  }

  /**
   * Sets the selection range in the input.
   *
   * @param {number} start
   *   The start offset.
   * @param {number} end
   *   The end offset.
   */
  setSelectionRange(start, end) {
    if (!this.input.setSelectionRange) {
      return;
    }
    const from = Math.max(0, start ?? 0);
    const to = Math.max(from, end ?? from);
    this.input.setSelectionRange(from, to);
  }

  /**
   * Selects all text in the input.
   */
  select() {
    this.input.select?.();
  }

  /**
   * Dispatches an input event on the input element.
   *
   * @param {object} [options]
   *   The event options.
   * @param {string} [options.inputType="insertText"]
   *   The input type.
   * @param {string} [options.data=""]
   *   The data being inserted.
   */
  dispatchInput({ inputType = "insertText", data = "" } = {}) {
    this.input.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        composed: true,
        inputType,
        data,
      })
    );
  }

  /**
   * Dispatches a selectionchange event on the input element.
   */
  dispatchSelectionChange() {
    this.input.dispatchEvent(
      new Event("selectionchange", { bubbles: true, composed: true })
    );
  }

  /**
   * Whether the editor is in composition mode.
   *
   * @type {boolean}
   */
  get composing() {
    return this.editor.composing ?? false;
  }

  /**
   * The number of selection ranges in the editor.
   *
   * @type {number}
   */
  get selectionRangeCount() {
    return this.editor.selection?.rangeCount ?? 0;
  }

  /**
   * Returns the string representation of the current selection with formatting.
   *
   * @returns {string}
   *   The formatted selection string.
   */
  selectionToStringWithFormat() {
    return this.editor.selection?.toStringWithFormat() ?? "";
  }
}
