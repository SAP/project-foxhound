/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Saves and restores scroll positions so a view shows up where the user
 * last left it. Each history entry gets an id (stored on
 * `history.state.historyEntryId`) and we keep a separate map of
 * id → scroll position. We can't put the position on `history.state` itself,
 * because by the time the user navigates away we're already looking at
 * the new entry's state and can't touch the old one anymore.
 *
 */
export class ScrollOffsets {
  /**
   * Counter for minting historyEntryId values. Each id must be unique within
   * this instance's lifetime because the ids key into {@link #offsets}. We
   * seed from a random value so reloads can't accidentally hit an id that's
   * still pinned to an entry in `history.state` from a prior page load.
   *
   * @type {number}
   */
  #nextHistoryEntryId = Math.floor(Math.random() * 2 ** 32);

  /**
   * Mint a new identifier for a history entry, unique within this instance.
   *
   * @returns {number}
   */
  newHistoryEntryId() {
    return ++this.#nextHistoryEntryId;
  }

  /**
   * The id of the history entry the user is currently looking at. `save()`
   * and `restore()` use it to know which slot to read or write.
   *
   * @type {number?}
   */
  #key = null;

  /**
   * Remembered scroll positions for every view the user has visited, looked
   * up by that view's history entry id.
   *
   * @type {Map<number, {top: number, left: number}>}
   */
  #offsets = new Map();

  /**
   * The element on the page whose scroll position is being tracked.
   *
   * @type {Element}
   */
  #scrollContainer;

  /**
   * When `false`, {@link getPosition} reports `(0, 0)` so that the next
   * {@link save} writes zeros instead of the live scroll position. Consumers
   * flip this off when the visible scroll position is about to become
   * irrelevant to the view being navigated away from (about:addons does this
   * while switching deck tabs inside an addon's details view, so the parent
   * details view comes back scrolled to the top rather than to the previously
   * shown tab's position). {@link setView} re-enables it.
   *
   * @type {boolean}
   */
  canRestore = true;

  /**
   * @param {Element} [scrollContainer] The element whose scroll position is
   *   saved and restored across history entries. Defaults to
   *   `document.documentElement` for pages that scroll the document root.
   */
  constructor(scrollContainer = document.documentElement) {
    this.#scrollContainer = scrollContainer;
  }

  /**
   * Mark `historyEntryId` as the currently displayed view. Subsequent
   * `save()` calls will write to this entry's slot, and `restore()` will
   * read from it.
   *
   * @param {number} historyEntryId
   */
  setView(historyEntryId) {
    this.#key = historyEntryId;
    this.canRestore = true;
  }

  /**
   * Read the current scroll position from the container.
   *
   * @returns {{top: number, left: number}}
   */
  getPosition() {
    if (!this.canRestore) {
      return { top: 0, left: 0 };
    }
    return {
      top: this.#scrollContainer.scrollTop,
      left: this.#scrollContainer.scrollLeft,
    };
  }

  /**
   * Store the current scroll position under the active history entry's id.
   * No-op if no view has been registered yet.
   */
  save() {
    if (this.#key) {
      this.#offsets.set(this.#key, this.getPosition());
    }
  }

  /**
   * Restore the scroll position previously saved against the active history
   * entry, or scroll to the top if none was saved.
   */
  restore() {
    let saved = this.#key ? this.#offsets.get(this.#key) : null;
    this.#scrollContainer.scrollTo({
      top: saved?.top ?? 0,
      left: saved?.left ?? 0,
      behavior: "auto",
    });
  }
}
