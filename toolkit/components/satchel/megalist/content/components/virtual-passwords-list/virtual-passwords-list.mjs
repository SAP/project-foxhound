/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { html, repeat } from "chrome://global/content/vendor/lit.all.mjs";
import { MozLitElement } from "chrome://global/content/lit-utils.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
  clearTimeout: "resource://gre/modules/Timer.sys.mjs",
});

/**
 * TODO: This code is duplicated from fxview-tab-list.mjs.
 * The duplication is intentional to keep the variable-height changes
 * for Contextual Password Manager isolated, avoiding regressions
 * in Firefox View. We should eventually refactor this into a
 * shared component.
 */
class VirtualPasswordsList extends MozLitElement {
  #scroller = null;
  #onScrollEndTimer = null;

  static properties = {
    items: { type: Array },
    template: { type: Function },
    activeIndex: { type: Number },
    itemOffset: { type: Number },
    maxRenderCountEstimate: { type: Number, state: true },

    // For fixed-height lists, set `itemHeightEstimate` to the fixed height.
    // For variable-height lists, set `itemHeightEstimate` to the minimum possible item height,
    // and provide a `heightCalculator` function to compute the total height of the list.
    // In variable-height lists, sublists are still divided based on a fixed number of items,
    // determined by the minimum possible item height.
    itemHeightEstimate: { type: Number, state: true },
    heightCalculator: { type: Function },

    isAlwaysVisible: { type: Boolean },
    isVisible: { type: Boolean, state: true },
    isSubList: { type: Boolean },
    pinnedTabsIndexOffset: { type: Number },
    version: { type: Number },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.activeIndex = 0;
    this.itemOffset = 0;
    this.pinnedTabsIndexOffset = 0;
    this.items = [];
    this.subListItems = [];

    this.itemHeightEstimate = 0;
    this.heightCalculator = items => this.itemHeightEstimate * items.length;
    this.maxRenderCountEstimate = 40;
    this.isSubList = false;
    this.isVisible = false;
    this.version = 0;

    // Ignore IntersectionObserver callbacks during scrolling.
    // Rapid scrolling causes frequent visibility changes, which can trigger
    // excessive IO callbacks and hurt performance. While scrolling, we rely
    // on scroll position to determine which items should be rendered instead.
    this.ignoreIO = false;

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (this.ignoreIO) {
          return;
        }
        this.isVisible = entry.isIntersecting;
      },
      { root: this.ownerDocument }
    );
    this.selfResizeObserver = new ResizeObserver(() => {
      // Trigger the intersection observer once the tab rows have rendered
      this.triggerIntersectionObserver();
    });
    this.childResizeObserver = new ResizeObserver(([entry]) => {
      if (entry.contentRect?.height > 0) {
        // Update properties on top-level virtual-list
        this.parentElement.itemHeightEstimate = entry.contentRect.height;
        this.parentElement.maxRenderCountEstimate = Math.max(
          40,
          2 * Math.ceil(window.innerHeight / this.itemHeightEstimate)
        );
      }
    });

    this.parentChildAddedObserver = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type != "childList") {
          return;
        }
        if (this.children.length == this.subListItems.length) {
          this.waitForSublistUpdated();
          this.parentChildAddedObserver.disconnect();
        }
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.intersectionObserver.disconnect();
    this.childResizeObserver.disconnect();
    this.selfResizeObserver.disconnect();
    this.parentChildAddedObserver.disconnect();
  }

  async waitForSublistUpdated() {
    if (this.isSubList) {
      return;
    }
    await Promise.all([...this.children].map(e => e.updateComplete));
    this.dispatchEvent(
      new CustomEvent("virtual-list-ready", {
        bubbles: true,
        composed: true,
      })
    );
  }

  triggerIntersectionObserver() {
    this.intersectionObserver.unobserve(this);
    this.intersectionObserver.observe(this);
  }

  getSubListForItem(index) {
    if (this.isSubList) {
      throw new Error("Cannot get sublist for item");
    }
    return this.children[parseInt(index / this.maxRenderCountEstimate, 10)];
  }

  getItem(index) {
    if (!this.isSubList) {
      return this.getSubListForItem(index)?.getItem(
        index % this.maxRenderCountEstimate
      );
    }
    return this.children[index];
  }

  willUpdate(changedProperties) {
    if (changedProperties.has("items") && !this.isSubList) {
      this.subListItems = [];
      for (let i = 0; i < this.items.length; i += this.maxRenderCountEstimate) {
        this.subListItems.push(
          this.items.slice(i, i + this.maxRenderCountEstimate)
        );
      }
    }
  }

  get scroller() {
    return this.#scroller;
  }

  set scroller(element) {
    if (this.isSubList || this.#scroller === element) {
      return;
    }

    if (this.#scroller) {
      this.#scroller.removeEventListener("scroll", this.onScroll);
    }

    this.#scroller = element;
    this.#scroller.addEventListener("scroll", () => this.onScroll());
  }

  onScroll() {
    if (!this.children.length) {
      return;
    }

    if (this.#onScrollEndTimer) {
      // reset the timer
      lazy.clearTimeout(this.#onScrollEndTimer);
    } else {
      Array.from(this.children).forEach(child => (child.ignoreIO = true));
    }

    this.#onScrollEndTimer = lazy.setTimeout(() => {
      Array.from(this.children).forEach(child => (child.ignoreIO = false));
      this.#onScrollEndTimer = null;
    }, 1000);

    const index = parseInt(
      this.scroller.scrollTop / this.children[0].clientHeight,
      10
    );

    for (let i = 0; i < this.children.length; i++) {
      this.children[i].isVisible = i <= index + 1 && i >= index - 1;
    }
  }

  recalculateAfterWindowResize() {
    this.maxRenderCountEstimate = Math.max(
      40,
      2 * Math.ceil(window.innerHeight / this.itemHeightEstimate)
    );
  }

  firstUpdated() {
    this.intersectionObserver.observe(this);
    this.selfResizeObserver.observe(this);

    if (!this.isSubList) {
      if (
        this.subListItems.length &&
        this.children.length == this.subListItems.length
      ) {
        this.waitForSublistUpdated();
      } else {
        this.parentChildAddedObserver.observe(this, { childList: true });
      }
    }

    if (this.isSubList && this.children[0]) {
      this.childResizeObserver.observe(this.children[0]);
    }
  }

  updated(changedProperties) {
    this.updateListHeight(changedProperties);
    if (changedProperties.has("items") && !this.isSubList) {
      this.triggerIntersectionObserver();
    } else if (changedProperties.has("itemHeightEstimate")) {
      this.maxRenderCountEstimate = Math.max(
        40,
        2 * Math.ceil(window.innerHeight / this.itemHeightEstimate)
      );
    }
  }

  updateListHeight(changedProperties) {
    if (
      changedProperties.has("isAlwaysVisible") ||
      changedProperties.has("isVisible")
    ) {
      this.style.height =
        this.isAlwaysVisible || this.isVisible
          ? "auto"
          : `${this.heightCalculator(this.items)}px`;
    }
  }

  get renderItems() {
    return this.isSubList ? this.items : this.subListItems;
  }

  subListTemplate = (data, i) => {
    return html`<virtual-passwords-list
      class="passwords-list"
      .template=${this.template}
      .version=${this.version}
      .items=${data}
      .itemHeightEstimate=${this.itemHeightEstimate}
      .heightCalculator=${this.heightCalculator}
      .itemOffset=${i * this.maxRenderCountEstimate +
      this.pinnedTabsIndexOffset}
      .isAlwaysVisible=${i ==
      parseInt(this.activeIndex / this.maxRenderCountEstimate, 10)}
      isSubList
    ></virtual-passwords-list>`;
  };

  itemTemplate = (data, i) =>
    this.template(data, this.itemOffset + i + this.pinnedTabsIndexOffset);

  render() {
    if (this.isAlwaysVisible || this.isVisible) {
      return html`
        ${repeat(
          this.renderItems,
          (data, i) => i,
          this.isSubList ? this.itemTemplate : this.subListTemplate
        )}
      `;
    }
    return "";
  }
}

customElements.define("virtual-passwords-list", VirtualPasswordsList);
