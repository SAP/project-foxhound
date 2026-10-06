/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AboutWelcomeTelemetry:
    "resource:///modules/aboutwelcome/AboutWelcomeTelemetry.sys.mjs",
});

ChromeUtils.defineLazyGetter(
  lazy,
  "AWTelemetry",
  () => new lazy.AboutWelcomeTelemetry()
);

export const Spotlight = {
  _dialog: null,
  _dialogWindow: null,

  get isOpen() {
    return !!this._dialog;
  },

  close(window) {
    if (!this._dialog) {
      return;
    }
    // Only close if no window specified or if the window owns the dialog
    if (!window || this._dialogWindow === window) {
      let dialog = this._dialog;
      this._dialog = null;
      this._dialogWindow = null;
      dialog.close();
    }
  },

  sendUserEventTelemetry(event, message, dispatch) {
    if (message.content?.metrics === "block") {
      return;
    }
    const data = {
      action: "spotlight_user_event",
      message_id: message.content.id,
      event,
      event_context: {},
    };
    if (message.content.write_in_microsurvey) {
      data.event_context.write_in_microsurvey = true;
    }
    dispatch({ type: "SPOTLIGHT_TELEMETRY", data });
  },

  defaultDispatch(message) {
    if (message.type === "SPOTLIGHT_TELEMETRY") {
      const { message_id, event } = message.data;
      lazy.AWTelemetry.sendTelemetry({ message_id, event });
    }
  },

  /**
   * Shows spotlight tab or window modal specific to the given browser
   *
   * @param browser             The browser for spotlight display
   * @param message             Message containing content to show
   * @param dispatchCFRAction   A function to dispatch resulting actions
   * @return                    boolean value capturing if spotlight was displayed
   */
  async showSpotlightDialog(browser, message, dispatch = this.defaultDispatch) {
    const win = browser?.documentGlobal;
    if (!win || win.gDialogBox.isOpen) {
      return false;
    }
    const spotlight_url = "chrome://browser/content/spotlight.html";

    const dispatchCFRAction =
      // This also blocks CFR impressions, which is fine for current use cases.
      message.content?.metrics === "block" ? () => {} : dispatch;

    // This handles `IMPRESSION` events used by ASRouter for frequency caps.
    // AboutWelcome handles `IMPRESSION` events for telemetry.
    this.sendUserEventTelemetry("IMPRESSION", message, dispatchCFRAction);
    dispatchCFRAction({ type: "IMPRESSION", data: message });

    let unloadHandler = () => {
      this._dialog = null;
      this._dialogWindow = null;
    };
    win.addEventListener("unload", unloadHandler, { once: true });

    try {
      if (message.content?.modal === "tab") {
        let { closedPromise, dialog } = win.gBrowser
          .getTabDialogBox(browser)
          .open(
            spotlight_url,
            {
              features: "resizable=no",
              allowDuplicateDialogs: false,
            },
            message.content
          );
        this._dialog = dialog;
        this._dialogWindow = win;
        await closedPromise;
      } else {
        let openPromise = win.gDialogBox.open(spotlight_url, message.content);
        this._dialog = win.gDialogBox.dialog;
        this._dialogWindow = win;
        await openPromise;
      }
    } finally {
      win.removeEventListener("unload", unloadHandler);
      this._dialog = null;
      this._dialogWindow = null;
    }

    // If dismissed report telemetry and exit
    this.sendUserEventTelemetry("DISMISS", message, dispatchCFRAction);
    return true;
  },
};
