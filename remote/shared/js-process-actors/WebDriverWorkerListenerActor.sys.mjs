/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { EventEmitter } from "resource://gre/modules/EventEmitter.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  Log: "chrome://remote/content/shared/Log.sys.mjs",
  truncate: "chrome://remote/content/shared/Format.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logger", () => lazy.Log.get());

let registered = false;

/**
 * Register the WorkerListener actor that will propagate worker
 * registration/unregistration events from content processes to the parent
 * process.
 *
 * Note that this will be replaced by a fully parent process solution once
 * we can switch to the RemoteWorkerDebugger / RemoteWorkerDebuggerManager via
 * Bug 1944240.
 */
export function registerWebDriverWorkerListenerActor() {
  if (registered) {
    return;
  }

  ChromeUtils.registerProcessActor("WebDriverWorkerListener", {
    kind: "JSProcessActor",
    parent: {
      esModuleURI:
        "chrome://remote/content/shared/js-process-actors/WebDriverWorkerListenerParent.sys.mjs",
    },
    child: {
      esModuleURI:
        "chrome://remote/content/shared/js-process-actors/WebDriverWorkerListenerChild.sys.mjs",
    },
    includeParent: true,
  });
  registered = true;

  // Initialize actors for all existing processes immediately.
  const domProcesses = ChromeUtils.getAllDOMProcesses();
  for (const domProcess of domProcesses) {
    domProcess.getActor("WebDriverWorkerListener").initialize();
  }

  // On ipc-content-created notification, initialize the actor for the new
  // process. Note that this is a parent process only observer notification
  // and there is no content-process early notification on process creation
  // so we cannot use the `observers` property of the actor definition.
  Services.obs.addObserver(onIpcContentCreated, "ipc:content-created");
}

export function unregisterWebDriverWorkerListenerActor() {
  if (!registered) {
    return;
  }

  Services.obs.removeObserver(onIpcContentCreated, "ipc:content-created");

  ChromeUtils.unregisterProcessActor("WebDriverWorkerListener");
  registered = false;
}

function onIpcContentCreated(subject) {
  const domProcess = subject.QueryInterface(Ci.nsIDOMProcessParent);
  domProcess.getActor("WebDriverWorkerListener").initialize();
}

class WorkerListenerRegistry extends EventEmitter {
  #workers;

  constructor() {
    super();
    this.#workers = new Map();
  }

  getWorkers() {
    return [...this.#workers.values()];
  }

  /**
   * Payload describing a worker debugger.
   *
   * @typedef {object} WorkerData
   * @property {string} id
   *     The unique id for the worker.
   * @property {number} type
   *     The type of worker, one of Ci.nsIWorkerDebugger.TYPE_DEDICATED,
   *     Ci.nsIWorkerDebugger.TYPE_SHARED, Ci.nsIWorkerDebugger.TYPE_SERVICE
   * @property {string} url
   *     The url for the worker.
   * @property {Array<string>} windowIDs
   *     An array of inner window IDs which own the worker. Array should contain
   *     a single item for dedicated workers but can contain more than one for
   *     other worker types.
   * @property {boolean=} alreadyRegistered
   *     Optional flag, only set for worker registration events. If true, the
   *     registration is a backfill notification, and not a live one.
   */

  /**
   * Notify the registry about a new worker registration.
   *
   * @param {WorkerData} data
   *     Worker debugger data.
   */
  notifyWorkerRegistered(data) {
    lazy.logger.trace(
      lazy.truncate`Worker registered: ${data.url} (type: ${data.type}, id: ${data.id},` +
        ` alreadyRegistered: ${data.alreadyRegistered})`
    );

    this.#workers.set(data.id, data);
    this.emit("worker-registered", data);
  }

  /**
   * Notify the registry about a worker unregistration.
   *
   * @param {WorkerData} data
   *     Worker debugger data.
   */
  notifyWorkerUnregistered(data) {
    lazy.logger.trace(
      lazy.truncate`Worker unregistered: ${data.url} (type: ${data.type}, id: ${data.id})`
    );

    this.#workers.delete(data.id, data);
    this.emit("worker-unregistered", data);
  }
}

// Exposed singleton to be notified of worker registration / unregistration and
// to broadcast corresponding events.
export const workerListenerRegistry = new WorkerListenerRegistry();

export function notifyWorkerRegistered(data) {
  return workerListenerRegistry.notifyWorkerRegistered(data);
}

export function notifyWorkerUnregistered(data) {
  return workerListenerRegistry.notifyWorkerUnregistered(data);
}
