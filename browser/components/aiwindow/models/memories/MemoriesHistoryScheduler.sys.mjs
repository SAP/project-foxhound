/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  setInterval: "resource://gre/modules/Timer.sys.mjs",
  clearInterval: "resource://gre/modules/Timer.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  MemoriesManager:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs",
  MemoriesDriftDetector:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesDriftDetector.sys.mjs",
  DRIFT_EVAL_DELTA_COUNT:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesConstants.sys.mjs",
  DRIFT_TRIGGER_QUANTILE:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesConstants.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "console", function () {
  return console.createInstance({
    prefix: "MemoriesHistoryScheduler",
    maxLogLevelPref: "browser.smartwindow.memoriesLogLevel",
  });
});

// Special case - Minimum number of pages before the first time memories run.
const INITIAL_MEMORIES_PAGES_THRESHOLD = 0;

// Only run if at least this many pages have been visited.
const MEMORIES_SCHEDULER_PAGES_THRESHOLD = 30;

// Memories history schedule every 2 mins
const MEMORIES_SCHEDULER_INTERVAL_MS = 2 * 60 * 1000;
// Cooldown period - don't run more than once every 6 hours
const MEMORIES_SCHEDULER_COOLDOWN_MS = Services.prefs.getIntPref(
  "browser.smartwindow.memoriesSchedulerCooldownInMs",
  6 * 60 * 60 * 1000
);

// minimum visit threshold
const MIN_RECENT_VISITS = 10;
const MIN_RECENT_VISITS_DAYS = 60;

/**
 * Schedules periodic generation of browsing history based memories.
 *
 * This decides based on the #pagesVisited and periodically evaluates history drift metrics.
 * Triggers memories generation when drift exceeds a configured threshold.
 *
 * E.g. Usage: MemoriesHistoryScheduler.maybeInit()
 */
export class MemoriesHistoryScheduler {
  #pagesVisited = 0;
  #intervalHandle = 0;
  #destroyed = false;
  #running = false;

  /** @type {MemoriesHistoryScheduler | null} */
  static #instance = null;

  /**
   * Initializes the scheduler if the relevant pref is enabled.
   *
   * This should be called from startup/feature initialization code.
   *
   * @returns {MemoriesHistoryScheduler|null}
   *          The scheduler instance if initialized, otherwise null.
   */
  static maybeInit() {
    if (!lazy.MemoriesManager.shouldEnableMemoriesSchedulers()) {
      return null;
    }
    if (!this.#instance) {
      this.#instance = new MemoriesHistoryScheduler();
    }

    return this.#instance;
  }

  /**
   * Creates a new scheduler instance.
   *
   * The constructor:
   * - Starts the periodic interval timer.
   * - Subscribes to Places "page-visited" notifications.
   */
  constructor() {
    lazy.PlacesUtils.observers.addListener(
      ["page-visited"],
      this.#onPageVisited
    );
    // run immediately (first run) or just start the interval.
    void this.#init();
    lazy.console.debug("[MemoriesHistoryScheduler] Initialized");
  }

  /**
   * initializer for the history scheduler.
   *
   * - no operation if memories schedulers are disabled.
   * - If this is the first history memories run, triggers an immediate run.
   * - Otherwise, starts the periodic interval timer.
   *
   * @private
   * @returns {Promise<void>}
   */
  async #init() {
    if (!lazy.MemoriesManager.shouldEnableMemoriesSchedulers()) {
      return;
    }

    const lastMemoryTs =
      (await lazy.MemoriesManager.getLastHistoryMemoryTimestamp()) ?? 0;
    const isFirstRun = lastMemoryTs === 0;

    if (isFirstRun) {
      lazy.console.debug(
        "[MemoriesHistoryScheduler] First run detected; running immediately."
      );
      // #onInterval's finally will start the interval
      await this.#onInterval();
    } else {
      this.#startInterval();
    }
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

  /**
   * Places "page-visited" observer callback.
   *
   * Increments the internal counter of pages visited since the last
   * successful memory generation run.
   */
  #onPageVisited = () => {
    this.#pagesVisited++;
  };

  /**
   * Periodic interval handler.
   *
   * - Skips if the scheduler is destroyed or already running.
   * - Skips if the minimum pages-visited threshold is not met.
   * - Computes history drift metrics and decides whether to run memories.
   * - Invokes {@link lazy.MemoriesManager.generateMemoriesFromBrowsingHistory}
   *   when appropriate.
   *
   * @private
   * @returns {Promise<void>} Resolves once the interval run completes.
   */
  #onInterval = async () => {
    if (this.#destroyed) {
      lazy.console.warn(
        "[MemoriesHistoryScheduler] Interval fired after destroy; ignoring."
      );
      return;
    }

    // Re-check gating conditions on every tick (AIWindow may have closed, prefs may have changed).
    if (!lazy.MemoriesManager.shouldEnableMemoriesSchedulers()) {
      lazy.console.debug(
        "[MemoriesHistoryScheduler] Memories schedulers no longer enabled; stopping history scheduler."
      );
      this.destroy();
      return;
    }

    if (this.#running) {
      lazy.console.debug(
        "[MemoriesHistoryScheduler] Skipping run because a previous run is still in progress."
      );
      return;
    }

    this.#running = true;
    this.#stopInterval();

    try {
      // Detect whether generated history memories were before.
      const lastMemoryTs =
        (await lazy.MemoriesManager.getLastHistoryMemoryTimestamp()) ?? 0;
      const isFirstRun = lastMemoryTs === 0;

      const now = Date.now();

      // Cooldown check - don't run more than once every 6 hours.
      // keep accumulating pagesVisited until eligible.
      if (!isFirstRun && now - lastMemoryTs < MEMORIES_SCHEDULER_COOLDOWN_MS) {
        lazy.console.debug(
          `[MemoriesHistoryScheduler] Cooldown not met; last run was ${Math.floor(
            (now - lastMemoryTs) / (60 * 1000)
          )}m ago (<${Math.floor(
            MEMORIES_SCHEDULER_COOLDOWN_MS / (60 * 60 * 1000)
          )}h). Skipping. pagesVisited=${this.#pagesVisited}`
        );
        return;
      }

      const minPagesThreshold = isFirstRun
        ? INITIAL_MEMORIES_PAGES_THRESHOLD
        : MEMORIES_SCHEDULER_PAGES_THRESHOLD;

      if (this.#pagesVisited < minPagesThreshold) {
        lazy.console.debug(
          `[MemoriesHistoryScheduler] Not enough pages visited (${this.#pagesVisited}/${minPagesThreshold}); ` +
            `skipping analysis. isFirstRun=${isFirstRun}`
        );
        return;
      }

      const recentVisitCount = await lazy.MemoriesManager.countRecentVisits({
        days: MIN_RECENT_VISITS_DAYS,
      });
      if (recentVisitCount < MIN_RECENT_VISITS) {
        lazy.console.debug(
          `[MemoriesHistoryScheduler] Not enough recent visits (${recentVisitCount} < ${MIN_RECENT_VISITS}); skipping.`
        );
        return;
      }

      if (!isFirstRun) {
        lazy.console.debug(
          "[MemoriesHistoryScheduler] Computing history drift metrics before running memories..."
        );

        const { baselineMetrics, deltaMetrics, trigger } =
          await lazy.MemoriesDriftDetector.computeHistoryDriftAndTrigger({
            triggerQuantile: lazy.DRIFT_TRIGGER_QUANTILE,
            evalDeltaCount: lazy.DRIFT_EVAL_DELTA_COUNT,
          });

        if (!baselineMetrics.length || !deltaMetrics.length) {
          lazy.console.debug(
            "[MemoriesHistoryScheduler] Drift metrics incomplete (no baseline or delta); falling back to non-drift scheduling."
          );
        } else if (!trigger.triggered) {
          lazy.console.debug(
            "[MemoriesHistoryScheduler] History drift below threshold; skipping memories run for this interval."
          );
          // Reset pages so we don’t repeatedly attempt with the same data.
          this.#pagesVisited = 0;
          return;
        } else {
          lazy.console.debug(
            `[MemoriesHistoryScheduler] Drift triggered (jsThreshold=${trigger.jsThreshold.toFixed(4)}, ` +
              `surpriseThreshold=${trigger.surpriseThreshold.toFixed(4)}); sessions=${trigger.triggeredSessionIds.join(
                ","
              )}`
          );
        }
      }

      lazy.console.debug(
        `[MemoriesHistoryScheduler] Generating memories from history with ${this.#pagesVisited} new pages`
      );
      await lazy.MemoriesManager.generateMemoriesFromBrowsingHistory();
      this.#pagesVisited = 0;

      lazy.console.debug(
        "[MemoriesHistoryScheduler] History memories generation complete."
      );
    } catch (error) {
      lazy.console.error(
        "[MemoriesHistoryScheduler] Failed to generate history memories",
        error
      );
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

  /**
   * Cleans up scheduler resources.
   *
   * Stops the interval, unsubscribes from Places notifications,
   * and marks the scheduler as destroyed so future interval ticks
   * are ignored.
   */
  destroy() {
    this.#stopInterval();
    lazy.PlacesUtils.observers.removeListener(
      ["page-visited"],
      this.#onPageVisited
    );
    this.#destroyed = true;
    MemoriesHistoryScheduler.#instance = null;
    lazy.console.debug("[MemoriesHistoryScheduler] Destroyed");
  }

  /**
   * Testing helper: set pagesVisited count.
   * Not used in production code.
   *
   * @param {number} count
   */
  setPagesVisitedForTesting(count) {
    this.#pagesVisited = count;
  }

  /**
   * Testing helper: runs the interval handler once immediately.
   * Not used in production code.
   */
  async runNowForTesting() {
    await this.#onInterval();
  }
}
