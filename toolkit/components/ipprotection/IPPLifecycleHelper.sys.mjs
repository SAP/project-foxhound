/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPPProxyManager:
    "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs",
  IPPProxyStates:
    "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs",
});

const SLEEP_TOPIC = "sleep_notification";
const WAKE_TOPIC = "wake_notification";

/**
 * Keeps the proxy connection healthy across system sleep/wake.
 *
 * While ACTIVE, suspends the channel filter on sleep and, on wake, resumes it if
 * the pass is still good or rotates otherwise.
 */
export class IPPLifeCycleHelperClass {
  #observing = false;

  constructor() {
    this.handleEvent = this.#handleEvent.bind(this);
  }

  init() {
    lazy.IPPProxyManager.addEventListener(
      "IPPProxyManager:StateChanged",
      this.handleEvent
    );
  }

  initOnStartupCompleted() {}

  uninit() {
    lazy.IPPProxyManager.removeEventListener(
      "IPPProxyManager:StateChanged",
      this.handleEvent
    );
    this.stop();
  }

  #handleEvent(_event) {
    switch (lazy.IPPProxyManager.state) {
      case lazy.IPPProxyStates.ACTIVE:
        this.start();
        break;
      default:
        this.stop();
        break;
    }
  }

  start() {
    if (this.#observing) {
      return;
    }
    Services.obs.addObserver(this, SLEEP_TOPIC);
    Services.obs.addObserver(this, WAKE_TOPIC);
    this.#observing = true;
  }

  stop() {
    if (!this.#observing) {
      return;
    }
    Services.obs.removeObserver(this, SLEEP_TOPIC);
    Services.obs.removeObserver(this, WAKE_TOPIC);
    this.#observing = false;
  }

  observe(_subject, topic) {
    switch (topic) {
      case SLEEP_TOPIC:
        this.#onSleep();
        break;
      case WAKE_TOPIC:
        this.#onWake();
        break;
    }
  }

  #onSleep() {
    const channelFilter = lazy.IPPProxyManager.channelFilter();
    if (!channelFilter?.active) {
      return;
    }
    channelFilter.suspend();
  }

  #onWake() {
    const channelFilter = lazy.IPPProxyManager.channelFilter();
    if (!channelFilter?.active) {
      return;
    }
    if (channelFilter.canResume) {
      channelFilter.resume();
    } else {
      lazy.IPPProxyManager.rotateProxyPass();
    }
  }
}

export const IPPLifecycleHelper = new IPPLifeCycleHelperClass();
