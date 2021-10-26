/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {
  WatcherRegistry,
} = require("devtools/server/actors/watcher/WatcherRegistry.jsm");
const {
  WindowGlobalLogger,
} = require("devtools/server/connectors/js-window-actor/WindowGlobalLogger.jsm");
const Targets = require("devtools/server/actors/targets/index");
const {
  getAllRemoteBrowsingContexts,
  shouldNotifyWindowGlobal,
} = require("devtools/server/actors/watcher/target-helpers/utils.js");

/**
 * Force creating targets for all existing BrowsingContext, that, for a given Watcher Actor.
 *
 * @param WatcherActor watcher
 *        The Watcher Actor requesting to watch for new targets.
 */
async function createTargets(watcher) {
  // Go over all existing BrowsingContext in order to:
  // - Force the instantiation of a DevToolsFrameChild
  // - Have the DevToolsFrameChild to spawn the BrowsingContextTargetActor
  const browsingContexts = getFilteredRemoteBrowsingContext(
    watcher.browserElement
  );
  const promises = [];
  for (const browsingContext of browsingContexts) {
    logWindowGlobal(
      browsingContext.currentWindowGlobal,
      "Existing WindowGlobal"
    );

    // Await for the query in order to try to resolve only *after* we received these
    // already available targets.
    const promise = browsingContext.currentWindowGlobal
      .getActor("DevToolsFrame")
      .instantiateTarget({
        watcherActorID: watcher.actorID,
        connectionPrefix: watcher.conn.prefix,
        browserId: watcher.browserId,
        watchedData: watcher.watchedData,
      });
    promises.push(promise);
  }
  return Promise.all(promises);
}

/**
 * Force destroying all BrowsingContext targets which were related to a given watcher.
 *
 * @param WatcherActor watcher
 *        The Watcher Actor requesting to stop watching for new targets.
 */
function destroyTargets(watcher) {
  // Go over all existing BrowsingContext in order to destroy all targets
  const browsingContexts = getFilteredRemoteBrowsingContext(
    watcher.browserElement
  );
  for (const browsingContext of browsingContexts) {
    logWindowGlobal(
      browsingContext.currentWindowGlobal,
      "Existing WindowGlobal"
    );

    browsingContext.currentWindowGlobal
      .getActor("DevToolsFrame")
      .destroyTarget({
        watcherActorID: watcher.actorID,
        browserId: watcher.browserId,
      });
  }
}

/**
 * Go over all existing BrowsingContext in order to communicate about new data entries
 *
 * @param WatcherActor watcher
 *        The Watcher Actor requesting to stop watching for new targets.
 * @param string type
 *        The type of data to be added
 * @param Array<Object> entries
 *        The values to be added to this type of data
 */
async function addWatcherDataEntry({ watcher, type, entries }) {
  const browsingContexts = getWatchingBrowsingContexts(watcher);
  const promises = [];
  for (const browsingContext of browsingContexts) {
    logWindowGlobal(
      browsingContext.currentWindowGlobal,
      "Existing WindowGlobal"
    );

    const promise = browsingContext.currentWindowGlobal
      .getActor("DevToolsFrame")
      .addWatcherDataEntry({
        watcherActorID: watcher.actorID,
        browserId: watcher.browserId,
        type,
        entries,
      });
    promises.push(promise);
  }
  // Await for the queries in order to try to resolve only *after* the remote code processed the new data
  return Promise.all(promises);
}

/**
 * Notify all existing frame targets that some data entries have been removed
 *
 * See addWatcherDataEntry for argument documentation.
 */
function removeWatcherDataEntry({ watcher, type, entries }) {
  const browsingContexts = getWatchingBrowsingContexts(watcher);
  for (const browsingContext of browsingContexts) {
    logWindowGlobal(
      browsingContext.currentWindowGlobal,
      "Existing WindowGlobal"
    );

    browsingContext.currentWindowGlobal
      .getActor("DevToolsFrame")
      .removeWatcherDataEntry({
        watcherActorID: watcher.actorID,
        browserId: watcher.browserId,
        type,
        entries,
      });
  }
}

module.exports = {
  createTargets,
  destroyTargets,
  addWatcherDataEntry,
  removeWatcherDataEntry,
};

/**
 * Return the list of BrowsingContexts which should be targeted in order to communicate
 * a new list of resource types to listen or stop listening to.
 *
 * @param WatcherActor watcher
 *        The watcher actor will be used to know which target we debug
 *        and what BrowsingContext should be considered.
 */
function getWatchingBrowsingContexts(watcher) {
  // If we are watching for additional frame targets, it means that fission mode is enabled,
  // either for a content toolbox or a BrowserToolbox via devtools.browsertoolbox.fission pref.
  const watchingAdditionalTargets = WatcherRegistry.isWatchingTargets(
    watcher,
    Targets.TYPES.FRAME
  );
  const { browserElement } = watcher;
  const browsingContexts = watchingAdditionalTargets
    ? getFilteredRemoteBrowsingContext(browserElement)
    : [];
  // Even if we aren't watching additional target, we want to process the top level target.
  // The top level target isn't returned by getFilteredRemoteBrowsingContext, so add it in both cases.
  if (browserElement) {
    const topBrowsingContext = browserElement.browsingContext;
    // Ignore if we are against a page running in the parent process,
    // which would not support JSWindowActor API
    // XXX May be we should toggle `includeChrome` and ensure watch/unwatch works
    // with such page?
    if (topBrowsingContext.currentWindowGlobal.osPid != -1) {
      browsingContexts.push(topBrowsingContext);
    }
  }
  return browsingContexts;
}

/**
 * Get the list of all BrowsingContext we should interact with.
 * The precise condition of which BrowsingContext we should interact with are defined
 * in `shouldNotifyWindowGlobal`
 *
 * @param BrowserElement browserElement (optional)
 *        If defined, this will restrict to only the Browsing Context matching this
 *        Browser Element and any of its (nested) children iframes.
 */
function getFilteredRemoteBrowsingContext(browserElement) {
  return getAllRemoteBrowsingContexts(
    browserElement?.browsingContext
  ).filter(browsingContext =>
    shouldNotifyWindowGlobal(browsingContext, browserElement?.browserId)
  );
}

// Set to true to log info about about WindowGlobal's being watched.
const DEBUG = false;

function logWindowGlobal(windowGlobal, message) {
  if (!DEBUG) {
    return;
  }

  WindowGlobalLogger.logWindowGlobal(windowGlobal, message);
}
