/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// This is loaded into chrome windows with the subscript loader. Wrap in
// a block to prevent accidentally leaking globals onto `window`.
{
  class MozTabbrowserTabGroup extends MozXULElement {
    static markup = `
      <vbox class="tab-group-label-container" pack="center">
        <label class="tab-group-label" role="button"/>
      </vbox>
      <html:slot/>
      `;

    /** @type {string} */
    #label;

    /** @type {MozTextLabel} */
    #labelElement;

    /** @type {string} */
    #colorCode;

    /** @type {MutationObserver} */
    #tabChangeObserver;

    constructor() {
      super();
    }

    static get inheritedAttributes() {
      return {
        ".tab-group-label": "text=label,tooltiptext=data-tooltip",
      };
    }

    connectedCallback() {
      // Always set the mutation observer to listen for tab change events, even
      // if we are already initialized.
      // This is needed to ensure events continue to fire even if the tab group is
      // moved from the horizontal to vertical tab layout or vice-versa, which
      // causes the component to be repositioned in the DOM.
      this.#observeTabChanges();

      if (this._initialized) {
        return;
      }

      this._initialized = true;
      this.saveOnWindowClose = true;

      this.textContent = "";
      this.appendChild(this.constructor.fragment);
      this.initializeAttributeInheritance();

      this.#labelElement = this.querySelector(".tab-group-label");
      this.#labelElement.addEventListener("click", this);

      this.#updateLabelAriaAttributes();
      this.#updateCollapsedAriaAttributes();

      this.addEventListener("TabSelect", this);

      this.#labelElement.addEventListener("contextmenu", e => {
        e.preventDefault();
        gBrowser.tabGroupMenu.openEditModal(this);
        return false;
      });
    }

    disconnectedCallback() {
      this.#tabChangeObserver?.disconnect();
    }

    #observeTabChanges() {
      if (!this.#tabChangeObserver) {
        this.#tabChangeObserver = new window.MutationObserver(mutationList => {
          for (let mutation of mutationList) {
            mutation.addedNodes.forEach(node => {
              node.tagName === "tab" &&
                node.dispatchEvent(
                  new CustomEvent("TabGrouped", {
                    bubbles: true,
                    detail: this,
                  })
                );
            });
            mutation.removedNodes.forEach(node => {
              node.tagName === "tab" &&
                node.dispatchEvent(
                  new CustomEvent("TabUngrouped", {
                    bubbles: true,
                    detail: this,
                  })
                );
            });
          }
          if (!this.tabs.length) {
            this.dispatchEvent(
              new CustomEvent("TabGroupRemoved", { bubbles: true })
            );
            this.remove();
            Services.obs.notifyObservers(
              this,
              "browser-tabgroup-removed-from-dom"
            );
          }
        });
      }
      this.#tabChangeObserver.observe(this, { childList: true });
    }

    get color() {
      return this.#colorCode;
    }

    set color(code) {
      this.#colorCode = code;
      this.style.setProperty(
        "--tab-group-color",
        `var(--tab-group-color-${code})`
      );
      this.style.setProperty(
        "--tab-group-color-invert",
        `var(--tab-group-color-${code}-invert)`
      );
      this.style.setProperty(
        "--tab-group-color-pale",
        `var(--tab-group-color-${code}-pale)`
      );
    }

    get id() {
      return this.getAttribute("id");
    }

    set id(val) {
      this.setAttribute("id", val);
    }

    get label() {
      return this.#label;
    }

    set label(val) {
      this.#label = val;

      // If the group name is empty, use a zero width space so we
      // always create a text node and get consistent layout.
      this.setAttribute("label", val || "\u200b");

      this.dataset.tooltip = val;

      this.#updateLabelAriaAttributes();
    }

    // alias for label
    get name() {
      return this.label;
    }

    set name(newName) {
      this.label = newName;
    }

    get collapsed() {
      return this.hasAttribute("collapsed");
    }

    set collapsed(val) {
      if (!!val == this.collapsed) {
        return;
      }
      this.toggleAttribute("collapsed", val);
      this.#updateCollapsedAriaAttributes();
      const eventName = val ? "TabGroupCollapse" : "TabGroupExpand";
      this.dispatchEvent(new CustomEvent(eventName, { bubbles: true }));
    }

    #lastAddedTo = 0;
    get lastSeenActive() {
      return Math.max(
        this.#lastAddedTo,
        ...this.tabs.map(t => t.lastSeenActive)
      );
    }

    async #updateLabelAriaAttributes() {
      let tabGroupName = this.#label;
      if (!tabGroupName) {
        tabGroupName = await gBrowser.tabLocalization.formatValue(
          "tab-group-name-default"
        );
      }

      let tabGroupDescription = await gBrowser.tabLocalization.formatValue(
        "tab-group-description",
        {
          tabGroupName,
        }
      );
      this.#labelElement?.setAttribute("aria-label", tabGroupName);
      this.#labelElement.group = this;
      this.#labelElement?.setAttribute("aria-description", tabGroupDescription);
    }

    #updateCollapsedAriaAttributes() {
      const ariaExpanded = this.collapsed ? "false" : "true";
      this.#labelElement?.setAttribute("aria-expanded", ariaExpanded);
    }

    get tabs() {
      return Array.from(this.children).filter(node => node.matches("tab"));
    }

    /**
     * @returns {MozTextLabel}
     */
    get labelElement() {
      return this.#labelElement;
    }

    /**
     * add tabs to the group
     *
     * @param tabs array of tabs to add
     */
    addTabs(tabs) {
      for (let tab of tabs) {
        let tabToMove =
          this.ownerGlobal === tab.ownerGlobal
            ? tab
            : gBrowser.adoptTab(
                tab,
                gBrowser.tabs.at(-1)._tPos + 1,
                tab.selected
              );
        gBrowser.moveTabToGroup(tabToMove, this);
      }
      this.#lastAddedTo = Date.now();
    }

    /**
     * Remove all tabs from the group and delete the group.
     *
     */
    ungroupTabs() {
      for (let i = this.tabs.length - 1; i >= 0; i--) {
        gBrowser.ungroupTab(this.tabs[i]);
      }
    }

    /**
     * Save group data to session store.
     */
    save() {
      SessionStore.addSavedTabGroup(this);
      this.dispatchEvent(new CustomEvent("TabGroupSaved", { bubbles: true }));
    }

    saveAndClose() {
      this.save();
      gBrowser.removeTabGroup(this);
    }

    /**
     * @param {PointerEvent} event
     */
    on_click(event) {
      if (event.target === this.#labelElement && event.button === 0) {
        event.preventDefault();
        this.collapsed = !this.collapsed;
        gBrowser.tabGroupMenu.close();
      }
    }

    on_TabSelect() {
      this.collapsed = false;
    }

    /**
     * If one of this group's tabs is the selected tab, this will do nothing.
     * Otherwise, it will expand the group if collapsed, and select the first
     * tab in its list.
     */
    select() {
      this.collapsed = false;
      if (gBrowser.selectedTab.group == this) {
        return;
      }
      gBrowser.selectedTab = this.tabs[0];
    }
  }

  customElements.define("tab-group", MozTabbrowserTabGroup);
}
