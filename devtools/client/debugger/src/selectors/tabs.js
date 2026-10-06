/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

export const getOpenedURLs = state => state.tabs.urls;

// Return the list of source objects which are opened.
// i.e. sources which have a tab currently opened.
export const getOpenedSources = state => state.tabs.openedSources;

export const getPrettyPrintedURLs = state => state.tabs.prettyPrintedURLs;

export function tabExists(state, source) {
  // Minimized(=generatedSource) and its related pretty printed source will both share the same tab,
  // so we should consider that the tab is already opened if the tab relates to the passed minimized source.
  return getOpenedSources(state).some(
    s => s == (source.isPrettyPrinted ? source.generatedSource : source)
  );
}

/**
 * For a given non-original source, returns true only if this source has been pretty printed
 * and has a tab currently opened with pretty printing enabled.
 *
 * @return {boolean}
 */
export function isPrettyPrinted(state, source) {
  return source.url && state.tabs.prettyPrintedURLs.has(source.url);
}

/**
 * Reports if a given source was ignored by auto-pretty printing,
 * or if the user manually disabled pretty printing on it
 */
export function isPrettyPrintedDisabled(state, source) {
  return source.url && state.tabs.prettyPrintedDisabledURLs.has(source.url);
}
