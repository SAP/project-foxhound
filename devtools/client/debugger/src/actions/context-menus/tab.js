/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import { showMenu, buildMenu } from "../../context-menu/menu";
import { getTabMenuItems } from "../../utils/tabs";

import {
  getSelectedLocation,
  getOpenedSources,
  isSourceBlackBoxed,
  isSourceMapIgnoreListEnabled,
  isSourceOnSourceMapIgnoreList,
  isPrettyPrinted,
} from "../../selectors/index";

import { toggleBlackBox } from "../sources/blackbox";
import { prettyPrintAndSelectSource } from "../sources/prettyPrint";
import { copyToClipboard, showSource } from "../ui";
import { closeTabForSource, closeTabsForSources } from "../tabs";

import { getRawSourceURL, shouldBlackbox } from "../../utils/source";
import { copyToTheClipboard } from "../../utils/clipboard";

/**
 * Show the context menu of Tab.
 *
 * @param {object} event
 *        The context-menu DOM event.
 * @param {object} source
 *        Source object of the related Tab.
 */
export function showTabContextMenu(event, source) {
  return async ({ dispatch, getState }) => {
    const state = getState();
    const selectedLocation = getSelectedLocation(state);

    const isBlackBoxed = isSourceBlackBoxed(state, source);
    const isSourceOnIgnoreList =
      isSourceMapIgnoreListEnabled(state) &&
      isSourceOnSourceMapIgnoreList(state, source);
    const isSourcePrettyPrinted = isPrettyPrinted(state, source);

    const openedSources = getOpenedSources(state);
    const otherSources = openedSources.filter(s => s != source);
    const sourceIndex = openedSources.indexOf(source);
    const sourcesForTabsAfter = openedSources.slice(sourceIndex + 1);

    const tabMenuItems = getTabMenuItems();
    const items = [
      {
        item: {
          ...tabMenuItems.closeTab,
          click: () => dispatch(closeTabForSource(source)),
        },
      },
      {
        item: {
          ...tabMenuItems.closeOtherTabs,
          disabled: otherSources.length === 0,
          click: () => dispatch(closeTabsForSources(otherSources)),
        },
      },
      {
        item: {
          ...tabMenuItems.closeTabsToEnd,
          disabled: sourcesForTabsAfter.length === 0,
          click: () => {
            dispatch(closeTabsForSources(sourcesForTabsAfter));
          },
        },
      },
      {
        item: {
          ...tabMenuItems.closeAllTabs,
          click: () => dispatch(closeTabsForSources(openedSources)),
        },
      },
      { item: { type: "separator" } },
      {
        item: {
          ...tabMenuItems.copySource,
          // Only enable when this is the selected source as this requires the source to be loaded,
          // which may not be the case if the tab wasn't ever selected.
          //
          // Note that when opening the debugger, you may have tabs opened from a previous session,
          // but no selected location.
          disabled: selectedLocation?.source.id !== source.id,
          click: () => {
            dispatch(copyToClipboard(selectedLocation));
          },
        },
      },
      {
        item: {
          ...tabMenuItems.copySourceUri2,
          disabled: !source.url,
          click: () => copyToTheClipboard(getRawSourceURL(source.url)),
        },
      },
      {
        item: {
          ...tabMenuItems.showSource,
          // Source Tree only shows sources with URL
          disabled: !source.url,
          click: () => dispatch(showSource(source.id)),
        },
      },
      {
        item: {
          ...tabMenuItems.toggleBlackBox,
          label: isBlackBoxed
            ? L10N.getStr("ignoreContextItem.unignore")
            : L10N.getStr("ignoreContextItem.ignore"),
          disabled: isSourceOnIgnoreList || !shouldBlackbox(source),
          click: () => dispatch(toggleBlackBox(source)),
        },
      },
      {
        item: {
          ...tabMenuItems.prettyPrint,
          disabled: isSourcePrettyPrinted,
          click: () => dispatch(prettyPrintAndSelectSource(source)),
        },
      },
    ];

    showMenu(event, buildMenu(items));
  };
}
