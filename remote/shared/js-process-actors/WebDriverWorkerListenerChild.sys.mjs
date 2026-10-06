/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "WorkerDebuggerManager",
  "@mozilla.org/dom/workers/workerdebuggermanager;1",
  Ci.nsIWorkerDebuggerManager
);

ChromeUtils.defineESModuleGetters(lazy, {
  Log: "chrome://remote/content/shared/Log.sys.mjs",
  truncate: "chrome://remote/content/shared/Format.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logger", () => lazy.Log.get());

class WorkerListener {
  #owner;

  constructor(owner) {
    this.#owner = owner;
    lazy.WorkerDebuggerManager.addListener(this);

    // Register all existing worker debugger instances
    for (const workerDebugger of lazy.WorkerDebuggerManager.getWorkerDebuggerEnumerator()) {
      this.#owner.onRegister(workerDebugger, { alreadyRegistered: true });
    }
  }

  destroy() {
    lazy.WorkerDebuggerManager.removeListener(this);
    this.#owner = null;
  }

  /**
   * Expected API for WorkerDebuggerManager.addListener.
   */
  onRegister(workerDebugger) {
    this.#owner.onRegister(workerDebugger);
  }

  /**
   * Expected API for WorkerDebuggerManager.addListener.
   */
  onUnregister(workerDebugger) {
    this.#owner.onUnregister(workerDebugger);
  }
}

export class WebDriverWorkerListenerChild extends JSProcessActorChild {
  #workerListener;

  actorCreated() {
    lazy.logger.trace(
      `WebDriverWorkerListenerChild actor created for PID ${Services.appinfo.processID}`
    );
    this.#workerListener = new WorkerListener(this);
  }

  didDestroy() {
    lazy.logger.trace(
      `WebDriverWorkerListenerChild actor destroyed for PID ${Services.appinfo.processID}`
    );
    this.#workerListener.destroy();
  }

  /**
   * Forwarded from WorkerListener's onRegister.
   *
   * @param {nsIWorkerDebugger} workerDebugger
   *     The nsIWorkerDebugger instance for the worker being registered.
   */
  onRegister(workerDebugger, options = {}) {
    const { alreadyRegistered = false } = options;

    const payload = this.#getWorkerDetails(workerDebugger);
    payload.alreadyRegistered = alreadyRegistered;

    try {
      this.sendAsyncMessage(
        "WebDriverWorkerListenerChild:workerRegistered",
        payload
      );
    } catch {
      lazy.logger.trace(
        lazy.truncate`Could not send WebDriverWorkerListenerChild:workerRegistered for worker: ${payload.url}`
      );
    }
  }

  /**
   * Forwarded from WorkerListener's onUnregister.
   *
   * @param {nsIWorkerDebugger} workerDebugger
   *     The nsIWorkerDebugger instance for the worker being unregistered.
   */
  onUnregister(workerDebugger) {
    const payload = this.#getWorkerDetails(workerDebugger);

    try {
      this.sendAsyncMessage(
        "WebDriverWorkerListenerChild:workerUnregistered",
        payload
      );
    } catch {
      lazy.logger.trace(
        lazy.truncate`Could not send WebDriverWorkerListenerChild:workerUnregistered for worker: ${payload.url}`
      );
    }
  }

  async receiveMessage(message) {
    const { name } = message;
    switch (name) {
      case "WebDriverWorkerListenerParent:initialize": {
        // no-op
        // Logic is handled in actorCreated.
        break;
      }
      default:
        throw new Error("Unsupported message:" + name);
    }
  }

  #getWorkerDebuggerAbsoluteURL(workerDebugger) {
    // The `url` property might not be the absolute URL for the worker.
    const windowUrl = workerDebugger.window?.location?.href;
    if (windowUrl) {
      return new URL(workerDebugger.url, windowUrl).href;
    }

    // Try to read the URL on the principal instead.
    if (workerDebugger.principal?.spec) {
      return new URL(workerDebugger.url, workerDebugger.principal.spec).href;
    }

    return workerDebugger.url;
  }

  #getWorkerDetails(workerDebugger) {
    return {
      id: workerDebugger.id,
      isChrome: workerDebugger.isChrome,
      url: this.#getWorkerDebuggerAbsoluteURL(workerDebugger),
      type: workerDebugger.type,
      // Bug 2014206: The windowIDs getter on shared WorkerDebugger throws and
      // triggers content process crashes.
      windowIDs:
        workerDebugger.type !== Ci.nsIWorkerDebugger.TYPE_SHARED
          ? workerDebugger.windowIDs
          : [],
    };
  }
}
