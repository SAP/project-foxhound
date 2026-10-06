/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const FILE_PICKER_HANDLER_CID = Services.uuid.generateUUID();
const FILE_PICKER_CONTRACT_ID = "@mozilla.org/filepicker;1";

/**
 * The FilePickerHandler can override the default component factory for the file
 * picker to prevent showing file pickers if needed.
 */
class FilePickerHandlerClass {
  #callers;
  #originalFilePickerCID;
  #registrar;
  #registeredFactory;

  constructor() {
    this.#registeredFactory = null;

    this.#registrar = Components.manager.QueryInterface(
      Ci.nsIComponentRegistrar
    );
    this.#originalFilePickerCID = this.#registrar.contractIDToCID(
      FILE_PICKER_CONTRACT_ID
    );

    // Set to keep track of all callers which requested to handle file pickers.
    this.#callers = new Set();
  }

  /**
   * Stop requesting to dismiss all file pickers on behalf of the provided
   * caller.
   * Note that file pickers will only be displayed again once all callers
   * called allowFilePickers.
   *
   * @param {object} caller
   *     A reference to identify the caller which requested to dismiss pickers.
   */
  allowFilePickers(caller) {
    if (!this.#callers.has(caller)) {
      return;
    }

    this.#callers.delete(caller);

    if (this.#callers.size || !this.#registeredFactory) {
      return;
    }

    // Unregister our proxy factory.
    this.#registrar.unregisterFactory(
      FILE_PICKER_HANDLER_CID,
      this.#registeredFactory
    );
    this.#registeredFactory = null;

    // Restore the original factory.
    this.#registrar.registerFactory(
      this.#originalFilePickerCID,
      "",
      FILE_PICKER_CONTRACT_ID,
      null
    );
  }

  /**
   * Request to dismiss all file picker dialogs by registering a custom file
   * picker factory instead of the default one.
   *
   * @param {object} caller
   *     A reference to identify the caller which requested to dismiss pickers.
   */
  dismissFilePickers(caller) {
    this.#callers.add(caller);

    if (this.#registeredFactory) {
      return;
    }

    this.#registeredFactory = {
      createInstance(iid) {
        const filePickerProxy = {
          init() {},
          open: openCallback => {
            openCallback.done(Ci.nsIFilePicker.returnCancel);
          },
          displayDirectory: null,
          file: null,
          QueryInterface: ChromeUtils.generateQI(["nsIFilePicker"]),
        };
        return filePickerProxy.QueryInterface(iid);
      },
      QueryInterface: ChromeUtils.generateQI(["nsIFactory"]),
    };

    this.#registrar.registerFactory(
      FILE_PICKER_HANDLER_CID,
      "WebDriver FilePicker handler",
      FILE_PICKER_CONTRACT_ID,
      this.#registeredFactory
    );
  }
}

// Expose a singleton shared by all WebDriver sessions.
// The FilePickerHandler factory should only be registered once at most.
export const FilePickerHandler = new FilePickerHandlerClass();
