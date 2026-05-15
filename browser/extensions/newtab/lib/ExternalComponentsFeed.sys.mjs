/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import {
  actionTypes as at,
  actionCreators as ac,
} from "resource://newtab/common/Actions.mjs";

const lazy = XPCOMUtils.declareLazy({
  AboutNewTabComponentRegistry:
    "moz-src:///browser/components/newtab/AboutNewTabComponents.sys.mjs",
});

/**
 * ExternalComponentsFeed manages the integration between the
 * AboutNewTabComponentRegistry and the New Tab Redux store.
 *
 * This feed:
 * - Listens to the AboutNewTabComponentRegistry for component updates
 * - Dispatches REFRESH_EXTERNAL_COMPONENTS actions to update the store
 * - Ensures external components are loaded during New Tab initialization
 *
 * External components registered through this system can be rendered on the
 * newtab page via the ExternalComponentWrapper React component.
 */
export class ExternalComponentsFeed {
  /**
   * The AboutNewTabComponentRegistry instance that tracks registered components.
   *
   * @type {AboutNewTabComponentRegistry}
   */
  #registry = null;

  /**
   * Creates a new ExternalComponentsFeed instance.
   *
   * Initializes the AboutNewTabComponentRegistry and sets up a listener to
   * refresh components whenever the registry updates.
   */
  constructor() {
    this.#registry = new lazy.AboutNewTabComponentRegistry();
    this.#registry.on(lazy.AboutNewTabComponentRegistry.UPDATED_EVENT, () => {
      this.refreshComponents();
    });
  }

  /**
   * Dispatches a REFRESH_EXTERNAL_COMPONENTS action with the current list of
   * registered components from the registry.
   *
   * This action is broadcast to all content processes to update their Redux
   * stores with the latest component configurations.
   *
   * @param {object} options - Optional configuration
   * @param {boolean} [options.isStartup=false] - If true, marks the action as a
   *   startup action (meta.isStartup: true), which prevents the cached
   *   about:home document from unnecessarily reprocessing the action.
   */
  refreshComponents(options = {}) {
    const action = {
      type: at.REFRESH_EXTERNAL_COMPONENTS,
      data: [...this.#registry.values],
    };

    if (options.isStartup) {
      action.meta = { isStartup: true };
    }

    this.store.dispatch(ac.BroadcastToContent(action));
  }

  /**
   * Handles Redux actions dispatched to this feed.
   *
   * Currently handles:
   * - INIT: Refreshes components when Activity Stream initializes, marking
   *   the action as a startup action to optimize cached document handling.
   *
   * @param {object} action - The Redux action to handle
   * @param {string} action.type - The action type
   */
  onAction(action) {
    switch (action.type) {
      case at.INIT:
        this.refreshComponents({ isStartup: true });
        break;
    }
  }
}
