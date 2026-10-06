/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tree view node which can be focused via keyboard navigation.
 *
 * @typedef {object} TreeViewNode
 *
 * @property {"card-summary" | "folder" | "row" | "separator" | "empty-folder"} type
 * @property {Element} [list] - The parent <tab-list>.
 * @property {Element} [card] - The parent <moz-card>.
 * @property {object} [item] - The object from `tabItems`.
 * @property {Element} domNode - The rendered DOM element, or null if not rendered.
 */

/**
 * A controller that enables selection and keyboard navigation within a "tree"
 * view in the sidebar. This tree represents any hierarchical structure of
 * URLs, such as those from synced tabs, history visits, or bookmarks.
 *
 * Selection is keyed on `(list, guid)` because guids are not globally unique
 * across the tree. (The same URL appears in multiple cards, and each card has
 * its own list.) Storing per-list keeps a click in a card from also marking
 * the same URL "selected" in other cards.
 *
 * @implements {ReactiveController}
 */
export class SidebarTreeView {
  /**
   * Selected guids per list.
   *
   * @type {Map<SidebarTabList, Set<string>>}
   */
  selectedRows;

  /**
   * The anchor row for shift-click range selection. Holds the list and GUID of
   * the last row selected without Shift, defining one end of the range when the
   * user shift-clicks another row.
   *
   * @type {{ list: SidebarTabList, guid: string }}
   */
  #selectionAnchor = { list: null, guid: null };

  constructor(host, { multiSelect = true } = {}) {
    this.host = host;
    host.addController(this);

    this.multiSelect = multiSelect;
    this.selectedRows = new Map();
  }

  hostConnected() {
    this.host.addEventListener("clear-selection", this);
    this.host.addEventListener("set-anchor", this);
    this.host.addEventListener("shift-select", this);
    this.host.addEventListener("focus-row", this);
  }

  hostDisconnected() {
    this.host.removeEventListener("clear-selection", this);
    this.host.removeEventListener("set-anchor", this);
    this.host.removeEventListener("shift-select", this);
    this.host.removeEventListener("focus-row", this);
  }

  /**
   * Visually ordered list of tree view nodes.
   *
   * @returns {TreeViewNode[]}
   */
  get treeNodes() {
    if (!this._treeNodes) {
      this._treeNodes = this.host.getNodesInOrder();
    }
    return this._treeNodes;
  }

  hostUpdated() {
    delete this._treeNodes;
  }

  /**
   * Handle events bubbling up from `<sidebar-tab-list>` elements.
   *
   * @param {CustomEvent} event
   */
  handleEvent(event) {
    switch (event.type) {
      case "clear-selection":
        this.#clearSelection();
        break;
      case "set-anchor":
        this.#setAnchor(event.originalTarget, event.detail.guid);
        break;
      case "shift-select":
        this.#extendSelection(event.originalTarget, event.detail.row.guid);
        break;
      case "focus-row":
        this.#handleFocusRow(event);
        break;
    }
  }

  #setAnchor(list, guid) {
    this.#selectionAnchor = { list, guid };
  }

  #resetAnchor() {
    this.#setAnchor(null, null);
  }

  isSelected(list, guid) {
    const selection = this.selectedRows.get(list);
    return selection?.has(guid);
  }

  toggleSelection(list, guid) {
    const selection = this.#getSelectedGuids(list);
    if (selection.has(guid)) {
      selection.delete(guid);
      if (!selection.size) {
        this.selectedRows.delete(list);
      }
    } else {
      selection.add(guid);
    }
    list.requestVirtualListUpdate();
  }

  selectAllInList(list) {
    const selection = this.#getSelectedGuids(list);
    for (const { guid } of list.tabItems) {
      selection.add(guid);
    }
    list.requestVirtualListUpdate();
  }

  #getSelectedGuids(list) {
    let selection = this.selectedRows.get(list);
    if (!selection) {
      selection = new Set();
      this.selectedRows.set(list, selection);
    }
    return selection;
  }

  /**
   * Centralized keyboard handler for the tree view.
   *
   * @param {KeyboardEvent} event
   */
  handleKeydown(event) {
    const accel = event.getModifierState("Accel");
    if (accel && event.key.toUpperCase() === this.selectAllShortcut) {
      this.#selectAll(event);
      return;
    }

    const from = event.originalTarget;
    const navigateOpts = {
      shift: event.shiftKey && this.multiSelect,
      keepSelection: accel,
      from,
    };
    switch (event.code) {
      case "ArrowUp":
        event.preventDefault();
        this.#navigate({
          direction: "up",
          ...navigateOpts,
        });
        break;
      case "ArrowDown":
        event.preventDefault();
        this.#navigate({
          direction: "down",
          ...navigateOpts,
        });
        break;
      case "ArrowLeft":
        event.preventDefault();
        this.#collapseOrMoveUpToHeader(from);
        break;
      case "ArrowRight":
        event.preventDefault();
        if (from.localName === "summary") {
          this.#expandOrMoveDownFromHeader(from);
        }
        break;
      case "Home":
        event.preventDefault();
        this.#navigate({
          direction: "home",
          ...navigateOpts,
        });
        break;
      case "End":
        event.preventDefault();
        this.#navigate({
          direction: "end",
          ...navigateOpts,
        });
        break;
    }
  }

  get selectAllShortcut() {
    if (!this._selectAllShortcut) {
      const localization = new Localization(
        ["toolkit/global/textActions.ftl"],
        true
      );
      const [message] = localization.formatMessagesSync([
        "text-action-select-all-shortcut",
      ]);
      this._selectAllShortcut = message.attributes[0].value;
    }
    return this._selectAllShortcut;
  }

  /**
   * Select all items from the active list.
   *
   * @param {KeyboardEvent} event
   *   Keyboard shortcut which invoked the Select All command.
   */
  #selectAll(event) {
    if (!this.multiSelect) {
      return;
    }
    const list = event.originalTarget.getRootNode().host;
    if (list?.tabItems) {
      event.preventDefault();
      this.selectAllInList(list);
    }
  }

  /**
   * If the focused element is expanded, collapse it. Otherwise, focus the
   * nearest containing folder summary or card header.
   *
   * @param {Element} from
   */
  #collapseOrMoveUpToHeader(from) {
    const node = this.#findNode(this.treeNodes, from);
    const expandStateChanged = node && this.host.setExpanded(node, false);
    if (expandStateChanged) {
      delete this._treeNodes;
      return;
    }

    const container = from.getRootNode().host;

    // If we're on a nested card header, move up one level.
    if (container.localName === "moz-card") {
      if (container.classList.contains("nested-card")) {
        this.#focusElement(container.parentElement.summaryEl);
      }
      return;
    }

    // If we're in a tab list, move up to the closest header.
    const parentDetails = container.closest("details");
    if (parentDetails) {
      this.#focusElement(parentDetails.querySelector("summary"));
      return;
    }
    const parentCard = container.closest("moz-card");
    if (parentCard?.summaryEl) {
      this.#focusElement(parentCard.summaryEl);
    }
  }

  /**
   * From the card header, expand the card. If is already expanded, focus the
   * first item in the list.
   *
   * @param {Element} header
   */
  #expandOrMoveDownFromHeader(header) {
    const node = this.#findNode(this.treeNodes, header);
    const expandStateChanged = node && this.host.setExpanded(node, true);
    if (expandStateChanged) {
      delete this._treeNodes;
      return;
    }
    this.#navigate({ direction: "down", keepSelection: true, from: header });
  }

  /**
   * Focus the DOM element corresponding to a tree view node.
   *
   * @param {TreeViewNode} node
   */
  #focusNode(node) {
    const el = node.domNode;
    if (el) {
      this.#focusElement(el);
    }
  }

  /**
   * Move focus to an element without scrolling the page, then nudge it into
   * view if the element is offscreen.
   *
   * @param {Element} element
   */
  #focusElement(element) {
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: "nearest" });
  }

  /**
   * Find the tree view node that corresponds to the given DOM element.
   *
   * @param {TreeViewNode[]} nodes
   * @param {Element} element
   * @returns {TreeViewNode}
   */
  #findNode(nodes, element) {
    const index = this.#findNodeIndex(nodes, element);
    return nodes[index];
  }

  /**
   * Find the index of the tree view node corresponding to the given DOM
   * element. Returns -1 if no match is found.
   *
   * @param {TreeViewNode[]} nodes
   * @param {Element} element
   * @returns {number}
   */
  #findNodeIndex(nodes, element) {
    const elementHost = element.getRootNode().host;
    const elementGuid = element.dataset.guid;
    return nodes.findIndex(node => {
      if (node.type === "card-summary") {
        return node.card?.summaryEl === element;
      }
      return node.list === elementHost && node.item.guid === elementGuid;
    });
  }

  /**
   * Add a single guid to a list's selection.
   *
   * @param {SidebarTabList} list
   * @param {string} guid
   */
  selectRowInList(list, guid) {
    this.#getSelectedGuids(list).add(guid);
    list.requestVirtualListUpdate();
  }

  /**
   * Select all items between current anchor and target row, in visual order.
   *
   * If no anchor has been set, fall back to selecting just the target row and
   * making it the new anchor.
   *
   * @param {SidebarTabList} targetList
   * @param {string} targetGuid
   */
  #extendSelection(targetList, targetGuid) {
    const { list: anchorList, guid: anchorGuid } = this.#selectionAnchor;

    if (!anchorList || !anchorGuid) {
      this.#setAnchor(targetList, targetGuid);
      this.selectRowInList(targetList, targetGuid);
      return;
    }

    const rows = this.treeNodes.filter(({ type }) => type === "row");
    const anchorIndex = rows.findIndex(
      row => row.list === anchorList && row.item.guid === anchorGuid
    );
    const targetIndex = rows.findIndex(
      row => row.list === targetList && row.item.guid === targetGuid
    );

    if (anchorIndex === -1 || targetIndex === -1) {
      // Anchor or target isn't reachable in visual order (e.g. anchor's list
      // was destroyed, or the sublist isn't currently rendered). Reset and
      // treat the target as a fresh anchor.
      this.#clearSelection();
      this.#setAnchor(targetList, targetGuid);
      this.selectRowInList(targetList, targetGuid);
      return;
    }

    const selectedLists = [...this.selectedRows.keys()];
    const listsToUpdate = new Set();
    this.selectedRows.clear();

    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    for (let i = start; i <= end; i++) {
      const { list, item } = rows[i];
      this.#getSelectedGuids(list).add(item.guid);
      listsToUpdate.add(list);
    }
    for (const list of selectedLists) {
      listsToUpdate.add(list);
    }
    for (const list of listsToUpdate) {
      list.requestVirtualListUpdate();
    }
  }

  /**
   * Move keyboard focus to the next or previous node in visual order, and
   * update selection state if the destination is a row.
   *
   * @param {object} options
   * @param {"up" | "down" | "home" | "end"} options.direction
   * @param {boolean} [options.shift]
   * @param {boolean} [options.keepSelection]
   *   When true, move focus without touching selection or anchor.
   * @param {Element} options.from
   *   Element that received the originating event.
   */
  async #navigate({ direction, shift = false, keepSelection = false, from }) {
    const nodes = this.treeNodes;
    if (!nodes.length) {
      return;
    }
    const prevSelectionIndex = this.#findNodeIndex(nodes, from);
    const prevSelection = nodes[prevSelectionIndex];
    if (!prevSelection) {
      return;
    }

    let newIndex;
    let shouldFlushBeforeFocus = false;
    switch (direction) {
      case "home": {
        const scrollContainer = this.host.shadowRoot.querySelector(
          ".sidebar-panel-scrollable-content"
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
          shouldFlushBeforeFocus = true;
        }
        newIndex = 0;
        break;
      }
      case "end": {
        const scrollContainer = this.host.shadowRoot.querySelector(
          ".sidebar-panel-scrollable-content"
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
          shouldFlushBeforeFocus = true;
        }
        newIndex = nodes.length - 1;
        break;
      }
      case "up":
        newIndex = prevSelectionIndex - 1;
        break;
      case "down":
        newIndex = prevSelectionIndex + 1;
        break;
    }

    const newSelection = nodes[newIndex];
    if (!newSelection) {
      return;
    }
    // TODO: Double RAF usually gives enough time to re-render before focus,
    // but it's not guaranteed.
    // @see Bug 2037918 - Add virtual list function which scrolls to and focuses the first or last item
    if (shouldFlushBeforeFocus) {
      await new Promise(resolve => {
        const { requestAnimationFrame } = this.host.documentGlobal;
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    }
    this.#focusNode(newSelection);

    if (keepSelection) {
      return;
    }

    const newSelectionIsRow = newSelection.type === "row";
    if (shift) {
      const boundary = newSelectionIsRow ? newSelection : prevSelection;
      if (boundary.type === "row") {
        this.#extendSelection(boundary.list, boundary.item.guid);
      }
      return;
    }

    this.#clearSelection();
    if (newSelectionIsRow) {
      this.#setAnchor(newSelection.list, newSelection.item.guid);
    }
  }

  /**
   * Set the anchor to the focused row if no anchor is currently set.
   *
   * @param {CustomEvent} event
   */
  #handleFocusRow(event) {
    if (this.#selectionAnchor.guid) {
      return;
    }
    this.#setAnchor(event.originalTarget, event.detail.guid);
  }

  /**
   * Get all selected tab items across all lists.
   *
   * @returns {object[]}
   */
  getSelectedTabItems() {
    const items = [];
    for (const [list, guids] of this.selectedRows) {
      for (const item of list.tabItems) {
        if (guids.has(item.guid)) {
          items.push(item);
        }
      }
    }
    return items;
  }

  clearSelectionForList(list) {
    if (this.#selectionAnchor.list === list) {
      this.#resetAnchor();
    }
    if (this.selectedRows.delete(list)) {
      list.requestVirtualListUpdate();
    }
  }

  #clearSelection() {
    const listsToUpdate = [...this.selectedRows.keys()];
    this.selectedRows.clear();
    for (const list of listsToUpdate) {
      list.requestVirtualListUpdate();
    }
  }

  resetSelection() {
    this.#clearSelection();
    this.#resetAnchor();
  }
}
