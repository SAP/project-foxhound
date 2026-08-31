/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  TaskbarTabsRegistry:
    "resource:///modules/taskbartabs/TaskbarTabsRegistry.sys.mjs",
  TaskbarTabsWindowManager:
    "resource:///modules/taskbartabs/TaskbarTabsWindowManager.sys.mjs",
});

/**
 * Creates a web app window with the given tab,
 * then returns the window object for testing.
 *
 * @param {Tab} aTab
 *        The tab that the web app should open with
 * @param {{userContextId:number}} [aOptions]
 *        Options to use when creating the web app
 * @returns {Promise}
 *        The web app window object.
 */
async function openTaskbarTabWindow(aTab = null, aOptions = null) {
  const url = Services.io.newURI("https://example.com");
  const userContextId = aOptions?.userContextId ?? 0;

  const registry = new TaskbarTabsRegistry();
  const taskbarTab = createTaskbarTab(registry, url, userContextId);
  const windowManager = new TaskbarTabsWindowManager();

  if (aTab) {
    return await windowManager.replaceTabWithWindow(taskbarTab, aTab);
  }

  return await windowManager.openWindow(taskbarTab);
}

/**
 * Creates a new Taskbar Tab within the registry, and asserts that it does not
 * already exist.
 *
 * (This function is also in xpcshell/head.js.)
 *
 * @param {TaskbarTabsRegistry|TaskbarTabs} aRegistry
 *   The registry to create the taskbar tab in.
 * @param {...*} args
 *   Arguments to findOrCreateTaskbarTab.
 * @returns {TaskbarTab}
 *   The newly-created taskbar tab.
 */
function createTaskbarTab(aRegistry, ...args) {
  let result = aRegistry.findOrCreateTaskbarTab(...args);
  function check({ taskbarTab, created }) {
    Assert.ok(created, "Created taskbar tab did not exist before");
    return taskbarTab;
  }

  if (result.then) {
    return result.then(check);
  }

  return check(result);
}
