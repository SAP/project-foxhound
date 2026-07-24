/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * A JSWindowActor that is responsible for marshalling information between
 * the BackupService singleton and any registered UI widgets that need to
 * represent data from that service. Any UI widgets that want to receive
 * state updates from BackupService should emit a BackupUI:InitWidget
 * event in a document that this actor pair is registered for.
 */
export class BackupUIChild extends JSWindowActorChild {
  #inittedWidgets = new WeakSet();

  /**
   * Handles custom events fired by widgets that want to register with
   * BackupUIChild.
   *
   * @param {Event} event
   *   The custom event that the widget fired.
   */
  async handleEvent(event) {
    /**
     * BackupUI:InitWidget sends a message to the parent to request the BackupService state
     * which will result in a `backupServiceState` property of the widget to be set when that
     * state is received. Subsequent state updates will also cause that state property to
     * be set.
     */
    if (event.type == "BackupUI:InitWidget") {
      this.#inittedWidgets.add(event.target);
      this.sendAsyncMessage("RequestState");
    } else if (event.type == "BackupUI:TriggerCreateBackup") {
      let result = await this.sendQuery("TriggerCreateBackup", event.detail);

      if (!result.success) {
        event.target.backupErrorCode = result.errorCode;
      }
    } else if (event.type == "BackupUI:EnableScheduledBackups") {
      const target = event.target;

      const result = await this.sendQuery(
        "EnableScheduledBackups",
        event.detail
      );
      if (result.success) {
        target.close();
      } else {
        target.enableBackupErrorCode = result.errorCode;
      }
    } else if (event.type == "BackupUI:DisableScheduledBackups") {
      const target = event.target;

      this.sendAsyncMessage("DisableScheduledBackups", event.detail);
      // backups will always end up disabled even if there was an error
      // with other bookkeeping related to turning off backups

      target.close();
    } else if (event.type == "BackupUI:ShowFilepicker") {
      let targetNodeName = event.composedTarget.nodeName;
      let { path, filename, iconURL } = await this.sendQuery("ShowFilepicker", {
        win: event.detail?.win,
        filter: event.detail?.filter,
        existingBackupPath: event.detail?.existingBackupPath,
      });

      let widgets = ChromeUtils.nondeterministicGetWeakSetKeys(
        this.#inittedWidgets
      );

      for (let widget of widgets) {
        if (widget.isConnected && widget.nodeName == targetNodeName) {
          const win = widget.ownerGlobal;
          // Using Cu.cloneInto here allows us to embed components that use this event
          // in non-parent-processes such as about:welcome
          const detail = Cu.cloneInto({ path, filename, iconURL }, win, {
            wrapReflectors: true,
          });
          const event = new win.CustomEvent(
            "BackupUI:SelectNewFilepickerPath",
            {
              bubbles: true,
              composed: true,
              detail,
            }
          );
          widget.dispatchEvent(event);
          break;
        }
      }
    } else if (event.type == "BackupUI:GetBackupFileInfo") {
      let { backupFile } = event.detail;
      this.sendAsyncMessage("GetBackupFileInfo", {
        backupFile,
      });
    } else if (event.type == "BackupUI:RestoreFromBackupFile") {
      let { backupFile, backupPassword } = event.detail;
      let result = await this.sendQuery("RestoreFromBackupFile", {
        backupFile,
        backupPassword,
      });

      if (result.success) {
        event.target.restoreFromBackupDialogEl?.close();

        // Since we always launch the new profile from this event, let's close the current instance now
        this.sendAsyncMessage("QuitCurrentProfile");
      }
    } else if (event.type == "BackupUI:RestoreFromBackupChooseFile") {
      this.sendAsyncMessage("RestoreFromBackupChooseFile");
    } else if (event.type == "BackupUI:EnableEncryption") {
      const target = event.target;

      const result = await this.sendQuery("EnableEncryption", event.detail);
      if (result.success) {
        target.close();
      } else {
        target.enableEncryptionErrorCode = result.errorCode;
      }
    } else if (event.type == "BackupUI:DisableEncryption") {
      const target = event.target;

      const result = await this.sendQuery("DisableEncryption", event.detail);
      if (result.success) {
        target.close();
      } else {
        target.disableEncryptionErrorCode = result.errorCode;
      }
    } else if (event.type == "BackupUI:ShowBackupLocation") {
      this.sendAsyncMessage("ShowBackupLocation");
    } else if (event.type == "BackupUI:EditBackupLocation") {
      this.sendAsyncMessage("EditBackupLocation");
    } else if (event.type == "BackupUI:SetEmbeddedComponentPersistentData") {
      this.sendAsyncMessage("SetEmbeddedComponentPersistentData", event.detail);
    } else if (event.type == "BackupUI:FlushEmbeddedComponentPersistentData") {
      this.sendAsyncMessage("FlushEmbeddedComponentPersistentData");
    } else if (event.type == "BackupUI:ErrorBarDismissed") {
      this.sendAsyncMessage("ErrorBarDismissed");
    }
  }

  /**
   * Handles messages sent by BackupUIParent.
   *
   * @param {ReceiveMessageArgument} message
   *   The message received from the BackupUIParent.
   */
  receiveMessage(message) {
    if (message.name == "StateUpdate") {
      let widgets = ChromeUtils.nondeterministicGetWeakSetKeys(
        this.#inittedWidgets
      );
      for (let widget of widgets) {
        if (!widget.isConnected || !widget.ownerGlobal) {
          continue;
        }

        const state = Cu.cloneInto(message.data.state, widget.ownerGlobal);

        const waivedWidget = Cu.waiveXrays(widget);
        waivedWidget.backupServiceState = state;
        //dispatch the event for the React listeners
        widget.dispatchEvent(
          new this.contentWindow.CustomEvent("BackupUI:StateWasUpdated", {
            bubbles: true,
            composed: true,
            detail: { state },
          })
        );
      }
    }
  }
}
