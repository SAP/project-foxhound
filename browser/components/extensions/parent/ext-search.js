/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
  SearchUIUtils: "moz-src:///browser/components/search/SearchUIUtils.sys.mjs",
});

var { ExtensionError } = ExtensionUtils;

const dispositionMap = {
  CURRENT_TAB: "current",
  NEW_TAB: "tab",
  NEW_WINDOW: "window",
};

this.search = class extends ExtensionAPI {
  getAPI(context) {
    function getTarget({ tabId, disposition, defaultDisposition }) {
      let tab, where;
      if (disposition) {
        if (tabId) {
          throw new ExtensionError(`Cannot set both 'disposition' and 'tabId'`);
        }
        where = dispositionMap[disposition];
      } else if (tabId) {
        tab = tabTracker.getTab(tabId);
      } else {
        where = dispositionMap[defaultDisposition];
      }
      return { tab, where };
    }

    return {
      search: {
        async get() {
          await SearchService.promiseInitialized;
          let visibleEngines = await SearchService.getVisibleEngines();
          let defaultEngine = await SearchService.getDefault();
          return Promise.all(
            visibleEngines.map(async engine => {
              let favIconUrl = await engine.getIconURL();
              // Convert blob:-URLs to data:-URLs since they can't be shared
              // across processes. blob:-URLs originate from application provided
              // search engines.
              // Also convert moz-extension:-URLs to data:-URLs to make sure that
              // extensions can see icons from other extensions, even if they
              // are not web-accessible.
              // Also prevents leakage of extension UUIDs to other extensions..
              if (
                favIconUrl &&
                (favIconUrl.startsWith("blob:") ||
                  (ExtensionUtils.isExtensionUrl(favIconUrl) &&
                    !favIconUrl.startsWith(context.extension.baseURL)))
              ) {
                favIconUrl = await ExtensionUtils.makeDataURI(favIconUrl);
              }

              return {
                name: engine.name,
                isDefault: engine.name === defaultEngine.name,
                alias: engine.alias || undefined,
                favIconUrl,
              };
            })
          );
        },

        async search(searchProperties) {
          await SearchService.promiseInitialized;
          let engine;

          if (searchProperties.engine) {
            engine = SearchService.getEngineByName(searchProperties.engine);
            if (!engine) {
              throw new ExtensionError(
                `${searchProperties.engine} was not found`
              );
            }
          }

          let { tab, where } = getTarget({
            tabId: searchProperties.tabId,
            disposition: searchProperties.disposition,
            defaultDisposition: "NEW_TAB",
          });

          await SearchUIUtils.loadSearch({
            window: windowTracker.topWindow,
            searchText: searchProperties.query,
            where,
            engine,
            tab,
            triggeringPrincipal: context.principal,
            sapSource: "webextension",
          });
        },

        async query(queryProperties) {
          await SearchService.promiseInitialized;

          let { tab, where } = getTarget({
            tabId: queryProperties.tabId,
            disposition: queryProperties.disposition,
            defaultDisposition: "CURRENT_TAB",
          });

          await SearchUIUtils.loadSearch({
            window: windowTracker.topWindow,
            searchText: queryProperties.text,
            where,
            tab,
            triggeringPrincipal: context.principal,
            sapSource: "webextension",
          });
        },
      },
    };
  }
};
