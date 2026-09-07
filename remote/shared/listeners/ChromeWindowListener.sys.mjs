/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  EventEmitter: "resource://gre/modules/EventEmitter.sys.mjs",

  BrowsingContextListener:
    "chrome://remote/content/shared/listeners/BrowsingContextListener.sys.mjs",
});

const OBSERVER_TOPIC_CLOSED = "domwindowclosed";
const OBSERVER_TOPIC_OPENED = "domwindowopened";

/**
 * The ChromeWindowListener can be used to listen for notifications
 * coming from Chrome windows that get opened or closed.
 *
 * Example:
 * ```
 * const listener = new ChromeWindowListener();
 * listener.on("opened", onOpened);
 * listener.startListening();
 *
 * const onOpened = (eventName, data = {}) => {
 *   const { window, why } = data;
 *   ...
 * };
 * ```
 *
 * @fires message
 *    The ChromeWindowListener emits "opened" and "closed" events,
 *    with the following object as payload:
 *      - {ChromeWindow} window
 *            Chrome window the notification relates to.
 */
export class ChromeWindowListener {
  #closingWindows;
  #contextListener;
  #listening;

  /**
   * Create a new ChromeWindowListener instance.
   */
  constructor() {
    lazy.EventEmitter.decorate(this);

    // When the `domwindowclosed` notification is sent, the
    // containing browsing contexts still exist. We must delay
    // emitting the `closed` event until the corresponding
    // top-level chrome browsing context has closed as well.
    this.#closingWindows = new WeakSet();

    this.#contextListener = new lazy.BrowsingContextListener();
    this.#listening = false;
  }

  destroy() {
    this.stopListening();
  }

  observe(subject, topic) {
    switch (topic) {
      case OBSERVER_TOPIC_OPENED: {
        this.emit("opened", { window: subject });
        break;
      }
      case OBSERVER_TOPIC_CLOSED: {
        this.#closingWindows.add(subject);
        break;
      }
    }
  }

  startListening() {
    if (this.#listening) {
      return;
    }

    Services.ww.registerNotification(this);

    this.#contextListener.on("discarded", this.#onContextDiscarded);
    this.#contextListener.startListening();

    this.#listening = true;
  }

  stopListening() {
    if (!this.#listening) {
      return;
    }

    this.#contextListener.off("discarded", this.#onContextDiscarded);
    this.#contextListener.stopListening();

    Services.ww.unregisterNotification(this);

    this.#closingWindows = new WeakSet();
    this.#listening = false;
  }

  #onContextDiscarded = (_, data = {}) => {
    const { browsingContext } = data;

    if (browsingContext.isContent || browsingContext.parent) {
      // We only care about top-level chrome browsing contexts
      return;
    }

    const window = browsingContext.topChromeWindow;
    if (this.#closingWindows.has(window)) {
      this.#closingWindows.delete(window);

      this.emit("closed", { window });
    }
  };
}
