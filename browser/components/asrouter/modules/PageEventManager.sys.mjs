/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  EveryWindow: "resource:///modules/EveryWindow.sys.mjs",
});
/**
 * Methods for setting up and tearing down page event listeners. These are used
 * to dismiss Feature Callouts when the callout's anchor element is clicked.
 */
export class PageEventManager {
  /**
   * A set of parameters defining a page event listener.
   *
   * @typedef {object} PageEventListenerParams
   * @property {string} type Event type string e.g. `click`
   * @property {string} [selectors] Target selector, e.g. `tag.class, #id[attr]`
   * @property {PageEventListenerOptions} [options] addEventListener options
   *
   * @typedef {object} PageEventListenerOptions
   * @property {boolean} [capture] Use event capturing phase?
   * @property {boolean} [once] Remove listener after first event?
   * @property {boolean} [preventDefault] Inverted value for `passive` option
   * @property {number} [interval] Used only for `timeout` and `interval` event
   *   types. These don't set up real event listeners, but instead invoke the
   *   action on a timer.
   *
   * @typedef {object} PageEventListener
   * @property {Function} callback Function to call when event is triggered
   * @property {AbortController} controller Handle for aborting the listener
   *
   * @typedef {object} PageEvent
   * @property {string} type Event type string e.g. `click`
   * @property {Element} [target] Event target
   */

  /**
   * Maps event listener params to their PageEventListeners, so they can be
   * called and cancelled.
   *
   * @type {Map<PageEventListenerParams, PageEventListener>}
   */
  _listeners = new Map();

  /**
   * @param {Window} win Window containing the document to listen to
   */
  constructor(win) {
    this.win = win;
    this.doc = win.document;
  }

  /**
   * Adds a page event listener.
   *
   * @param {PageEventListenerParams} params
   * @param {Function} callback Function to call when event is triggered
   */
  on(params, callback) {
    if (this._listeners.has(params)) {
      return;
    }
    const { type, selectors, options = {} } = params;
    const listener = { callback };
    if (selectors) {
      const controller = new AbortController();
      const opt = {
        capture: !!options.capture,
        passive: !options.preventDefault,
        signal: controller.signal,
      };
      if (options?.every_window) {
        // Using unique ID for each listener in case there are multiple
        // listeners with the same type
        let uuid = Services.uuid.generateUUID().number;
        lazy.EveryWindow.registerCallback(
          uuid,
          win => {
            for (const target of win.document.querySelectorAll(selectors)) {
              target.addEventListener(type, callback, opt);
            }
          },
          win => {
            for (const target of win.document.querySelectorAll(selectors)) {
              target.removeEventListener(type, callback, opt);
            }
          }
        );
        listener.uninit = () => lazy.EveryWindow.unregisterCallback(uuid, true);
      } else {
        for (const target of this.doc.querySelectorAll(selectors)) {
          target.addEventListener(type, callback, opt);
        }
      }
      listener.controller = controller;
    } else if (["timeout", "interval"].includes(type) && options.interval) {
      let interval;
      const abort = () => this.win.clearInterval(interval);
      const onInterval = () => {
        callback({ type, target: type });
        if (type === "timeout") {
          abort();
        }
      };
      interval = this.win.setInterval(onInterval, options.interval);
      listener.callback = onInterval;
      listener.controller = { abort };
    }
    this._listeners.set(params, listener);
  }

  /**
   * Removes a page event listener.
   *
   * @param {PageEventListenerParams} params
   */
  off(params) {
    const listener = this._listeners.get(params);
    if (!listener) {
      return;
    }
    listener.uninit?.();
    listener.controller?.abort();
    this._listeners.delete(params);
  }

  /**
   * Adds a page event listener that is removed after the first event.
   *
   * @param {PageEventListenerParams} params
   * @param {Function} callback Function to call when event is triggered
   */
  once(params, callback) {
    const wrappedCallback = (...args) => {
      this.off(params);
      callback(...args);
    };
    this.on(params, wrappedCallback);
  }

  /**
   * Removes all page event listeners.
   */
  clear() {
    for (const listener of this._listeners.values()) {
      listener.uninit?.();
      listener.controller?.abort();
    }
    this._listeners.clear();
  }

  /**
   * Calls matching page event listeners. A way to dispatch a "fake" event.
   *
   * @param {PageEvent} event
   */
  emit(event) {
    for (const [params, listener] of this._listeners) {
      if (params.type === event.type) {
        listener.callback(event);
      }
    }
  }
}
