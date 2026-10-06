/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  DownloadPaths: "resource://gre/modules/DownloadPaths.sys.mjs",
  Downloads: "resource://gre/modules/Downloads.sys.mjs",
  FileUtils: "resource://gre/modules/FileUtils.sys.mjs",
});

const HELPER_APP_DIALOG_HANDLER_CID = Services.uuid.generateUUID();
const HELPER_APP_DIALOG_CONTRACT_ID = "@mozilla.org/helperapplauncherdialog;1";

async function computeTargetFile(
  aLauncher,
  aDefaultFileName,
  aSuggestedFileExtension
) {
  let targetDir;
  const browsingContextId = aLauncher.browsingContextId;
  if (browsingContextId) {
    try {
      const bc = BrowsingContext.get(browsingContextId);
      const folderOverride = bc?.top?.downloadFolderOverride;
      if (folderOverride) {
        targetDir = folderOverride;
      }
    } catch (e) {
      // BrowsingContext may have been destroyed.
    }
  }

  if (!targetDir) {
    targetDir = await lazy.Downloads.getPreferredDownloadsDirectory();
  }

  let leafName;
  if (aDefaultFileName) {
    leafName = lazy.DownloadPaths.sanitize(aDefaultFileName, {
      compressWhitespaces: true,
    });
  }

  if (!leafName) {
    const ext = aSuggestedFileExtension || "";
    leafName = "unnamed" + ext;
  }

  const dir = new lazy.FileUtils.File(targetDir);
  dir.append(leafName);
  return lazy.DownloadPaths.createNiceUniqueFile(dir);
}

/**
 * The HelperAppDialogHandler can override the default component factory for
 * nsIHelperAppLauncherDialog to silently save downloads without showing UI
 * when WebDriver controls download behavior.
 * See the main implementation in https://searchfox.org/firefox-main/source/toolkit/mozapps/downloads/HelperAppDlg.sys.mjs.
 */
class HelperAppDialogHandlerClass {
  #callers;
  #originalCID;
  #registeredFactory;
  #registrar;

  constructor() {
    this.#registeredFactory = null;

    this.#registrar = Components.manager.QueryInterface(
      Ci.nsIComponentRegistrar
    );
    this.#originalCID = this.#registrar.contractIDToCID(
      HELPER_APP_DIALOG_CONTRACT_ID
    );

    this.#callers = new Set();
  }

  /**
   * Stop intercepting helper app launcher dialogs on behalf of the provided
   * caller. Dialogs will only be restored once all callers have called
   * restoreDialogs.
   *
   * @param {object} caller
   */
  restoreDialogs(caller) {
    if (!this.#callers.has(caller)) {
      return;
    }

    this.#callers.delete(caller);

    if (!this.#registeredFactory) {
      return;
    }

    if (this.#callers.size) {
      return;
    }

    this.#registrar.unregisterFactory(
      HELPER_APP_DIALOG_HANDLER_CID,
      this.#registeredFactory
    );
    this.#registeredFactory = null;

    this.#registrar.registerFactory(
      this.#originalCID,
      "",
      HELPER_APP_DIALOG_CONTRACT_ID,
      null
    );
  }

  /**
   * Intercept all helper app launcher dialogs by registering a custom factory
   * that silently saves downloads instead of showing UI.
   *
   * @param {object} caller
   */
  interceptDialogs(caller) {
    this.#callers.add(caller);

    if (this.#registeredFactory) {
      return;
    }

    this.#registeredFactory = {
      createInstance(iid) {
        const proxy = {
          show(aLauncher, _aContext, _aReason) {
            aLauncher.promptForSaveDestination();
          },

          promptForSaveToFileAsync(
            aLauncher,
            _aContext,
            aDefaultFileName,
            aSuggestedFileExtension,
            _aForcePrompt
          ) {
            computeTargetFile(
              aLauncher,
              aDefaultFileName,
              aSuggestedFileExtension
            ).then(
              file => aLauncher.saveDestinationAvailable(file),
              () => aLauncher.saveDestinationAvailable(null)
            );
          },

          QueryInterface: ChromeUtils.generateQI([
            "nsIHelperAppLauncherDialog",
          ]),
        };
        return proxy.QueryInterface(iid);
      },
      QueryInterface: ChromeUtils.generateQI(["nsIFactory"]),
    };

    this.#registrar.registerFactory(
      HELPER_APP_DIALOG_HANDLER_CID,
      "WebDriver HelperAppLauncherDialog handler",
      HELPER_APP_DIALOG_CONTRACT_ID,
      this.#registeredFactory
    );
  }
}

// Expose a singleton shared by all WebDriver sessions.
export const HelperAppDialogHandler = new HelperAppDialogHandlerClass();
