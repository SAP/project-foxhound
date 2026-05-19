"use strict";

this.tainting = class extends ExtensionAPI {
  getAPI(context) {
    const { extension } = context;

    return {
      tainting: {
        getTaintExportUrl() {
            return Services.prefs.getStringPref("tainting.export.url", "");
        },
        getTaintExportSingleMode() {
            return Services.prefs.getBoolPref("tainting.export.single", false);
        }
      },
    };
  }
};