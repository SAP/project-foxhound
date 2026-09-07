/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  notifyWorkerRegistered:
    "chrome://remote/content/shared/js-process-actors/WebDriverWorkerListenerActor.sys.mjs",
  notifyWorkerUnregistered:
    "chrome://remote/content/shared/js-process-actors/WebDriverWorkerListenerActor.sys.mjs",
});

export class WebDriverWorkerListenerParent extends JSProcessActorParent {
  initialize() {
    this.sendAsyncMessage("WebDriverWorkerListenerParent:initialize");
  }

  async receiveMessage(message) {
    const { data, name } = message;

    switch (name) {
      case "WebDriverWorkerListenerChild:workerRegistered": {
        lazy.notifyWorkerRegistered(data);
        break;
      }
      case "WebDriverWorkerListenerChild:workerUnregistered": {
        lazy.notifyWorkerUnregistered(data);
        break;
      }
      default:
        throw new Error("Unsupported message:" + name);
    }
  }
}
