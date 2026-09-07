/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// This is loaded into chrome windows with the subscript loader. Wrap in
// a block to prevent accidentally leaking globals onto `window`.
{
  ChromeUtils.defineESModuleGetters(this, {
    DeferredTask: "resource://gre/modules/DeferredTask.sys.mjs",
  });

  /**
   * A shared task which updates the urlbar indicator whenever:
   * - A split view is activated or deactivated.
   * - The active tab of a split view changes.
   * - The order of tabs in a split view changes.
   *
   * @type {DeferredTask}
   */
  const updateUrlbarButton = new DeferredTask(() => {
    const { activeSplitView, selectedTab } = gBrowser;
    const button = document.getElementById("split-view-button");
    if (activeSplitView) {
      const activeIndex = activeSplitView.tabs.indexOf(selectedTab);
      button.hidden = false;
      button.setAttribute("data-active-index", activeIndex);
    } else {
      button.hidden = true;
      button.removeAttribute("data-active-index");
    }
  }, 0);

  class MozTabSplitViewWrapper extends MozXULElement {
    /** @type {MutationObserver} */
    #tabChangeObserver;

    /** @type {MozTabbrowserTab[]} */
    #tabs = [];

    #isClosing = false;

    #isUnsplitting = false;

    #shouldMoveAllTabsAtOnce = true;

    #storedPanelWidths = new WeakMap();

    /**
     * @returns {boolean}
     */
    get hasActiveTab() {
      return this.hasAttribute("hasactivetab");
    }

    get shouldMoveAllTabsAtOnce() {
      return this.#shouldMoveAllTabsAtOnce;
    }

    /**
     * @returns {MozTabbrowserGroup}
     */
    get group() {
      return gBrowser.isTabGroup(this.parentElement)
        ? this.parentElement
        : null;
    }

    /**
     * @typedef {object} TabSplitViewStateData
     *   State of a tab group inside of an open window.
     * @property {number} id
     *   Unique ID of the tab splitview.
     * @property {number} numberOfTabs
     *   Number of expected tabs in the splitview.
     *
     * Collect data related to a single tab splitview, synchronously.
     *
     * @returns {TabSplitViewStateData}
     *   Serialized splitview data
     */
    get state() {
      return {
        id: this.splitViewId,
        numberOfTabs: this.tabs.length,
      };
    }

    /**
     * @param {boolean} val
     */
    set hasActiveTab(val) {
      this.toggleAttribute("hasactivetab", val);
    }

    get multiselected() {
      return this.hasAttribute("multiselected");
    }

    constructor() {
      super();
      XPCOMUtils.defineLazyPreferenceGetter(
        this,
        "_hasUsedSplitView",
        "browser.tabs.splitview.hasUsed",
        false
      );
    }

    connectedCallback() {
      // Set up TabSelect listener, as this gets
      // removed in disconnectedCallback
      this.documentGlobal.addEventListener("TabSelect", this);

      this.#observeTabChanges();
      this.#restorePanelWidths();

      if (this.hasActiveTab) {
        this.#activate();
      }

      if (this._initialized) {
        return;
      }

      if (!this._hasUsedSplitView) {
        Services.prefs.setBoolPref("browser.tabs.splitview.hasUsed", true);
      }

      this._initialized = true;

      this.textContent = "";

      // Mirroring MozTabbrowserTab
      this.container = gBrowser.tabContainer;
    }

    disconnectedCallback() {
      this.#tabChangeObserver?.disconnect();
      this.documentGlobal.removeEventListener("TabSelect", this);
      this.#deactivate();
      this.#resetPanelWidths();
      this.container.dispatchEvent(
        new CustomEvent("SplitViewRemoved", {
          bubbles: true,
          composed: true,
        })
      );
    }

    #observeTabChanges() {
      if (!this.#tabChangeObserver) {
        this.#tabChangeObserver = new window.MutationObserver(mutations => {
          if (this.tabs.length) {
            this.hasActiveTab = this.tabs.some(tab => tab.selected);
            this.tabs.forEach((tab, index) => {
              // Renumber tabs so that a11y tools can tell users that a given
              // tab is "1 of 2" in the split view, for example.
              tab.setAttribute("aria-posinset", index + 1);
              tab.setAttribute("aria-setsize", this.tabs.length);
              tab.updateSplitViewAriaLabel(index);
            });
            this.dispatchEvent(
              new CustomEvent("SplitViewTabChange", {
                bubbles: true,
              })
            );
          } else {
            this.remove();
          }

          if (
            this.tabs.length == 1 &&
            mutations.length &&
            mutations[0].removedNodes.length == 1
          ) {
            // We assume you end up with only one tab in a splitview when the other tab is closed,
            // in which case, move the remaining tab out via this.unsplitTabs.
            this.unsplitTabs("tab_close");
          }
        });
      }
      this.#tabChangeObserver.observe(this, {
        childList: true,
      });
    }

    get splitViewId() {
      return parseInt(this.getAttribute("splitViewId"));
    }

    set splitViewId(val) {
      this.setAttribute("splitViewId", val);
    }

    /**
     * @returns {MozTabbrowserTab[]}
     */
    get tabs() {
      return Array.from(this.children).filter(node => node.matches("tab"));
    }

    get visible() {
      return this.tabs.every(tab => tab.visible);
    }

    get pinned() {
      return false;
    }

    /**
     * Get the list of tab panels from this split view.
     *
     * @returns {XULElement[]}
     */
    get panels() {
      const panels = [];
      for (const { linkedPanel } of this.#tabs) {
        const el = document.getElementById(linkedPanel);
        if (el) {
          panels.push(el);
        }
      }
      return panels;
    }

    /**
     * Show all Split View tabs in the content area.
     */
    #activate() {
      updateUrlbarButton.arm();
      gBrowser.showSplitViewPanels(this.#tabs);
      this.container.dispatchEvent(
        new CustomEvent("TabSplitViewActivate", {
          detail: { tabs: this.#tabs, splitview: this },
          bubbles: true,
        })
      );
    }

    /**
     * Remove Split View tabs from the content area, which in turn resets
     * various attributes on tabpanels.
     */
    #deactivate() {
      gBrowser.tabpanels.removeTabsFromSplitview(
        this.#tabs.filter(tab => !tab.splitview || tab.splitview === this)
      );
      updateUrlbarButton.arm();
      this.container.dispatchEvent(
        new CustomEvent("TabSplitViewDeactivate", {
          detail: { tabs: this.#tabs, splitview: this },
          bubbles: true,
        })
      );
    }

    /**
     * Temporarily hide Split View panels when switching to a non-split-view tab,
     * preserving split-view panel attributes so panels re-enter the flex layout at
     * their correct size on reactivation, avoiding content reflow inside split-view
     * browser elements.
     */
    #suspend() {
      gBrowser.tabpanels.suspendSplitViewPanels(
        this.#tabs.filter(tab => !tab.splitview || tab.splitview === this)
      );
      updateUrlbarButton.arm();
      this.container.dispatchEvent(
        new CustomEvent("TabSplitViewDeactivate", {
          detail: { tabs: this.#tabs, splitview: this },
          bubbles: true,
        })
      );
    }

    /**
     * Remove customized panel widths. Cache width values so that they can be
     * restored if this Split View is later reactivated.
     */
    #resetPanelWidths() {
      for (const panel of this.panels) {
        const width = panel.getAttribute("width");
        if (width) {
          this.#storedPanelWidths.set(panel, width);
          panel.removeAttribute("width");
          panel.style.removeProperty("width");
        }
      }
    }

    /**
     * Resize panel widths back to cached values.
     */
    #restorePanelWidths() {
      for (const panel of this.panels) {
        const width = this.#storedPanelWidths.get(panel);
        if (width) {
          panel.setAttribute("width", width);
          panel.style.setProperty("width", width + "px");
        }
      }
    }

    /**
     * Reset custom width on the right panel, allowing it to fill the rest of
     * the available space.
     */
    resetRightPanelWidth() {
      const panel = this.panels[1];
      this.#storedPanelWidths.delete(panel);
      panel.removeAttribute("width");
      panel.style.removeProperty("width");
    }

    /**
     * add tabs to the split view wrapper
     *
     * @param {MozTabbrowserTab[]} tabs
     * @param {object} [options]
     * @param {boolean} [options.isSessionRestore]
     * @param {int} [options.indexOfReplacedTab] [optional] Used if replacing a tab in the split view
     */
    addTabs(tabs, { isSessionRestore = false, indexOfReplacedTab = -1 } = {}) {
      for (let tab of tabs) {
        if (tab.pinned) {
          return;
        }
        let tabToMove =
          this.documentGlobal === tab.documentGlobal
            ? tab
            : gBrowser.adoptTab(tab, {
                tabIndex: gBrowser.tabs.at(-1)._tPos + 1,
                selectTab: tab.selected,
              });
        if (indexOfReplacedTab > -1 && indexOfReplacedTab < this.#tabs.length) {
          this.#tabs[indexOfReplacedTab] = tabToMove;
        } else {
          this.#tabs.push(tabToMove);
        }
        isSessionRestore
          ? this.appendChild(tab)
          : gBrowser.moveTabToSplitView(tabToMove, this, indexOfReplacedTab);
        if (tab === gBrowser.selectedTab) {
          this.hasActiveTab = true;
        }
      }

      if (this.hasActiveTab) {
        this.#activate();
      }
      // Attempt to update uriCount metric using the resulting tabs collection,
      // as tabs may not be added to the splitview if they are pinned etc.
      for (let tab of this.tabs) {
        let tabURI = tab.linkedBrowser.currentURI.spec;
        if (!isBlankPageURL(tabURI) && tabURI !== "about:opentabs") {
          // Add to the counter which tracks the number of URIs loaded into splitview tabs
          const index = tabs.indexOf(tab);
          const label = String(index + 1); // 0 -> "1" (LTR left), 1 -> "2" (LTR right)
          Glean.splitview.uriCount[label].add(1);
        }
      }
    }

    /**
     * Close about:openTabs and move all tabs out of the split view wrapper;
     * splitview removal is handled by #observeTabChanges.
     *
     * @param {string} [trigger]
     *   The trigger method for ending the split view. Used for telemetry.
     *   Valid values: "menu_separate", "icon_separate", "icon_close", "tab_close", "footer_separate".
     */
    unsplitTabs(trigger = null) {
      if (this.#isUnsplitting) {
        return;
      }
      this.#isUnsplitting = true;
      let telemetryTrigger = this.#isClosing ? null : trigger;
      // Record telemetry for split view end
      if (telemetryTrigger) {
        const tab_layout = gBrowser.tabContainer.verticalMode
          ? "vertical"
          : "horizontal";

        Glean.splitview.end.record({
          tab_layout,
          trigger: telemetryTrigger,
        });
      }

      // If the split view has about:opentabs open, remove that tab
      let aboutOpenTabs = this.#tabs.filter(
        tab => tab?.linkedBrowser?.currentURI?.spec === "about:opentabs"
      );
      aboutOpenTabs.forEach(aboutOpenTab => {
        gBrowser.removeTab(aboutOpenTab);
      });

      for (let i = this.tabs.length - 1; i >= 0; i--) {
        gBrowser.handleTabMove(this.tabs[i], () =>
          gBrowser.tabContainer.insertBefore(
            this.tabs[i],
            this.nextElementSibling
          )
        );
      }
    }

    /**
     * Replace a tab in the split view with another tab
     */
    replaceTab(tabToReplace, newTab) {
      let indexOfReplacedTab = this.tabs.indexOf(tabToReplace);

      // Select the adopted tab BEFORE removing the old one to prevent Firefox
      // from auto-selecting the wrong tab when the old selected tab is removed.
      if (tabToReplace.selected) {
        gBrowser.selectedTab = newTab;
      }
      gBrowser.removeTab(tabToReplace);
      this.addTabs([newTab], { isSessionRestore: false, indexOfReplacedTab });

      // We need to re-activate after removing one of the split view tabs
      this.#activate();
    }

    /**
     * Reverse order of the tabs in the split view wrapper.
     *
     * @param {string} [trigger]
     *   The trigger method for reversing tabs. Used for telemetry.
     */
    reverseTabs(trigger = null) {
      const [firstTab, secondTab] = this.#tabs;
      this.#shouldMoveAllTabsAtOnce = false;
      gBrowser.moveTabBefore(secondTab, firstTab);
      this.#shouldMoveAllTabsAtOnce = true;
      this.#tabs = [secondTab, firstTab];
      if (this.hasActiveTab) {
        gBrowser.showSplitViewPanels(this.#tabs);
        updateUrlbarButton.arm();
      }

      // Record telemetry
      if (trigger) {
        Glean.splitview.reverse.record({ trigger });
      }
    }

    /**
     * Close all tabs in the split view wrapper and delete the split view.
     *
     * @param {string} [trigger]
     *   The trigger method for ending the split view. Used for telemetry.
     */
    close(trigger = null) {
      // Record telemetry before closing
      if (trigger) {
        const tab_layout = gBrowser.tabContainer.verticalMode
          ? "vertical"
          : "horizontal";
        Glean.splitview.end.record({
          tab_layout,
          trigger,
        });
      }
      this.#isClosing = true;
      gBrowser.removeTabs(this.#tabs);
    }

    /**
     * @param {CustomEvent} event
     */
    on_TabSelect(event) {
      const wasActive = this.hasActiveTab;
      this.hasActiveTab = event.target.splitview === this;
      if (this.hasActiveTab) {
        this.#activate();
        // This check ensures we don't call suspend for every tab selection
        // or for a selected tab in a splitview that is being dragged to another window,
        // as this event fires as part of updateCurrentBrowser; we
        // utilize this temporary property - removedByAdoption -
        // that is added in adoptSplitView.
      } else if (wasActive && !event.detail.previousTab?.removedByAdoption) {
        this.#suspend();
      }
    }
  }

  customElements.define("tab-split-view-wrapper", MozTabSplitViewWrapper);
}
