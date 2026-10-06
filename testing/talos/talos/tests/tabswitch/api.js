/* globals ExtensionAPI, Services */

ChromeUtils.defineESModuleGetters(this, {
  AboutNewTab: "resource:///modules/AboutNewTab.sys.mjs",
});

this.tabswitch = class extends ExtensionAPI {
  getAPI(context) {
    return {
      tabswitch: {
        setup() {
          AboutNewTab.newTabURL = "about:blank";

          let uri = Services.io.newURI(
            "actors/",
            null,
            context.extension.rootURI
          );
          let resProto = Services.io
            .getProtocolHandler("resource")
            .QueryInterface(Ci.nsIResProtocolHandler);
          resProto.setSubstitution("talos-tabswitch", uri);

          const processScriptURL = context.extension.baseURI.resolve(
            "content/tabswitch-content-process.js"
          );
          Services.ppmm.loadProcessScript(processScriptURL, true);

          ChromeUtils.registerWindowActor("TalosTabSwitch", {
            parent: {
              esModuleURI:
                "resource://talos-tabswitch/TalosTabSwitchParent.sys.mjs",
            },
            child: {
              esModuleURI:
                "resource://talos-tabswitch/TalosTabSwitchChild.sys.mjs",
              events: {
                DOMDocElementInserted: { capture: true },
              },
            },
          });

          return () => {
            Services.ppmm.sendAsyncMessage("Tabswitch:Teardown");
            ChromeUtils.unregisterWindowActor("TalosTabSwitch");
            AboutNewTab.resetNewTabURL();
            resProto.setSubstitution("talos-tabswitch", null);
          };
        },
      },
    };
  }
};
