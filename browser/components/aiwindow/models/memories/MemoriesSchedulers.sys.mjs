/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  MemoriesManager:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs",
  MemoriesHistoryScheduler:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesHistoryScheduler.sys.mjs",
  MemoriesConversationScheduler:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesConversationScheduler.sys.mjs",
});

/**
 
 */
export class MemoriesSchedulers {
  /**
   * Entry point to be called when an AI window becomes active.
   * Starts (or reuses) schedulers. Each scheduler will still enforce its own cooldown.
   * Usage: MemoriesSchedulers.maybeRunAndSchedule()
   */
  static maybeRunAndSchedule() {
    if (!lazy.MemoriesManager.shouldEnableMemoriesSchedulers()) {
      return null;
    }

    // Start schedulers
    const history = lazy.MemoriesHistoryScheduler.maybeInit();
    const conversation = lazy.MemoriesConversationScheduler.maybeInit();

    return { history, conversation };
  }

  static stop() {
    lazy.MemoriesHistoryScheduler.maybeInit()?.destroy?.();
    lazy.MemoriesConversationScheduler.maybeInit()?.destroy?.();
  }
}
