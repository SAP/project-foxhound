/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { PromiseWorker } from "resource://gre/modules/workers/PromiseWorker.mjs";
import { RankShortcutsWorker } from "resource://newtab/lib/SmartShortcutsRanker/RankShortcutsWorkerClass.mjs";

const ranker = new RankShortcutsWorker();

const worker = new PromiseWorker.AbstractWorker();
worker.dispatch = (method, args = []) => ranker[method](...args);
worker.postMessage = (msg, ...transfers) => self.postMessage(msg, ...transfers);
worker.close = () => self.close();

self.addEventListener("message", msg => worker.handleMessage(msg));
self.addEventListener("unhandledrejection", error => {
  throw error.reason;
});
