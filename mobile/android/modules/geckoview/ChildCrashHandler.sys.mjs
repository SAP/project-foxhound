/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewUtils } from "resource://gre/modules/GeckoViewUtils.sys.mjs";
import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  EventDispatcher: "resource://gre/modules/Messaging.sys.mjs",
});

const { debug, warn } = GeckoViewUtils.initLogging("ChildCrashHandler");

function getDir(name) {
  const uAppDataPath = Services.dirsvc.get("UAppData", Ci.nsIFile).path;
  return PathUtils.join(uAppDataPath, "Crash Reports", name);
}

function getPendingMinidump(id) {
  const pendingDir = getDir("pending");

  return [".dmp", ".extra"].map(suffix => {
    return PathUtils.join(pendingDir, `${id}${suffix}`);
  });
}

export var ChildCrashHandler = {
  // Map a child ID to a remote type.
  childMap: new Map(),

  // The event listener for this is hooked up in GeckoViewStartup.jsm
  observe(aSubject, aTopic, aData) {
    const childID = aData;

    switch (aTopic) {
      case "process-type-set":
      // Intentional fall-through
      case "ipc:content-created": {
        const pp = aSubject.QueryInterface(Ci.nsIDOMProcessParent);
        this.childMap.set(childID, pp.remoteType);
        break;
      }

      case "ipc:content-shutdown":
      // Intentional fall-through
      case "compositor:process-aborted": {
        aSubject.QueryInterface(Ci.nsIPropertyBag2);

        const disableReporting = Services.env.get(
          "MOZ_CRASHREPORTER_NO_REPORT"
        );

        if (
          !aSubject.get("abnormal") ||
          !AppConstants.MOZ_CRASHREPORTER ||
          disableReporting
        ) {
          return;
        }

        // If dumpID is empty the process was likely killed by the system and
        // we therefore do not want to report the crash. This includes most
        // "expected" extensions process crashes on Android.
        const dumpID = aSubject.get("dumpID");
        if (!dumpID) {
          Services.telemetry
            .getHistogramById("FX_CONTENT_CRASH_DUMP_UNAVAILABLE")
            .add(1);
          return;
        }

        debug`Notifying child process crash, dump ID ${dumpID}`;
        const [minidumpPath, extrasPath] = getPendingMinidump(dumpID);

        let remoteType = this.childMap.get(childID);
        this.childMap.delete(childID);

        if (remoteType?.length) {
          // Only send the remote type prefix since everything after a "=" is
          // dynamic, and used to control the process pool to use.
          remoteType = remoteType.split("=")[0];
        }

        // Report GPU and extension process crashes as occuring in a background
        // process, and others as foreground.
        const processType =
          aTopic === "compositor:process-aborted" || remoteType === "extension"
            ? "BACKGROUND_CHILD"
            : "FOREGROUND_CHILD";

        lazy.EventDispatcher.instance.sendRequest({
          type: "GeckoView:ChildCrashReport",
          minidumpPath,
          extrasPath,
          success: true,
          fatal: false,
          processType,
          remoteType,
        });

        break;
      }
    }
  },
};
