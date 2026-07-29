/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { isDiscoverEnabled } from "./aboutaddons-utils.mjs";
import { ScrollOffsets } from "chrome://global/content/ScrollOffsets.mjs";

// Used by external callers to load a specific view into the manager
export function loadView(viewId) {
  if (!gViewController.readyForLoadView) {
    throw new Error("loadView called before about:addons is initialized");
  }
  gViewController.loadView(viewId);
}

export var gViewController = {
  currentViewId: null,
  readyForLoadView: false,
  get defaultViewId() {
    if (!isDiscoverEnabled()) {
      return "addons://list/extension";
    }
    return "addons://discover/";
  },
  isLoading: true,
  views: {},
  scrollOffsets: new ScrollOffsets(),

  initialize(container) {
    this.container = container;

    window.addEventListener("popstate", this);
    window.addEventListener("unload", this, { once: true });
    Services.obs.addObserver(this, "EM-ping");
  },

  handleEvent(e) {
    if (e.type == "popstate") {
      this.renderState(e.state);
      return;
    }

    if (e.type == "unload") {
      Services.obs.removeObserver(this, "EM-ping");
      // eslint-disable-next-line no-useless-return
      return;
    }
  },

  observe(subject, topic) {
    if (topic == "EM-ping") {
      this.readyForLoadView = true;
      Services.obs.notifyObservers(window, "EM-pong");
    }
  },

  notifyEMLoaded() {
    this.readyForLoadView = true;
    Services.obs.notifyObservers(window, "EM-loaded");
  },

  notifyEMUpdateCheckFinished() {
    // Notify the observer about a completed update check (currently only used in tests).
    Services.obs.notifyObservers(null, "EM-update-check-finished");
  },

  defineView(viewName, renderFunction) {
    if (this.views[viewName]) {
      throw new Error(
        `about:addons view ${viewName} should not be defined twice`
      );
    }
    this.views[viewName] = renderFunction;
  },

  parseViewId(viewId) {
    const matchRegex = /^addons:\/\/([^\/]+)\/(.*)$/;
    const [, viewType, viewParam] = viewId.match(matchRegex) || [];
    return { type: viewType, param: decodeURIComponent(viewParam) };
  },

  loadView(viewId, replace = false) {
    viewId = viewId.startsWith("addons://") ? viewId : `addons://${viewId}`;
    if (viewId == this.currentViewId) {
      return Promise.resolve();
    }

    // Always rewrite history state instead of pushing incorrect state for initial load.
    replace = replace || !this.currentViewId;

    const state = {
      view: viewId,
      previousView: replace ? null : this.currentViewId,
      historyEntryId: this.scrollOffsets.newHistoryEntryId(),
    };
    if (replace) {
      history.replaceState(state, "");
    } else {
      history.pushState(state, "");
    }
    return this.renderState(state);
  },

  async renderState(state) {
    let { param, type } = this.parseViewId(state.view);

    if (!type || this.views[type] == null) {
      console.warn(`No view for ${type} ${param}, switching to default`);
      this.resetState();
      return;
    }

    this.scrollOffsets.save();
    this.scrollOffsets.setView(state.historyEntryId);

    this.currentViewId = state.view;
    this.isLoading = true;

    // Perform tasks before view load
    document.dispatchEvent(
      new CustomEvent("view-selected", {
        detail: { id: state.view, param, type },
      })
    );

    // Render the fragment
    this.container.setAttribute("current-view", type);
    let fragment = await this.views[type](param);

    // Clear and append the fragment
    if (fragment) {
      this.container.textContent = "";
      this.container.append(fragment);

      // Most content has been rendered at this point. The only exception are
      // recommendations in the discovery pane and extension/theme list, because
      // they rely on remote data. If loaded before, then these may be rendered
      // within one tick, so wait a full frame before restoring scroll offsets.
      await new Promise(resolve => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(async () => {
            // Ensure all our content is translated.
            if (document.hasPendingL10nMutations) {
              await new Promise(r => {
                document.addEventListener("L10nMutationsFinished", r, {
                  once: true,
                });
              });
            }
            this.scrollOffsets.restore();
            resolve();
          });
        });
      });
    } else {
      // Reset to default view if no given content
      this.resetState();
      return;
    }

    this.isLoading = false;

    document.dispatchEvent(new CustomEvent("view-loaded"));
  },

  resetState() {
    return this.loadView(this.defaultViewId, true);
  },
};
