/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var EXPORTED_SYMBOLS = ["UrlbarSearchOneOffs"];

const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);
XPCOMUtils.defineLazyModuleGetters(this, {
  SearchOneOffs: "resource:///modules/SearchOneOffs.jsm",
  Services: "resource://gre/modules/Services.jsm",
  UrlbarPrefs: "resource:///modules/UrlbarPrefs.jsm",
  UrlbarTokenizer: "resource:///modules/UrlbarTokenizer.jsm",
  UrlbarUtils: "resource:///modules/UrlbarUtils.jsm",
});

// Maps from RESULT_SOURCE values to { restrict } objects.
const LOCAL_MODES = new Map([
  [
    UrlbarUtils.RESULT_SOURCE.BOOKMARKS,
    {
      restrict: UrlbarTokenizer.RESTRICT.BOOKMARK,
    },
  ],
  [
    UrlbarUtils.RESULT_SOURCE.TABS,
    {
      restrict: UrlbarTokenizer.RESTRICT.OPENPAGE,
    },
  ],
  [
    UrlbarUtils.RESULT_SOURCE.HISTORY,
    {
      restrict: UrlbarTokenizer.RESTRICT.HISTORY,
    },
  ],
]);

/**
 * The one-off search buttons in the urlbar.
 */
class UrlbarSearchOneOffs extends SearchOneOffs {
  /**
   * Constructor.
   *
   * @param {UrlbarView} view
   *   The parent UrlbarView.
   */
  constructor(view) {
    super(view.panel.querySelector(".search-one-offs"));
    this.view = view;
    this.input = view.input;
    UrlbarPrefs.addObserver(this);
    this._setupOneOffsHorizontalKeyNavigation();
  }

  /**
   * Returns the local search mode one-off buttons.
   *
   * @returns {array}
   *   The local one-off buttons.
   */
  get localButtons() {
    return this.getSelectableButtons(false).filter(b => b.source);
  }

  /**
   * Enables (shows) or disables (hides) the one-offs.
   *
   * @param {boolean} enable
   *   True to enable, false to disable.
   */
  enable(enable) {
    if (enable) {
      this.telemetryOrigin = "urlbar";
      this.style.display = "";
      this.textbox = this.view.input.inputField;
      if (this.view.isOpen) {
        this._rebuild();
      }
      this.view.controller.addQueryListener(this);
    } else {
      this.telemetryOrigin = null;
      this.style.display = "none";
      this.textbox = null;
      this.view.controller.removeQueryListener(this);
    }
  }

  /**
   * Query listener method.  Delegates to the superclass.
   */
  onViewOpen() {
    this._on_popupshowing();
  }

  /**
   * Query listener method.  Delegates to the superclass.
   */
  onViewClose() {
    this._on_popuphidden();
  }

  /**
   * @returns {boolean}
   *   True if the one-offs are connected to a view.
   */
  get hasView() {
    // Return true if the one-offs are enabled.  We set style.display = "none"
    // when they're disabled, and we hide the container when there are no
    // engines to show.
    return this.style.display != "none" && !this.container.hidden;
  }

  /**
   * @returns {boolean}
   *   True if the view is open.
   */
  get isViewOpen() {
    return this.view.isOpen;
  }

  /**
   * The selected one-off, a xul:button, including the search-settings button.
   *
   * @param {DOMElement|null} button
   *   The selected one-off button. Null if no one-off is selected.
   */
  set selectedButton(button) {
    if (this.selectedButton == button) {
      return;
    }

    super.selectedButton = button;

    let expectedSearchMode;
    if (
      button &&
      button != this.view.oneOffSearchButtons.settingsButtonCompact
    ) {
      expectedSearchMode = {
        engineName: button.engine?.name,
        source: button.source,
        entry: "oneoff",
      };
      this.input.searchMode = expectedSearchMode;
    } else if (this.input.searchMode) {
      // Restore the previous state. We do this only if we're in search mode, as
      // an optimization in the common case of cycling through normal results.
      this.input.restoreSearchModeState();
    }
  }

  get selectedButton() {
    return super.selectedButton;
  }

  /**
   * @returns {number}
   *   The selected index in the view.
   */
  get selectedViewIndex() {
    return this.view.selectedElementIndex;
  }

  /**
   * Sets the selected index in the view.
   *
   * @param {number} val
   *   The selected index or -1 if no selection.
   */
  set selectedViewIndex(val) {
    this.view.selectedElementIndex = val;
  }

  /**
   * Closes the view.
   */
  closeView() {
    if (this.view) {
      this.view.close();
    }
  }

  /**
   * Called when a one-off is clicked. This is not called for the settings
   * button.
   *
   * @param {event} event
   *   The event that triggered the pick.
   * @param {object} searchMode
   *   Used by UrlbarInput.setSearchMode to enter search mode. See setSearchMode
   *   documentation for details.
   * @param {boolean} forceNewTab
   *   True if the search results page should be loaded in a new tab.
   *   TODO: We can remove this parameter when the update2 pref is removed. This
   *   parameter is only used by the one-off context menu, which is removed in
   *   update2.
   */
  handleSearchCommand(event, searchMode, forceNewTab = false) {
    // The settings button is a special case. Its action should be executed
    // immediately.
    if (
      this.selectedButton == this.view.oneOffSearchButtons.settingsButtonCompact
    ) {
      this.input.controller.engagementEvent.discard();
      this.selectedButton.doCommand();
      return;
    }

    // We allow autofill in local but not remote search modes.
    let startQueryParams = {
      allowAutofill:
        !searchMode.engineName &&
        searchMode.source != UrlbarUtils.RESULT_SOURCE.SEARCH,
      event,
    };

    let userTypedSearchString =
      this.input.value && this.input.getAttribute("pageproxystate") != "valid";
    let engine = Services.search.getEngineByName(searchMode.engineName);

    let { where, params } = this._whereToOpen(event, forceNewTab);

    // Some key combinations should execute a search immediately. We handle
    // these here, outside the switch statement.
    if (
      !this.view.oneOffsRefresh ||
      (userTypedSearchString &&
        engine &&
        (event.shiftKey || where != "current"))
    ) {
      this.input.handleNavigation({
        event,
        oneOffParams: {
          openWhere: where,
          openParams: params,
          engine: this.selectedButton.engine,
        },
      });
      this.selectedButton = null;
      return;
    }

    // Handle opening search mode in either the current tab or in a new tab.
    switch (where) {
      case "current": {
        this.input.searchMode = searchMode;
        this.input.startQuery(startQueryParams);
        break;
      }
      case "tab": {
        // We set this.selectedButton when switching tabs. If we entered search
        // mode preview here, it could be cleared when this.selectedButton calls
        // setSearchMode.
        searchMode.isPreview = false;

        let newTab = this.input.window.gBrowser.addTrustedTab("about:newtab");
        this.input.setSearchMode(searchMode, newTab.linkedBrowser);
        if (userTypedSearchString) {
          // Set the search string for the new tab.
          newTab.linkedBrowser.userTypedValue = this.input.value;
        }
        if (!params?.inBackground) {
          this.input.window.gBrowser.selectedTab = newTab;
          newTab.ownerGlobal.gURLBar.startQuery(startQueryParams);
        }
        break;
      }
      default: {
        this.input.searchMode = searchMode;
        this.input.startQuery(startQueryParams);
        this.input.select();
        break;
      }
    }

    this.selectedButton = null;
  }

  /**
   * Sets the tooltip for a one-off button with an engine.  This should set
   * either the `tooltiptext` attribute or the relevant l10n ID.
   *
   * @param {element} button
   *   The one-off button.
   */
  setTooltipForEngineButton(button) {
    let aliases = button.engine.aliases;
    if (!aliases.length) {
      super.setTooltipForEngineButton(button);
      return;
    }
    this.document.l10n.setAttributes(
      button,
      "search-one-offs-engine-with-alias",
      {
        engineName: button.engine.name,
        alias: aliases[0],
      }
    );
  }

  /**
   * Called when a pref tracked by UrlbarPrefs changes.
   *
   * @param {string} changedPref
   *   The name of the pref, relative to `browser.urlbar.` if the pref is in
   *   that branch.
   */
  onPrefChanged(changedPref) {
    // Invalidate the engine cache when the local-one-offs-related prefs change
    // so that the one-offs rebuild themselves the next time the view opens.
    if (
      ["update2", "update2.localOneOffs", "update2.oneOffsRefresh"].includes(
        changedPref
      )
    ) {
      this.invalidateCache();
    }
    this._setupOneOffsHorizontalKeyNavigation();
  }

  /**
   * Sets whether LEFT/RIGHT should navigate through one-off buttons.
   */
  _setupOneOffsHorizontalKeyNavigation() {
    this.disableOneOffsHorizontalKeyNavigation =
      UrlbarPrefs.get("update2") &&
      UrlbarPrefs.get("update2.disableOneOffsHorizontalKeyNavigation");
  }

  /**
   * Overrides _rebuildEngineList to add the local one-offs.
   *
   * @param {array} engines
   *    The search engines to add.
   */
  _rebuildEngineList(engines) {
    super._rebuildEngineList(engines);

    if (!this.view.oneOffsRefresh || !UrlbarPrefs.get("update2.localOneOffs")) {
      return;
    }

    for (let [source, { restrict }] of LOCAL_MODES) {
      let name = UrlbarUtils.getResultSourceName(source);
      let button = this.document.createXULElement("button");
      button.id = `urlbar-engine-one-off-item-${name}`;
      button.setAttribute("class", "searchbar-engine-one-off-item");
      this.document.l10n.setAttributes(button, `search-one-offs-${name}`, {
        restrict,
      });
      button.source = source;
      this.buttons.appendChild(button);
    }
  }

  /**
   * Overrides the superclass's click listener to handle clicks on local
   * one-offs in addition to engine one-offs.
   *
   * @param {event} event
   *   The click event.
   */
  _on_click(event) {
    if (!this.view.oneOffsRefresh) {
      super._on_click(event);
      return;
    }

    // Ignore right clicks.
    if (event.button == 2) {
      return;
    }

    let button = event.originalTarget;
    if (!button.engine && !button.source) {
      return;
    }

    this.selectedButton = button;
    this.handleSearchCommand(event, {
      engineName: button.engine?.name,
      source: button.source,
      entry: "oneoff",
    });
  }

  /**
   * Overrides the superclass's contextmenu listener to handle the context menu.
   *
   * @param {event} event
   *   The contextmenu event.
   */
  _on_contextmenu(event) {
    // Prevent the context menu from appearing when update2 is enabled.
    if (this.view.oneOffsRefresh) {
      event.preventDefault();
      return;
    }

    super._on_contextmenu(event);
  }
}
