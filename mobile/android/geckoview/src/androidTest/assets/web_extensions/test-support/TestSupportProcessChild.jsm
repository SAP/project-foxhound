/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["TestSupportProcessChild"];

const { GeckoViewUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/GeckoViewUtils.sys.mjs"
);

const ProcessTools = Cc["@mozilla.org/processtools-service;1"].getService(
  Ci.nsIProcessToolsService
);

class TestSupportProcessChild extends JSProcessActorChild {
  receiveMessage(aMsg) {
    debug`receiveMessage: ${aMsg.name}`;

    switch (aMsg.name) {
      case "KillContentProcess":
        ProcessTools.kill(Services.appinfo.processID);
    }
  }
}

const { debug } = GeckoViewUtils.initLogging("TestSupportProcess[C]");
