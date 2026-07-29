/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Schedule a task to be run no sooner than a specified instant in time.
 * If the computer goes to sleep, the task will be run as soon as possible
 * after the computer wakes again.
 */
const topics = ["wake_notification", "sleep_notification"];

export class ScheduledTask {
  /**
   * Constructor for a ScheduledTask. Created the task in a disarmed state. Call arm()
   * to activate the task.
   *
   * @param {Function} callback
   *  Function to execute at or after the specified time
   * @param {number} epochMilliseconds
   *  The time (in milliseconds since the Unix epoch) to execute the specified function
   */
  constructor(callback, epochMilliseconds) {
    this.epochMilliseconds = epochMilliseconds;
    this.armed = false;
    this.timer = null;
    this.callback = callback;
    this.promise = Promise.resolve();
  }

  async _callbackHandler() {
    try {
      await this.callback();
      this.resolve();
    } catch (err) {
      this.reject(err);
    } finally {
      this._disableTask();
    }
  }

  _createTimer() {
    const delay = this.epochMilliseconds - Date.now();
    if (delay >= 0) {
      const newTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      newTimer.initWithCallback(
        () => {
          this._callbackHandler();
        },
        delay,
        Ci.nsITimer.TYPE_ONE_SHOT
      );
      return newTimer;
    }
    ChromeUtils.idleDispatch(() => {
      this._callbackHandler();
    });
    return null;
  }

  _destroyTimer() {
    if (this.timer) {
      this.timer.cancel();
      this.timer = null;
    }
  }

  // Callback needed for Services.obs.addObserver
  observe(_subject, topic, _data) {
    switch (topic) {
      case "sleep_notification":
        // Going to sleep now.
        // Apparently nsITimer (and anything that uses it directly) doesn't count milliseconds during
        // sleep as part of the time. So the existing timer is no longer useful when going to sleep.
        // Destroy it.
        if (this.armed && this.timer) {
          this._destroyTimer();
        }
        break;
      case "wake_notification":
        // We're back! Create a timer.
        if (this.armed && !this.timer) {
          this.timer = this._createTimer();
        }
        break;
    }
  }

  _enableObservers() {
    topics.forEach(topic => {
      Services.obs.addObserver(this, topic);
    });
  }

  _disableObservers() {
    topics.forEach(topic => {
      Services.obs.removeObserver(this, topic);
    });
  }

  _disableTask() {
    if (this.armed) {
      this._destroyTimer();
      this._disableObservers();
    }
  }

  /**
   * Arming the task means that, when the computer is not sleeping, there is a timer
   * set to execute the callback after an appropriate number of milliseconds. If the
   * computer wakes from sleep, if the time period has passed, the callback is
   * executed immediately.
   */
  arm() {
    if (!this.armed) {
      const { promise, resolve, reject } = Promise.withResolvers();
      this.promise = promise;
      this.resolve = resolve;
      this.reject = reject;

      this._enableObservers();
      this.armed = true;
      this.timer = this._createTimer();
    }
    return this; // Enable fluent chaining
  }

  /**
   * Disarm the task.
   */
  disarm() {
    if (this.armed) {
      this.resolve();
      this._disableTask();
      this.armed = false;
    }
    return this; // Enable fluent chaining
  }

  get isArmed() {
    return this.armed;
  }

  /**
   * Returns a promise that resolves or rejects when the callback is invoked
   */
  asPromise() {
    return this.promise;
  }
}
