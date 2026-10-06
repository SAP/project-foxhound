/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

import { html, when } from "chrome://global/content/vendor/lit.all.mjs";

import { SidebarPage } from "./sidebar-page.mjs";
import {
  navigateToLink,
  escapeHtmlEntities,
} from "chrome://browser/content/firefoxview/helpers.mjs";
// eslint-disable-next-line import/no-unassigned-import
import "chrome://browser/content/sidebar/sidebar-bookmark-list.mjs";

let XPCOMUtils;

ChromeUtils.defineESModuleGetters(lazy, {
  BrowserUtils: "resource://gre/modules/BrowserUtils.sys.mjs",
  OpenInTabsUtils:
    "moz-src:///browser/components/tabbrowser/OpenInTabsUtils.sys.mjs",
  PlacesTransactions: "resource://gre/modules/PlacesTransactions.sys.mjs",
  PlacesUIUtils: "moz-src:///browser/components/places/PlacesUIUtils.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
  SidebarTreeView:
    "moz-src:///browser/components/sidebar/SidebarTreeView.sys.mjs",
});

const bookmarkFolderLocalization = new Localization(
  ["browser/sidebar.ftl"],
  true
);

XPCOMUtils = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
).XPCOMUtils;
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "virtualListEnabledPref",
  "browser.firefox-view.virtual-list.enabled"
);

export class SidebarBookmarks extends SidebarPage {
  static properties = {
    bookmarks: { type: Object },
    searchQuery: { type: String },
    searchResults: { type: Array },
  };

  static queries = {
    panelHeader: "sidebar-panel-header",
    searchInput: "moz-input-search",
    bookmarkList: "sidebar-bookmark-list",
  };

  #placesEventTypes = [
    "bookmark-added",
    "bookmark-removed",
    "bookmark-moved",
    "bookmark-title-changed",
    "bookmark-url-changed",
  ];

  #onPlacesEvents = async () => {
    this.bookmarks = await this.getBookmarksList();
    if (this.searchQuery) {
      this.searchResults = this.#searchBookmarks(
        this.bookmarks,
        this.searchQuery.toLowerCase()
      );
    }
  };

  #expandedFolderGuids = new Set();

  #contextMenuItems = null;

  #initContextMenuItems() {
    const q = id => this._contextMenu.querySelector(id);
    const openAllBookmarks = q("#sidebar-bookmarks-context-open-all-bookmarks");
    const sepOpenAll = q("#sidebar-bookmarks-context-sep-open-all");
    const sortByName = q("#sidebar-bookmarks-context-sort-by-name");
    const sepSort = q("#sidebar-bookmarks-context-sep-sort");
    const openInTab = q("#sidebar-bookmarks-context-open-in-tab");
    const openInWindow = q("#sidebar-bookmarks-context-open-in-window");
    const sepOpenOptions = q("#sidebar-bookmarks-context-sep-open-options");
    const sepEditCopy = q("#sidebar-bookmarks-context-sep-edit-copy");
    const copyLink = q("#sidebar-bookmarks-context-copy-link");
    const sepCutCopy = q("#sidebar-bookmarks-context-sep-cut-copy");
    const cut = q("#sidebar-bookmarks-context-cut");
    const copy = q("#sidebar-bookmarks-context-copy");
    const openInContainerTab = q(
      "#sidebar-bookmarks-context-open-in-container-tab"
    );
    const openInPrivateWindow = q(
      "#sidebar-bookmarks-context-open-in-private-window"
    );
    const editBookmark = q("#sidebar-bookmarks-context-edit-bookmark");
    const deleteBookmark = q("#sidebar-bookmarks-context-delete-bookmark");
    const showInFolder = q("#sidebar-bookmarks-context-show-in-folder");
    const sepAdd = q("#sidebar-bookmarks-context-sep-add");
    const addBookmark = q("#sidebar-bookmarks-context-add-bookmark");
    const addFolder = q("#sidebar-bookmarks-context-add-folder");
    const addSeparator = q("#sidebar-bookmarks-context-add-separator");
    this.#contextMenuItems = {
      folderItems: [openAllBookmarks, sepOpenAll, sepSort, sortByName],
      bookmarkItems: [
        openInTab,
        openInWindow,
        sepOpenOptions,
        sepEditCopy,
        copyLink,
      ],
      alwaysShownItems: [sepCutCopy, cut, copy],
      openAllBookmarks,
      sepOpenAll,
      sortByName,
      sepSort,
      openInTab,
      openInWindow,
      sepOpenOptions,
      sepEditCopy,
      copyLink,
      sepCutCopy,
      cut,
      copy,
      openInContainerTab,
      openInPrivateWindow,
      editBookmark,
      deleteBookmark,
      showInFolder,
      sepAdd,
      addBookmark,
      addFolder,
      addSeparator,
      paste: q("#sidebar-bookmarks-context-paste"),
    };
  }

  constructor() {
    super();
    this.bookmarks = [];
    this.searchQuery = "";
    this.searchResults = [];
    this.onSearchQuery = this.onSearchQuery.bind(this);
    this.treeView = new lazy.SidebarTreeView(this);
  }

  connectedCallback() {
    super.connectedCallback();
    lazy.PlacesUtils.observers.addListener(
      this.#placesEventTypes,
      this.#onPlacesEvents
    );
    this.addContextMenuListeners();
    this.addSidebarFocusedListeners();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    lazy.PlacesUtils.observers.removeListener(
      this.#placesEventTypes,
      this.#onPlacesEvents
    );
    this.removeContextMenuListeners();
    this.removeSidebarFocusedListeners();
  }

  async firstUpdated() {
    for (const guid of this.sidebarController._state.bookmarksExpandedFolders) {
      this.#expandedFolderGuids.add(guid);
    }
    this.bookmarks = await this.getBookmarksList();
    this.requestUpdate();
  }

  handleSidebarFocusedEvent() {
    this.searchInput?.focus();
  }

  getNodesInOrder() {
    const nodes = [];
    this.#collectNodesFromList(this.bookmarkList, nodes);
    return nodes;
  }

  #collectNodesFromList(list, nodes) {
    for (const item of list.tabItems) {
      const isFolder = Array.isArray(item.children);
      if (isFolder) {
        this.#collectNodesFromFolder(item, list, nodes);
      } else {
        nodes.push({
          list,
          item,
          type: item.url ? "row" : "separator",
          get domNode() {
            return list.shadowRoot.querySelector(
              `[data-guid="${CSS.escape(item.guid)}"]`
            );
          },
        });
      }
    }
  }

  #collectNodesFromFolder(folder, list, nodes) {
    const isExpanded = this.#expandedFolderGuids.has(folder.guid);
    if (folder.children.length) {
      nodes.push({
        list,
        item: folder,
        type: "folder",
        get domNode() {
          return list.shadowRoot.querySelector(
            `summary[data-guid="${CSS.escape(folder.guid)}"]`
          );
        },
      });
      if (isExpanded) {
        const sublist = list.findSublistForGuid(folder.guid);
        if (sublist) {
          this.#collectNodesFromList(sublist, nodes);
        }
      }
    } else {
      nodes.push({
        list,
        item: folder,
        type: "empty-folder",
        get domNode() {
          return list.shadowRoot.querySelector(
            `[data-guid="${CSS.escape(folder.guid)}"]`
          );
        },
      });
    }
  }

  setExpanded(node, expanded) {
    if (node.type === "folder") {
      const sublist = node.list?.findSublistForGuid(node.item.guid);
      const details = sublist?.closest("details");
      if (details && details.open !== expanded) {
        details.open = expanded;
        if (expanded) {
          this.#expandedFolderGuids.add(node.item.guid);
        } else {
          this.#expandedFolderGuids.delete(node.item.guid);
        }
        return true;
      }
      return false;
    }
    return super.setExpanded(node, expanded);
  }

  onPrimaryAction(e) {
    const { originalEvent } = e.detail;
    const row = e.originalTarget;
    const list = row.getRootNode().host;

    if (originalEvent.shiftKey) {
      list.dispatchEvent(
        new CustomEvent("shift-select", {
          bubbles: true,
          composed: true,
          detail: { row },
        })
      );
      return;
    }

    const anchorEvent = new CustomEvent("set-anchor", {
      bubbles: true,
      composed: true,
      detail: { guid: row.guid },
    });

    if (
      (originalEvent.type === "click" &&
        originalEvent.getModifierState("Accel")) ||
      (originalEvent.type === "keydown" && originalEvent.code === "Space")
    ) {
      list.toggleRowSelection(row.guid);
      list.dispatchEvent(anchorEvent);
      return;
    }

    this.treeView.resetSelection();
    list.dispatchEvent(anchorEvent);
    navigateToLink(e, row.url, { forceNewTab: false });
    Glean.sidebar.link.bookmarks.add(1);
  }

  handleContextMenuEvent(e) {
    this.triggerNode = this.findTriggerNode(e, "sidebar-bookmark-row");
    if (!this.triggerNode) {
      const separatorEl = this.#findSeparatorElement(e);
      if (separatorEl) {
        this.triggerNode = { guid: separatorEl.guid, isSeparator: true };
      } else {
        const folderEl = this.#findFolderElement(e);
        if (folderEl) {
          const isEmpty = folderEl.classList.contains("bookmark-folder-label");
          const title =
            folderEl.querySelector("summary")?.textContent?.trim() ??
            folderEl.textContent?.trim() ??
            "";
          const folderKind = folderEl.dataset.folderKind;
          const children = folderEl.querySelector(
            "sidebar-bookmark-list"
          )?.tabItems;
          this.triggerNode = {
            guid: folderEl.guid,
            title,
            children,
            isFolder: true,
            isEmpty,
            isRootFolder: lazy.PlacesUtils.isRootItem(folderEl.guid),
            isPlaceContainer:
              folderKind === "place-container" || folderKind === "tags-root",
            isTagContainer: folderKind === "tag-container",
            isTagsRoot: folderKind === "tags-root",
          };
        } else if (this.findTriggerNode(e, "moz-input-search")) {
          return;
        } else {
          e.preventDefault();
          return;
        }
      }
    }
    const isFolder = !!this.triggerNode.isFolder;
    const isSeparator = !!this.triggerNode.isSeparator;
    const isBookmark = !isFolder && !isSeparator;
    const isEmpty = !!this.triggerNode.isEmpty;
    const isRootFolder = !!this.triggerNode.isRootFolder;

    if (!this.#contextMenuItems) {
      this.#initContextMenuItems();
    }

    const selectedItems = this.treeView.getSelectedTabItems();
    const isMultiSelect =
      isBookmark &&
      selectedItems.length > 1 &&
      selectedItems.some(item => item.guid === this.triggerNode.guid);
    this.selectedItems = isMultiSelect ? selectedItems : null;

    if (isMultiSelect) {
      this.#configureMultiSelectContextMenu(selectedItems);
      return;
    }

    if (this.triggerNode.isPlaceContainer || this.triggerNode.isTagContainer) {
      this.#configureSmartFolderContextMenu(this.triggerNode);
      return;
    }

    const {
      folderItems,
      bookmarkItems,
      alwaysShownItems,
      openAllBookmarks,
      sortByName,
      openInContainerTab,
      openInPrivateWindow,
      editBookmark,
      deleteBookmark,
      showInFolder,
      copyLink,
      sepEditCopy,
      sepAdd,
      addBookmark,
      addFolder,
      addSeparator,
      paste,
    } = this.#contextMenuItems;

    for (const el of folderItems) {
      el.hidden = !isFolder;
    }
    for (const el of bookmarkItems) {
      el.hidden = !isBookmark;
    }
    for (const el of alwaysShownItems) {
      el.hidden = false;
    }

    openInContainerTab.hidden =
      !isBookmark ||
      lazy.PrivateBrowsingUtils.isWindowPrivate(this.topWindow) ||
      !Services.prefs.getBoolPref("privacy.userContext.enabled", false);
    openInPrivateWindow.hidden =
      !isBookmark || !lazy.PrivateBrowsingUtils.enabled;
    editBookmark.hidden = isSeparator;
    editBookmark.disabled = isRootFolder;
    paste.hidden = !this.#hasClipboardData();

    const isSearchResult = isBookmark && !!this.searchQuery;
    showInFolder.hidden = !isSearchResult;
    if (isSearchResult) {
      copyLink.hidden = true;
      paste.hidden = true;
      sepEditCopy.hidden = true;
      sepAdd.hidden = true;
      addBookmark.hidden = true;
      addFolder.hidden = true;
      addSeparator.hidden = true;
    } else {
      sepAdd.hidden = false;
      addBookmark.hidden = false;
      addFolder.hidden = false;
      addSeparator.hidden = false;
    }

    if (isFolder) {
      const hasBookmarkItems = !!this.triggerNode.children?.some(
        child => child.url && !child.isPlaceContainer
      );
      openAllBookmarks.disabled = isEmpty || !hasBookmarkItems;
    } else {
      openAllBookmarks.disabled = isEmpty;
    }
    openAllBookmarks.setAttribute("data-l10n-id", "places-open-all-bookmarks");
    sortByName.disabled = isEmpty;

    let deleteLabelId;
    if (isFolder) {
      deleteLabelId = "places-delete-folder";
    } else if (isSeparator) {
      deleteLabelId = "sidebar-bookmarks-context-menu-delete-separator";
    } else {
      deleteLabelId = "sidebar-bookmarks-context-menu-delete-bookmark";
    }
    deleteBookmark.setAttribute("data-l10n-id", deleteLabelId);
    if (isFolder) {
      deleteBookmark.setAttribute(
        "data-l10n-args",
        JSON.stringify({ count: 1 })
      );
    } else {
      deleteBookmark.removeAttribute("data-l10n-args");
    }
    editBookmark.setAttribute(
      "data-l10n-id",
      isFolder
        ? "places-edit-folder2"
        : "sidebar-bookmarks-context-menu-edit-bookmark"
    );
  }

  #configureSmartFolderContextMenu(node) {
    const isPlaceContainer = !!node.isPlaceContainer;
    const isTagContainer = !!node.isTagContainer;
    const isTagsRoot = !!node.isTagsRoot;
    const {
      openAllBookmarks,
      sepOpenAll,
      sortByName,
      sepSort,
      openInTab,
      openInWindow,
      sepOpenOptions,
      sepEditCopy,
      copyLink,
      sepCutCopy,
      cut,
      copy,
      openInContainerTab,
      openInPrivateWindow,
      editBookmark,
      deleteBookmark,
      showInFolder,
      sepAdd,
      addBookmark,
      addFolder,
      addSeparator,
      paste,
    } = this.#contextMenuItems;

    openAllBookmarks.hidden = false;
    openAllBookmarks.disabled = isTagsRoot || !!node.isEmpty;
    openAllBookmarks.setAttribute(
      "data-l10n-id",
      isTagContainer ? "places-open-all-bookmarks" : "places-open-all-in-tabs"
    );
    sepOpenAll.hidden = false;

    openInTab.hidden = true;
    openInContainerTab.hidden = true;
    openInWindow.hidden = true;
    openInPrivateWindow.hidden = true;
    sepOpenOptions.hidden = true;
    showInFolder.hidden = true;

    editBookmark.hidden = false;
    editBookmark.disabled = isPlaceContainer;
    editBookmark.setAttribute("data-l10n-id", "places-edit-generic");

    deleteBookmark.hidden = false;
    deleteBookmark.setAttribute("data-l10n-id", "text-action-delete");
    deleteBookmark.removeAttribute("data-l10n-args");

    sepSort.hidden = true;
    sortByName.hidden = true;

    sepCutCopy.hidden = false;
    cut.hidden = isTagContainer;
    copy.hidden = false;
    paste.hidden = true;

    sepEditCopy.hidden = true;
    copyLink.hidden = true;

    sepAdd.hidden = true;
    addBookmark.hidden = true;
    addFolder.hidden = true;
    addSeparator.hidden = true;
  }

  #configureMultiSelectContextMenu(selectedItems) {
    const {
      openAllBookmarks,
      sepOpenAll,
      sortByName,
      sepSort,
      openInTab,
      openInWindow,
      sepOpenOptions,
      sepEditCopy,
      copyLink,
      sepCutCopy,
      cut,
      copy,
      openInContainerTab,
      openInPrivateWindow,
      editBookmark,
      deleteBookmark,
      showInFolder,
      paste,
    } = this.#contextMenuItems;

    openAllBookmarks.hidden = false;
    openAllBookmarks.disabled = false;
    openAllBookmarks.setAttribute("data-l10n-id", "places-open-all-bookmarks");
    sepOpenAll.hidden = false;

    openInTab.hidden = true;
    openInContainerTab.hidden = true;
    openInWindow.hidden = true;
    openInPrivateWindow.hidden = true;
    sepOpenOptions.hidden = true;
    showInFolder.hidden = true;

    editBookmark.hidden = false;
    editBookmark.disabled = true;
    editBookmark.setAttribute(
      "data-l10n-id",
      "sidebar-bookmarks-context-menu-edit-bookmark"
    );

    deleteBookmark.hidden = false;
    deleteBookmark.setAttribute("data-l10n-id", "places-delete-bookmark");
    deleteBookmark.setAttribute(
      "data-l10n-args",
      JSON.stringify({ count: selectedItems.length })
    );

    sepSort.hidden = true;
    sortByName.hidden = true;

    sepCutCopy.hidden = false;
    cut.hidden = false;
    copy.hidden = false;
    paste.hidden = !this.#hasClipboardData();

    sepEditCopy.hidden = true;
    copyLink.hidden = true;
  }

  #findSeparatorElement(e) {
    const candidates = [
      e.explicitOriginalTarget,
      e.originalTarget.flattenedTreeParentNode,
      e.explicitOriginalTarget.flattenedTreeParentNode?.getRootNode().host,
      e.originalTarget.flattenedTreeParentNode?.getRootNode().host,
    ];
    for (const el of candidates) {
      if (el?.classList?.contains("bookmark-separator")) {
        return el;
      }
    }
    return null;
  }

  #findFolderElement(e) {
    const candidates = [
      e.explicitOriginalTarget,
      e.originalTarget.flattenedTreeParentNode,
      e.explicitOriginalTarget.flattenedTreeParentNode?.getRootNode().host,
      e.originalTarget.flattenedTreeParentNode?.getRootNode().host,
    ];
    for (const el of candidates) {
      if (el?.localName === "summary") {
        const details = el.parentElement;
        if (details?.guid) {
          return details;
        }
      }
      if (el?.localName === "details" && el.guid) {
        return el;
      }
    }
    for (const el of e.composedPath()) {
      if (el?.classList?.contains("bookmark-folder-label")) {
        return el;
      }
    }
    return null;
  }

  handleCommandEvent(e) {
    if (e.target.hasAttribute("data-usercontextid")) {
      const userContextId = parseInt(
        e.target.getAttribute("data-usercontextid")
      );
      this.topWindow.openTrustedLinkIn(this.triggerNode.url, "tab", {
        userContextId,
      });
      Glean.browserUiInteraction.sidebarBookmarks.open_in_new_container_tab.add(
        1
      );
      return;
    }
    let label;
    switch (e.target.id) {
      case "sidebar-bookmarks-context-open-all-bookmarks":
        this.#openBookmarks(this.selectedItems ?? [this.triggerNode]);
        break;
      case "sidebar-bookmarks-context-sort-by-name":
        this.#sortByName();
        label = "sort_bookmarks_by_name";
        break;
      case "sidebar-bookmarks-context-open-in-tab":
        this.topWindow.openTrustedLinkIn(this.triggerNode.url, "tab");
        label = "open_in_new_tab";
        break;
      case "sidebar-bookmarks-context-open-in-window":
        this.topWindow.openTrustedLinkIn(this.triggerNode.url, "window", {
          private: false,
        });
        label = "open_in_new_window";
        break;
      case "sidebar-bookmarks-context-open-in-private-window":
        this.topWindow.openTrustedLinkIn(this.triggerNode.url, "window", {
          private: true,
        });
        label = "open_in_private_window";
        break;
      case "sidebar-bookmarks-context-edit-bookmark":
        this.#editBookmarkOrFolder(this.triggerNode);
        break;
      case "sidebar-bookmarks-context-delete-bookmark":
        this.#deleteBookmarks(this.selectedItems ?? [this.triggerNode]);
        break;
      case "sidebar-bookmarks-context-show-in-folder":
        this.showInFolder(this.triggerNode.guid).catch(console.error);
        break;
      case "sidebar-bookmarks-context-copy-link":
        lazy.BrowserUtils.copyLink(
          this.triggerNode.url,
          this.triggerNode.title
        );
        label = "copy_bookmark_url";
        break;
      case "sidebar-bookmarks-context-add-bookmark":
        this.#addItem("bookmark");
        break;
      case "sidebar-bookmarks-context-add-folder":
        this.#addItem("folder");
        break;
      case "sidebar-bookmarks-context-add-separator":
        this.#addSeparator();
        label = "add_separator";
        break;
      case "sidebar-bookmarks-context-cut":
        this.#cutBookmarks(this.selectedItems ?? [this.triggerNode]);
        label = "cut_bookmark";
        break;
      case "sidebar-bookmarks-context-copy":
        this.#copyBookmarks(this.selectedItems ?? [this.triggerNode]);
        break;
      case "sidebar-bookmarks-context-paste":
        this.#paste();
        break;
    }
    if (label) {
      Glean.browserUiInteraction.sidebarBookmarks[label].add(1);
    }
  }

  onSecondaryAction(e) {
    this.triggerNode = e.detail.item;
    this.#deleteBookmarks([this.triggerNode]);
  }

  async #editBookmarkOrFolder(bookmark) {
    const fetchInfo = await lazy.PlacesUtils.bookmarks.fetch({
      guid: bookmark.guid,
    });
    if (!fetchInfo) {
      return;
    }
    const node =
      await lazy.PlacesUIUtils.promiseNodeLikeFromFetchInfo(fetchInfo);
    const guid = await lazy.PlacesUIUtils.showBookmarkDialog(
      { action: "edit", node },
      this.topWindow
    );
    const outcome = guid ? "confirmed" : "cancelled";
    const labelPrefix = bookmark.isFolder
      ? "rename_bookmark_folder"
      : "edit_bookmark";
    Glean.browserUiInteraction.sidebarBookmarks[
      `${labelPrefix}_${outcome}`
    ].add(1);
  }

  async #deleteBookmarks(bookmarks) {
    await lazy.PlacesTransactions.Remove({
      guids: bookmarks.map(b => b.guid),
    }).transact();
  }

  async showInFolder(guid) {
    this.searchQuery = "";
    this.searchResults = [];
    if (this.searchInput) {
      this.searchInput.value = "";
    }

    const fetchInfo = await lazy.PlacesUtils.bookmarks.fetch({ guid }, null, {
      includePath: true,
    });
    if (!fetchInfo) {
      return;
    }
    for (const ancestor of fetchInfo.path ?? []) {
      this.#expandedFolderGuids.add(ancestor.guid);
    }
    this.#expandedFolderGuids.add(fetchInfo.parentGuid);
    this.sidebarController._state.bookmarksExpandedFolders = [
      ...this.#expandedFolderGuids,
    ];

    // #expandedFolderGuids is mutated in place, so Lit can't detect the
    // change; request an update explicitly so the tree re-renders with the
    // ancestor folders expanded before we scroll to the row.
    this.requestUpdate();
    await this.updateComplete;
    await this.#scrollAndFocusBookmarkRow(guid);
  }

  async #scrollAndFocusBookmarkRow(guid) {
    const findRow = list => {
      if (!list) {
        return null;
      }
      for (const row of list.rowEls ?? []) {
        if (row.guid === guid) {
          return { row, list };
        }
      }
      for (const details of list.folderEls ?? []) {
        const sublist = details.querySelector("sidebar-bookmark-list");
        const found = findRow(sublist);
        if (found) {
          return found;
        }
      }
      return null;
    };

    const found = await this.#waitForElement(() => findRow(this.bookmarkList));
    if (!found) {
      return;
    }

    const { row, list } = found;
    this.treeView.resetSelection();
    this.treeView.selectRowInList(list, row.guid);
    await list.requestVirtualListUpdate();
    row.scrollIntoView({ block: "nearest" });
    row.mainEl?.focus?.();
  }

  async #waitForElement(probe, { maxFrames = 60 } = {}) {
    for (let i = 0; i < maxFrames; i++) {
      const found = probe();
      if (found) {
        return found;
      }
      await this.bookmarkList?.updateComplete;
      await new Promise(resolve =>
        this.documentGlobal.requestAnimationFrame(resolve)
      );
    }
    return probe();
  }

  async #addItem(type) {
    const dialogInfo = { action: "add", type };
    const defaultInsertionPoint = await this.#getInsertionPoint();
    if (defaultInsertionPoint) {
      dialogInfo.defaultInsertionPoint = defaultInsertionPoint;
      // The folder picker ignores the insertion index, so hide it to honor the
      // position derived from the right-clicked node.
      dialogInfo.hiddenRows = ["folderPicker"];
    }
    const guid = await lazy.PlacesUIUtils.showBookmarkDialog(
      dialogInfo,
      this.topWindow
    );
    const outcome = guid ? "confirmed" : "cancelled";
    const label =
      type === "folder"
        ? `add_bookmark_folder_${outcome}`
        : `add_bookmark_${outcome}`;
    Glean.browserUiInteraction.sidebarBookmarks[label].add(1);
  }

  /**
   * Builds the insertion point for a new item added from the context menu,
   * based on the right-clicked node. Right-clicking a folder inserts at the
   * end of that folder, while right-clicking a bookmark or separator inserts
   * just before it. Returns undefined when the right-clicked bookmark can no
   * longer be fetched (e.g. it was removed between opening the menu and
   * confirming the dialog), so the dialog falls back to its default parent.
   *
   * @returns {Promise<?{guid: string, getIndex: function(): number}>}
   */
  async #getInsertionPoint() {
    const node = this.triggerNode;
    if (node.isFolder) {
      return {
        guid: node.guid,
        getIndex: () => lazy.PlacesUtils.bookmarks.DEFAULT_INDEX,
      };
    }
    const fetchInfo = await lazy.PlacesUtils.bookmarks.fetch({
      guid: node.guid,
    });
    if (!fetchInfo) {
      return undefined;
    }
    return {
      guid: fetchInfo.parentGuid,
      getIndex: () => fetchInfo.index,
    };
  }

  async #addSeparator() {
    const fetchInfo = await lazy.PlacesUtils.bookmarks.fetch({
      guid: this.triggerNode.guid,
    });
    if (!fetchInfo) {
      return;
    }
    await lazy.PlacesTransactions.NewSeparator({
      parentGuid: fetchInfo.parentGuid,
      index: fetchInfo.index,
    }).transact();
  }

  async #openBookmarks(bookmarks) {
    const urls = [];
    for (const item of bookmarks) {
      if (item.isFolder) {
        const tree = await lazy.PlacesUtils.promiseBookmarksTree(item.guid);
        urls.push(...this.#collectBookmarkUrls(tree));
      } else if (item.url) {
        urls.push(item.url);
      }
    }
    if (!lazy.OpenInTabsUtils.confirmOpenInTabs(urls.length, this.topWindow)) {
      return;
    }
    Glean.browserUiInteraction.sidebarBookmarks.open_all_bookmarks.add(1);
    for (const url of urls) {
      this.topWindow.openTrustedLinkIn(url, "tab", { inBackground: true });
    }
  }

  #collectBookmarkUrls(node) {
    const urls = [];
    for (const child of node.children ?? []) {
      if (child.uri) {
        urls.push(child.uri);
      }
    }
    return urls;
  }

  async #sortByName() {
    await lazy.PlacesTransactions.SortByName(this.triggerNode.guid).transact();
  }

  async #cutBookmarks(bookmarks) {
    this.#copyBookmarksToClipboard(bookmarks, "cut");
    await lazy.PlacesTransactions.Remove({
      guids: bookmarks.map(b => b.guid),
    }).transact();
  }

  #copyBookmarks(bookmarks) {
    this.#copyBookmarksToClipboard(bookmarks, "copy");
  }

  #copyBookmarksToClipboard(bookmarks, action) {
    const data = bookmarks
      .map(item => {
        if (item.isSeparator) {
          return JSON.stringify({
            type: lazy.PlacesUtils.TYPE_X_MOZ_PLACE_SEPARATOR,
          });
        }
        if (item.isFolder) {
          return JSON.stringify({
            type: lazy.PlacesUtils.TYPE_X_MOZ_PLACE_CONTAINER,
            itemGuid: item.guid,
            instanceId: lazy.PlacesUtils.instanceId,
            title: item.title,
          });
        }
        return JSON.stringify({
          type: lazy.PlacesUtils.TYPE_X_MOZ_PLACE,
          itemGuid: item.guid,
          instanceId: lazy.PlacesUtils.instanceId,
          title: item.title,
          uri: item.url,
        });
      })
      .join(lazy.PlacesUtils.endl);
    this.#setClipboard(data, action);
  }

  #setClipboard(data, action) {
    const xferable = Cc["@mozilla.org/widget/transferable;1"].createInstance(
      Ci.nsITransferable
    );
    xferable.init(null);
    function toISupports(str) {
      const s = Cc["@mozilla.org/supports-string;1"].createInstance(
        Ci.nsISupportsString
      );
      s.data = str;
      return s;
    }
    xferable.addDataFlavor(lazy.PlacesUtils.TYPE_X_MOZ_PLACE);
    xferable.setTransferData(
      lazy.PlacesUtils.TYPE_X_MOZ_PLACE,
      toISupports(data)
    );
    xferable.addDataFlavor(lazy.PlacesUtils.TYPE_X_MOZ_PLACE_ACTION);
    xferable.setTransferData(
      lazy.PlacesUtils.TYPE_X_MOZ_PLACE_ACTION,
      toISupports(action + "," + Services.appinfo.name)
    );
    Services.clipboard.setData(
      xferable,
      null,
      Ci.nsIClipboard.kGlobalClipboard
    );
  }

  #hasClipboardData() {
    return Services.clipboard.hasDataMatchingFlavors(
      [
        lazy.PlacesUtils.TYPE_X_MOZ_PLACE,
        lazy.PlacesUtils.TYPE_X_MOZ_URL,
        lazy.PlacesUtils.TYPE_PLAINTEXT,
      ],
      Ci.nsIClipboard.kGlobalClipboard
    );
  }

  async #paste() {
    const fetchInfo = await lazy.PlacesUtils.bookmarks.fetch({
      guid: this.triggerNode.guid,
    });
    if (!fetchInfo) {
      return;
    }
    const xferable = Cc["@mozilla.org/widget/transferable;1"].createInstance(
      Ci.nsITransferable
    );
    xferable.init(null);
    [
      lazy.PlacesUtils.TYPE_X_MOZ_PLACE,
      lazy.PlacesUtils.TYPE_X_MOZ_URL,
      lazy.PlacesUtils.TYPE_PLAINTEXT,
    ].forEach(type => xferable.addDataFlavor(type));
    Services.clipboard.getData(xferable, Ci.nsIClipboard.kGlobalClipboard);
    let data = {};
    let type = {};
    try {
      xferable.getAnyTransferData(type, data);
    } catch (e) {
      return;
    }
    let isCut = false;
    try {
      const actionXferable = Cc[
        "@mozilla.org/widget/transferable;1"
      ].createInstance(Ci.nsITransferable);
      actionXferable.init(null);
      actionXferable.addDataFlavor(lazy.PlacesUtils.TYPE_X_MOZ_PLACE_ACTION);
      Services.clipboard.getData(
        actionXferable,
        Ci.nsIClipboard.kGlobalClipboard
      );
      let actionValue = {};
      actionXferable.getTransferData(
        lazy.PlacesUtils.TYPE_X_MOZ_PLACE_ACTION,
        actionValue
      );
      const [clipAction] = actionValue.value
        .QueryInterface(Ci.nsISupportsString)
        .data.split(",");
      isCut = clipAction === "cut";
    } catch (e) {
      // Default to copy
    }
    let validNodes;
    try {
      ({ validNodes } = lazy.PlacesUtils.unwrapNodes(
        data.value.QueryInterface(Ci.nsISupportsString).data,
        type.value
      ));
    } catch (e) {
      return;
    }
    if (!validNodes.length) {
      return;
    }
    const insertionPoint = {
      guid: fetchInfo.parentGuid,
      isTag: false,
      getIndex: async () => fetchInfo.index + 1,
    };
    await lazy.PlacesUIUtils.handleTransferItems(
      validNodes,
      insertionPoint,
      !isCut,
      null
    );
    if (isCut) {
      Services.clipboard.emptyClipboard(Ci.nsIClipboard.kGlobalClipboard);
    }
  }

  #onFolderToggle(e) {
    const { guid, open: isOpen } = e.detail;
    if (isOpen) {
      this.#expandedFolderGuids.add(guid);
    } else {
      this.#expandedFolderGuids.delete(guid);
    }
    this.sidebarController._state.bookmarksExpandedFolders = [
      ...this.#expandedFolderGuids,
    ];
  }

  onSearchQuery(e) {
    this.searchQuery = e.detail.query;
    this.searchResults = this.searchQuery
      ? this.#searchBookmarks(this.bookmarks, this.searchQuery.toLowerCase())
      : [];
    if (this.searchQuery) {
      Glean.browserUiInteraction.sidebarBookmarks.search.add(1);
    }
  }

  #searchBookmarks(node, query) {
    const results = [];
    for (const child of node.children ?? []) {
      if (child.children) {
        results.push(...this.#searchBookmarks(child, query));
      } else if (
        child.title?.toLowerCase().includes(query) ||
        child.url?.toLowerCase().includes(query)
      ) {
        results.push(child);
      }
    }
    return results;
  }

  bookmarkItemTemplate = bookmark => {
    if (bookmark.children) {
      return html`
        ${when(
          lazy.virtualListEnabledPref,
          () => html`
            <details>
              <summary part="summary">${bookmark.title}</summary>
              <div id="content">
                <virtual-list
                  .activeIndex=${0}
                  .items=${bookmark.children}
                  .template=${this.bookmarkItemTemplate}
                ></virtual-list>
              </div>
            </details>
          `,
          () =>
            html`${this.getBookmarkList.map(bookmarkItem =>
              this.bookmarkItemTemplate(bookmarkItem)
            )}`
        )}
      `;
    }

    return html`
      <div class="bookmark-item">
        <span>${bookmark.title}</span>
      </div>
    `;
  };

  async getBookmarksList() {
    const tree = await lazy.PlacesUtils.promiseBookmarksTree("root________");
    const { bookmarks } = lazy.PlacesUtils;
    const guidToL10nId = {
      [bookmarks.menuGuid]: "sidebar-bookmarks-folder-menu",
      [bookmarks.toolbarGuid]: "sidebar-bookmarks-folder-toolbar",
      [bookmarks.unfiledGuid]: "sidebar-bookmarks-folder-other",
      [bookmarks.mobileGuid]: "sidebar-bookmarks-folder-mobile",
    };
    this.#normalizeBookmarkNode(tree, guidToL10nId);
    tree.children?.sort((a, b) => {
      if (a.guid === bookmarks.toolbarGuid) {
        return -1;
      }
      if (b.guid === bookmarks.toolbarGuid) {
        return 1;
      }
      return 0;
    });
    return tree;
  }

  #normalizeBookmarkNode(node, guidToL10nId) {
    if (node.iconUri && !node.iconUri.startsWith("fake-favicon-uri:")) {
      node.icon = node.iconUri;
    } else if (node.uri) {
      node.icon = `page-icon:${node.uri}`;
    }
    if (node.uri) {
      node.url = node.uri;
    }
    if (node.type === lazy.PlacesUtils.TYPE_X_MOZ_PLACE_CONTAINER) {
      node.children ??= [];
    } else if (
      node.type === lazy.PlacesUtils.TYPE_X_MOZ_PLACE &&
      node.uri?.startsWith("place:")
    ) {
      this.#expandPlaceQuery(node);
    }
    const l10nId = guidToL10nId?.[node.guid];
    if (l10nId) {
      const [msg] = bookmarkFolderLocalization.formatMessagesSync([
        { id: l10nId },
      ]);
      node.title = msg.value;
    }
    for (const child of node.children ?? []) {
      this.#normalizeBookmarkNode(child, guidToL10nId);
    }
  }

  /**
   * Execute a smart-bookmark (place:) query and attach its results as
   * children, so it renders as a folder like the legacy bookmarks sidebar.
   *
   * TODO (Bug 2043613): migrate to asyncExecuteLegacyQuery to avoid
   * main-thread I/O. That requires the bookmarks tree pipeline to support
   * async child expansion.
   *
   * @param {object} node
   *   The bookmark tree node whose `uri` is a `place:` query.
   */
  #expandPlaceQuery(node) {
    const placesHistory = lazy.PlacesUtils.history;
    const queryRef = {};
    const optionsRef = {};
    placesHistory.queryStringToQuery(node.uri, queryRef, optionsRef);
    let result;
    try {
      result = placesHistory.executeQuery(queryRef.value, optionsRef.value);
    } catch (e) {
      return;
    }
    const wasOpen = result.root.containerOpen;
    result.root.containerOpen = true;
    try {
      node.children = this.#collectPlaceChildren(result.root, new Set());
      node.isPlaceContainer = true;
      node.isTagsRoot =
        optionsRef.value.resultType ===
        Ci.nsINavHistoryQueryOptions.RESULTS_AS_TAGS_ROOT;
    } finally {
      if (!wasOpen) {
        result.root.containerOpen = false;
      }
    }
  }

  #collectPlaceChildren(container, ancestorGuids) {
    const children = [];
    for (let i = 0; i < container.childCount; i++) {
      const child = this.#convertPlaceResultNode(
        container.getChild(i),
        ancestorGuids
      );
      if (child) {
        children.push(child);
      }
    }
    return children;
  }

  #convertPlaceResultNode(placeNode, ancestorGuids) {
    const {
      RESULT_TYPE_URI,
      RESULT_TYPE_FOLDER_SHORTCUT,
      RESULT_TYPE_QUERY,
      RESULT_TYPE_FOLDER,
    } = Ci.nsINavHistoryResultNode;
    switch (placeNode.type) {
      case RESULT_TYPE_URI:
        return {
          title: placeNode.title,
          uri: placeNode.uri,
          guid: placeNode.bookmarkGuid || placeNode.pageGuid,
          type: lazy.PlacesUtils.TYPE_X_MOZ_PLACE,
          isPlaceChild: true,
        };
      case RESULT_TYPE_FOLDER_SHORTCUT: {
        // Folder shortcuts are symlinks (place:parentGuid=...) to a concrete
        // folder. Render them as a leaf reference rather than recursing, so
        // deletion targets the shortcut rather than the linked folder.
        return {
          title: placeNode.title,
          uri: placeNode.uri,
          guid: placeNode.bookmarkGuid || placeNode.uri,
          type: lazy.PlacesUtils.TYPE_X_MOZ_PLACE,
          isPlaceChild: true,
        };
      }
      case RESULT_TYPE_QUERY:
      case RESULT_TYPE_FOLDER: {
        const isTagContainer =
          placeNode.type === RESULT_TYPE_QUERY &&
          lazy.PlacesUtils.nodeIsTagQuery(placeNode);
        const guid =
          placeNode.bookmarkGuid || placeNode.pageGuid || placeNode.uri;
        const node = {
          title: placeNode.title,
          uri: placeNode.uri,
          guid,
          type: lazy.PlacesUtils.TYPE_X_MOZ_PLACE_CONTAINER,
          isPlaceContainer: true,
          isPlaceChild: true,
          isTagContainer,
        };
        // Guard against query results that loop back into an ancestor.
        if (ancestorGuids.has(guid)) {
          node.children = [];
          return node;
        }
        const container = lazy.PlacesUtils.asContainer(placeNode);
        if (container) {
          ancestorGuids.add(guid);
          const wasOpen = container.containerOpen;
          container.containerOpen = true;
          try {
            node.children = this.#collectPlaceChildren(
              container,
              ancestorGuids
            );
          } finally {
            if (!wasOpen) {
              container.containerOpen = false;
            }
            ancestorGuids.delete(guid);
          }
        } else {
          node.children = [];
        }
        return node;
      }
      default:
        return null;
    }
  }

  #searchResultsTemplate() {
    return html`
      <h3
        data-l10n-id="firefoxview-search-results-header"
        data-l10n-args=${JSON.stringify({
          query: escapeHtmlEntities(this.searchQuery),
        })}
      ></h3>
      <span
        data-l10n-id="firefoxview-search-results-count"
        data-l10n-args=${JSON.stringify({ count: this.searchResults.length })}
      ></span>
      <sidebar-bookmark-list
        maxTabsLength="-1"
        secondaryActionClass="delete-button"
        .tabItems=${this.searchResults}
        @fxview-tab-list-primary-action=${this.onPrimaryAction}
        @fxview-tab-list-secondary-action=${this.onSecondaryAction}
        @fxview-tab-list-middleclick-action=${this.onPrimaryAction}
      ></sidebar-bookmark-list>
    `;
  }

  render() {
    return html`
      ${this.stylesheet()}
      <div class="sidebar-panel">
        <sidebar-panel-header
          data-l10n-id="sidebar-menu-bookmarks-header"
          data-l10n-attrs="heading"
          view="viewBookmarksSidebar"
        >
          <div class="options-container">
            <moz-input-search
              data-l10n-id="firefoxview-search-text-box-bookmarks"
              data-l10n-attrs="placeholder"
              @MozInputSearch:search=${this.onSearchQuery}
            ></moz-input-search>
          </div>
        </sidebar-panel-header>
        <div class="sidebar-panel-scrollable-content">
          ${when(
            this.searchQuery,
            () => this.#searchResultsTemplate(),
            () =>
              html`<sidebar-bookmark-list
                maxTabsLength="-1"
                secondaryActionClass="delete-button"
                .tabItems=${this.bookmarks.children?.filter(
                  b =>
                    b.children &&
                    (b.children.length ||
                      b.guid !== lazy.PlacesUtils.bookmarks.mobileGuid)
                ) ?? []}
                .expandedFolderGuids=${this.#expandedFolderGuids}
                @fxview-tab-list-primary-action=${this.onPrimaryAction}
                @fxview-tab-list-secondary-action=${this.onSecondaryAction}
                @fxview-tab-list-middleclick-action=${this.onPrimaryAction}
                @bookmark-folder-toggle=${this.#onFolderToggle}
                @bookmark-folder-middleclick=${({ detail }) =>
                  this.#openBookmarks([detail])}
              ></sidebar-bookmark-list>`
          )}
        </div>
      </div>
    `;
  }
}

customElements.define("sidebar-bookmarks", SidebarBookmarks);
