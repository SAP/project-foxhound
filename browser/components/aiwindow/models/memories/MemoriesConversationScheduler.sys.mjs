/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  setInterval: "resource://gre/modules/Timer.sys.mjs",
  clearInterval: "resource://gre/modules/Timer.sys.mjs",
  MemoriesManager:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs",
  getRecentChats:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesChatSource.sys.mjs",
});
ChromeUtils.defineLazyGetter(lazy, "console", function () {
  return console.createInstance({
    prefix: "MemoriesConversationScheduler",
    maxLogLevelPref: "browser.smartwindow.memoriesLogLevel",
  });
});

// Generate memories if there have been at least 10 user messages since the last run
const MEMORIES_SCHEDULER_MESSAGES_THRESHOLD = 10;

// Conversation scheduler tick every 2 mins
const MEMORIES_SCHEDULER_INTERVAL_MS = 2 * 60 * 1000;
// Cooldown period - don't run more than once every 4 hours
//TODO: pref only for test purposes. will be later reverted
const MEMORIES_SCHEDULER_COOLDOWN_MS = Services.prefs.getIntPref(
  "browser.smartwindow.memoriesSchedulerCooldownInMs",
  4 * 60 * 60 * 1000
);

/**
 * Schedules periodic generation of conversation-based memories.
 * Triggers memories generation when number of user messages exceeds the configured threshold ({@link MEMORIES_SCHEDULER_MESSAGES_THRESHOLD})
 *
 * E.g. Usage: MemoriesConversationScheduler.maybeInit()
 */
export class MemoriesConversationScheduler {
  #intervalHandle = 0;
  #destroyed = false;
  #running = false;

  /** @type {MemoriesConversationScheduler | null} */
  static #instance = null;

  static maybeInit() {
    if (!lazy.MemoriesManager.shouldEnableMemoriesSchedulers()) {
      return null;
    }
    if (!this.#instance) {
      this.#instance = new MemoriesConversationScheduler();
    }
    return this.#instance;
  }

  constructor() {
    this.#startInterval();
    lazy.console.debug("Initialized");
  }

  /**
   * Starts the interval that periodically evaluates history drift and
   * potentially triggers memory generation.
   *
   * @throws {Error} If an interval is already running.
   */
  #startInterval() {
    if (this.#intervalHandle) {
      throw new Error(
        "Attempting to start an interval when one already existed"
      );
    }
    this.#intervalHandle = lazy.setInterval(
      this.#onInterval,
      MEMORIES_SCHEDULER_INTERVAL_MS
    );
  }

  /**
   * Stops the currently running interval, if any.
   */
  #stopInterval() {
    if (this.#intervalHandle) {
      lazy.clearInterval(this.#intervalHandle);
      this.#intervalHandle = 0;
    }
  }

  #onInterval = async () => {
    if (this.#destroyed) {
      lazy.console.warn("Interval fired after destroy; ignoring.");
      return;
    }

    // Re-check gating conditions on every tick (AIWindow may have closed, prefs may have changed).
    if (!lazy.MemoriesManager.shouldEnableMemoriesSchedulers()) {
      lazy.console.debug(
        "Memories schedulers no longer enabled; stopping conversation scheduler."
      );
      this.destroy();
      // Also clear singleton so it can be re-initialized later when conditions become true again.
      MemoriesConversationScheduler.#instance = null;
      return;
    }

    if (this.#running) {
      lazy.console.debug(
        "Skipping run because a previous run is still in progress."
      );
      return;
    }

    this.#running = true;
    this.#stopInterval();

    try {
      // Detect whether conversation memories were generated before.
      const lastMemoryTs =
        (await lazy.MemoriesManager.getLastConversationMemoryTimestamp()) ?? 0;

      const now = Date.now();

      // Cooldown check - don't run more than once every 4 hours.
      if (
        lastMemoryTs > 0 &&
        now - lastMemoryTs < MEMORIES_SCHEDULER_COOLDOWN_MS
      ) {
        lazy.console.debug(
          `Cooldown not met; last run was ${Math.floor(
            (now - lastMemoryTs) / (60 * 1000)
          )}m ago (<${Math.floor(
            MEMORIES_SCHEDULER_COOLDOWN_MS / (60 * 60 * 1000)
          )}h). Skipping.`
        );
        return;
      }

      // Get user chat messages
      const chatMessagesSinceLastMemory =
        await lazy.getRecentChats(lastMemoryTs);

      // Not enough new messages
      if (
        chatMessagesSinceLastMemory.length <
        MEMORIES_SCHEDULER_MESSAGES_THRESHOLD
      ) {
        return;
      }

      // Generate memories
      await lazy.MemoriesManager.generateMemoriesFromConversationHistory();
    } catch (error) {
      lazy.console.error("Failed to generate conversation memories", error);
    } finally {
      if (
        !this.#destroyed &&
        lazy.MemoriesManager.shouldEnableMemoriesSchedulers()
      ) {
        this.#startInterval();
      }
      this.#running = false;
    }
  };

  destroy() {
    this.#stopInterval();
    this.#destroyed = true;
    MemoriesConversationScheduler.#instance = null;
    lazy.console.debug("Destroyed");
  }

  async runNowForTesting() {
    await this.#onInterval();
  }
}
