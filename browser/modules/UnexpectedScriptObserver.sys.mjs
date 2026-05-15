/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  EveryWindow: "resource:///modules/EveryWindow.sys.mjs",
});

const NOTIFICATION_VALUE = "unexpected-script-notification";

export let UnexpectedScriptObserver = {
  // EveryWindow has a race condition in early startup where a callback may be called twice
  // for the same window. This WeakSet is used to track which windows have already been
  // handled to avoid showing the notification bar multiple times. See Bug 1982859
  _windowsHandled: new WeakSet(),

  _notificationHasBeenShown: false,

  async observe(aSubject, aTopic, aScriptName) {
    if (
      aTopic != "UnexpectedJavaScriptLoad-Live" &&
      aTopic != "UnexpectedJavaScriptLoad-ResetNotification" &&
      aTopic != "UnexpectedJavaScriptLoad-UserTookAction"
    ) {
      return;
    }

    if (aTopic == "UnexpectedJavaScriptLoad-ResetNotification") {
      this._notificationHasBeenShown = false;
      this._windowsHandled = new WeakSet();
      return;
    }

    if (aTopic == "UnexpectedJavaScriptLoad-UserTookAction") {
      lazy.EveryWindow.unregisterCallback("UnexpectedScriptLoadPanel");
      return;
    }

    if (
      Services.prefs.getBoolPref(
        "security.hide_parent_unrestricted_js_loads_warning.temporary",
        false
      )
    ) {
      return;
    }

    if (this._notificationHasBeenShown) {
      // There is already a notification bar, or we showed one in the past and we
      // won't show it again until browser restart
      return;
    }

    GleanPings.unexpectedScriptLoad.setEnabled(true);

    let scriptOrigin;
    try {
      let scriptUrl = new URL(aScriptName);
      scriptOrigin = scriptUrl.hostname;

      if (scriptUrl.protocol != "http:" && scriptUrl.protocol != "https:") {
        // For this dialog, we only care about loading scripts from web origins
        return;
      }
    } catch (e) {
      console.error("Invalid scriptName URL:", aScriptName);
      // For this dialog, we only care about loading scripts from web origins,
      // so if we couldn't parse it, just exit.
      return;
    }

    lazy.EveryWindow.registerCallback(
      "UnexpectedScriptLoadPanel",
      async window => {
        if (this._windowsHandled.has(window)) {
          return;
        }
        this._windowsHandled.add(window);

        let MozXULElement = window.MozXULElement;
        let document = window.document;

        MozXULElement.insertFTLIfNeeded("browser/unexpectedScript.ftl");
        let messageFragment = document.createDocumentFragment();
        let message = document.createElement("span");
        document.l10n.setAttributes(message, "unexpected-script-load-message", {
          origin: scriptOrigin,
        });
        messageFragment.appendChild(message);

        // ----------------------------------------------------------------
        let openWindow = action => {
          let args = {
            action,
            scriptName: aScriptName,
          };
          window.gDialogBox.open(
            "chrome://browser/content/security/unexpectedScriptLoad.xhtml",
            args
          );
        };

        // ----------------------------------------------------------------
        let buttons = [
          {
            supportPage: "unexpected-script-load",
            callback: () => {
              Glean.unexpectedScriptLoad.moreInfoOpened.record();
            },
          },
        ];
        buttons.push({
          "l10n-id": "unexpected-script-load-message-button-allow",
          callback: () => {
            openWindow("allow");
            return true;
          },
        });
        buttons.push({
          "l10n-id": "unexpected-script-load-message-button-block",
          callback: () => {
            openWindow("block");
            return true; // Do not close the dialog bar until the user has done so explcitly or taken an action
          },
        });

        let notificationBox = window.gNotificationBox;

        if (!notificationBox.getNotificationWithValue(NOTIFICATION_VALUE)) {
          await notificationBox.appendNotification(
            NOTIFICATION_VALUE,
            {
              label: messageFragment,
              priority: notificationBox.PRIORITY_WARNING_HIGH,
              eventCallback: event => {
                if (event == "dismissed") {
                  Glean.unexpectedScriptLoad.infobarDismissed.record();
                  GleanPings.unexpectedScriptLoad.submit();
                }
              },
            },
            buttons
          );
        }
      },
      // Unregister Callback:
      // This is needed to remove the notification bar from all the windows
      // once the user has taken action on one of them, and ensure any open
      // dialog box is also closed.
      async window => {
        window.gNotificationBox
          .getNotificationWithValue(NOTIFICATION_VALUE)
          ?.close();
        if (
          window.gDialogBox?.dialog?._openedURL ==
          "chrome://browser/content/security/unexpectedScriptLoad.xhtml"
        ) {
          window.gDialogBox.dialog.close();
        }
        GleanPings.unexpectedScriptLoad.submit();
      }
    );

    Glean.unexpectedScriptLoad.infobarShown.record();

    this._notificationHasBeenShown = true;
  },
};
