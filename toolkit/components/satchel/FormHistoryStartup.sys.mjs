/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  FormHistory: "resource://gre/modules/FormHistory.sys.mjs",
});

export class FormHistoryStartup {
  classID = Components.ID("{3A0012EB-007F-4BB8-AA81-A07385F77A25}");

  QueryInterface = ChromeUtils.generateQI([
    "nsIObserver",
    "nsISupportsWeakReference",
  ]);

  observe(_subject, topic, _data) {
    switch (topic) {
      case "idle-daily":
      case "formhistory-expire-now":
        lazy.FormHistory.expireOldEntries().catch(console.error);
        break;
      case "profile-after-change":
        this.init();
        break;
    }
  }

  init() {
    if (this.inited) {
      return;
    }
    this.inited = true;

    // triggers needed service cleanup and db shutdown
    Services.obs.addObserver(this, "idle-daily", true);
    Services.obs.addObserver(this, "formhistory-expire-now", true);
  }
}
