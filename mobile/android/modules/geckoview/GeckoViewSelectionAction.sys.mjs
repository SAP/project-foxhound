/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewModule } from "resource://gre/modules/GeckoViewModule.sys.mjs";

export class GeckoViewSelectionAction extends GeckoViewModule {
  onEnable() {
    debug`onEnable`;
    this.registerListener(["GeckoView:ExecuteSelectionAction"]);
  }

  onDisable() {
    debug`onDisable`;
    this.unregisterListener();
  }

  get actor() {
    return this.getActor("SelectionActionDelegate");
  }

  // Bundle event handler.
  onEvent(aEvent, aData) {
    debug`onEvent: ${aEvent}`;

    switch (aEvent) {
      case "GeckoView:ExecuteSelectionAction": {
        this.actor.executeSelectionAction(aData);
      }
    }
  }
}

const { debug, warn } = GeckoViewSelectionAction.initLogging(
  "GeckoViewSelectionAction"
);
