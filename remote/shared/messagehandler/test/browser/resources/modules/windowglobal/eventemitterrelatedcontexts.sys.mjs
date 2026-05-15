/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Module } from "chrome://remote/content/shared/messagehandler/Module.sys.mjs";

class EventEmitterRelatedContextsModule extends Module {
  destroy() {}

  emitTestEventWithRelatedContexts(params) {
    const { relatedBrowsingContextIds } = params;
    const text = `event from ${this.messageHandler.contextId}`;
    const relatedContexts = relatedBrowsingContextIds.map(contextId => ({
      contextId,
      type: this.messageHandler.constructor.type,
    }));
    this.emitEvent(
      "eventemitterrelatedcontexts.testEvent",
      { text },
      relatedContexts
    );
  }
}

export const eventemitterrelatedcontexts = EventEmitterRelatedContextsModule;
