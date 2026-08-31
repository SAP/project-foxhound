/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Module } from "chrome://remote/content/shared/messagehandler/Module.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  getBrowsingContextInfo:
    "chrome://remote/content/webdriver-bidi/modules/root/browsingContext.sys.mjs",
  NavigableManager: "chrome://remote/content/shared/NavigableManager.sys.mjs",
  TabManager: "chrome://remote/content/shared/TabManager.sys.mjs",
});

class BrowsingContextModule extends Module {
  destroy() {}

  interceptEvent(name, payload) {
    if (
      name == "browsingContext.contextCreated" ||
      name == "browsingContext.domContentLoaded" ||
      name == "browsingContext.load"
    ) {
      const browsingContext = payload.context;
      if (!lazy.TabManager.isValidCanonicalBrowsingContext(browsingContext)) {
        // Discard events for invalid browsing contexts.
        return null;
      }

      // Resolve browsing context to a Navigable id.
      payload.context =
        lazy.NavigableManager.getIdForBrowsingContext(browsingContext);

      if (name == "browsingContext.contextCreated") {
        payload = {
          ...payload,
          ...lazy.getBrowsingContextInfo(browsingContext, { maxDepth: 0 }),
        };
      } else {
        // Resolve navigation id.
        const navigation =
          this.messageHandler.navigationManager.getNavigationForBrowsingContext(
            browsingContext
          );
        payload.navigation = navigation ? navigation.navigationId : null;
      }
    }

    return payload;
  }
}

export const browsingContext = BrowsingContextModule;
