/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { RemotePageChild } = ChromeUtils.import(
  "resource://gre/actors/RemotePageChild.jsm"
);

export class TalosTabSwitchChild extends RemotePageChild {
  actorCreated() {
    // Ignore about:blank pages that can get here.
    if (!String(this.document.location).startsWith("about:tabswitch")) {
      return;
    }

    // If an error occurs, it was probably already added by an earlier test run.
    try {
      this.addPage("about:tabswitch", {
        RPMSendQuery: ["tabswitch-do-test"],
      });
    } catch {}

    super.actorCreated();
  }

  handleEvent(event) {}

  receiveMessage(message) {
    if (message.name == "GarbageCollect") {
      this.contentWindow.windowUtils.garbageCollect();
    }
  }
}
