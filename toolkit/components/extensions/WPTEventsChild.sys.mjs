/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.crashIfNotInAutomation();

// Exposes the browser.test.onMessage event on web-platform.test pages.
export class WPTEventsChild extends JSWindowActorChild {
  observe() {
    // Only observing "content-document-global-created" to trigger the actor.
  }

  actorCreated() {
    let win = this.contentWindow.wrappedJSObject;
    if (!Object.hasOwn(win, "browser")) {
      let test = {};
      for (let name of Object.keys(this.#events)) {
        test[name] = {
          addListener: arg => this.#addListener(name, arg),
          removeListener: arg => this.#removeListener(name, arg),
        };
      }
      Object.defineProperty(win, "browser", {
        configurable: true,
        enumerable: true,
        value: Cu.cloneInto({ test }, win, { cloneFunctions: true }),
        writable: true,
      });
    }
  }

  receiveMessage({ name, data }) {
    for (let callback of this.#events[name]) {
      try {
        callback(Cu.cloneInto(data, this.contentWindow));
      } catch (e) {
        Cu.reportError(
          `Error in browser.test.${name} listener: ${e.message}`,
          e.stack
        );
      }
    }
  }

  #addListener(name, callback) {
    if (!this.#listenerCount()) {
      this.sendAsyncMessage("addListener");
    }
    this.#events[name].add(callback);
  }

  #removeListener(name, callback) {
    this.#events[name].delete(callback);
    if (!this.#listenerCount()) {
      this.sendAsyncMessage("removeListener");
    }
  }

  #listenerCount() {
    return Object.values(this.#events).reduce((sum, ev) => sum + ev.size, 0);
  }

  #events = {
    onTestStarted: new Set(),
    onTestFinished: new Set(),
    onAssertEquality: new Set(),
    onAssert: new Set(),
  };
}
