/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file is loaded into the browser window scope.
/* eslint-env mozilla/browser-window */

const lazy = {};

ChromeUtils.defineModuleGetter(
  lazy,
  "ExtensionParent",
  "resource://gre/modules/ExtensionParent.jsm"
);
ChromeUtils.defineModuleGetter(
  lazy,
  "OriginControls",
  "resource://gre/modules/ExtensionPermissions.jsm"
);
ChromeUtils.defineModuleGetter(
  lazy,
  "ExtensionPermissions",
  "resource://gre/modules/ExtensionPermissions.jsm"
);
ChromeUtils.defineESModuleGetters(lazy, {
  SITEPERMS_ADDON_TYPE:
    "resource://gre/modules/addons/siteperms-addon-utils.sys.mjs",
});

customElements.define(
  "addon-progress-notification",
  class MozAddonProgressNotification extends customElements.get(
    "popupnotification"
  ) {
    show() {
      super.show();
      this.progressmeter = document.getElementById(
        "addon-progress-notification-progressmeter"
      );

      this.progresstext = document.getElementById(
        "addon-progress-notification-progresstext"
      );

      if (!this.notification) {
        return;
      }

      this.notification.options.installs.forEach(function(aInstall) {
        aInstall.addListener(this);
      }, this);

      // Calling updateProgress can sometimes cause this notification to be
      // removed in the middle of refreshing the notification panel which
      // makes the panel get refreshed again. Just initialise to the
      // undetermined state and then schedule a proper check at the next
      // opportunity
      this.setProgress(0, -1);
      this._updateProgressTimeout = setTimeout(
        this.updateProgress.bind(this),
        0
      );
    }

    disconnectedCallback() {
      this.destroy();
    }

    destroy() {
      if (!this.notification) {
        return;
      }
      this.notification.options.installs.forEach(function(aInstall) {
        aInstall.removeListener(this);
      }, this);

      clearTimeout(this._updateProgressTimeout);
    }

    setProgress(aProgress, aMaxProgress) {
      if (aMaxProgress == -1) {
        this.progressmeter.removeAttribute("value");
      } else {
        this.progressmeter.setAttribute(
          "value",
          (aProgress * 100) / aMaxProgress
        );
      }

      let now = Date.now();

      if (!this.notification.lastUpdate) {
        this.notification.lastUpdate = now;
        this.notification.lastProgress = aProgress;
        return;
      }

      let delta = now - this.notification.lastUpdate;
      if (delta < 400 && aProgress < aMaxProgress) {
        return;
      }

      // Set min. time delta to avoid division by zero in the upcoming speed calculation
      delta = Math.max(delta, 400);
      delta /= 1000;

      // This algorithm is the same used by the downloads code.
      let speed = (aProgress - this.notification.lastProgress) / delta;
      if (this.notification.speed) {
        speed = speed * 0.9 + this.notification.speed * 0.1;
      }

      this.notification.lastUpdate = now;
      this.notification.lastProgress = aProgress;
      this.notification.speed = speed;

      let status = null;
      [status, this.notification.last] = DownloadUtils.getDownloadStatus(
        aProgress,
        aMaxProgress,
        speed,
        this.notification.last
      );
      this.progresstext.setAttribute("value", status);
      this.progresstext.setAttribute("tooltiptext", status);
    }

    cancel() {
      let installs = this.notification.options.installs;
      installs.forEach(function(aInstall) {
        try {
          aInstall.cancel();
        } catch (e) {
          // Cancel will throw if the download has already failed
        }
      }, this);

      PopupNotifications.remove(this.notification);
    }

    updateProgress() {
      if (!this.notification) {
        return;
      }

      let downloadingCount = 0;
      let progress = 0;
      let maxProgress = 0;

      this.notification.options.installs.forEach(function(aInstall) {
        if (aInstall.maxProgress == -1) {
          maxProgress = -1;
        }
        progress += aInstall.progress;
        if (maxProgress >= 0) {
          maxProgress += aInstall.maxProgress;
        }
        if (aInstall.state < AddonManager.STATE_DOWNLOADED) {
          downloadingCount++;
        }
      });

      if (downloadingCount == 0) {
        this.destroy();
        this.progressmeter.removeAttribute("value");
        let status = gNavigatorBundle.getString("addonDownloadVerifying");
        this.progresstext.setAttribute("value", status);
        this.progresstext.setAttribute("tooltiptext", status);
      } else {
        this.setProgress(progress, maxProgress);
      }
    }

    onDownloadProgress() {
      this.updateProgress();
    }

    onDownloadFailed() {
      this.updateProgress();
    }

    onDownloadCancelled() {
      this.updateProgress();
    }

    onDownloadEnded() {
      this.updateProgress();
    }
  }
);

// Removes a doorhanger notification if all of the installs it was notifying
// about have ended in some way.
function removeNotificationOnEnd(notification, installs) {
  let count = installs.length;

  function maybeRemove(install) {
    install.removeListener(this);

    if (--count == 0) {
      // Check that the notification is still showing
      let current = PopupNotifications.getNotification(
        notification.id,
        notification.browser
      );
      if (current === notification) {
        notification.remove();
      }
    }
  }

  for (let install of installs) {
    install.addListener({
      onDownloadCancelled: maybeRemove,
      onDownloadFailed: maybeRemove,
      onInstallFailed: maybeRemove,
      onInstallEnded: maybeRemove,
    });
  }
}

var gXPInstallObserver = {
  _findChildShell(aDocShell, aSoughtShell) {
    if (aDocShell == aSoughtShell) {
      return aDocShell;
    }

    var node = aDocShell.QueryInterface(Ci.nsIDocShellTreeItem);
    for (var i = 0; i < node.childCount; ++i) {
      var docShell = node.getChildAt(i);
      docShell = this._findChildShell(docShell, aSoughtShell);
      if (docShell == aSoughtShell) {
        return docShell;
      }
    }
    return null;
  },

  _getBrowser(aDocShell) {
    for (let browser of gBrowser.browsers) {
      if (this._findChildShell(browser.docShell, aDocShell)) {
        return browser;
      }
    }
    return null;
  },

  pendingInstalls: new WeakMap(),

  showInstallConfirmation(browser, installInfo, height = undefined) {
    // If the confirmation notification is already open cache the installInfo
    // and the new confirmation will be shown later
    if (
      PopupNotifications.getNotification("addon-install-confirmation", browser)
    ) {
      let pending = this.pendingInstalls.get(browser);
      if (pending) {
        pending.push(installInfo);
      } else {
        this.pendingInstalls.set(browser, [installInfo]);
      }
      return;
    }

    let showNextConfirmation = () => {
      // Make sure the browser is still alive.
      if (!gBrowser.browsers.includes(browser)) {
        return;
      }

      let pending = this.pendingInstalls.get(browser);
      if (pending && pending.length) {
        this.showInstallConfirmation(browser, pending.shift());
      }
    };

    // If all installs have already been cancelled in some way then just show
    // the next confirmation
    if (
      installInfo.installs.every(i => i.state != AddonManager.STATE_DOWNLOADED)
    ) {
      showNextConfirmation();
      return;
    }

    // Make notifications persistent
    var options = {
      displayURI: installInfo.originatingURI,
      persistent: true,
      hideClose: true,
      popupOptions: {
        position: "bottomright topright",
      },
    };

    let acceptInstallation = () => {
      for (let install of installInfo.installs) {
        install.install();
      }
      installInfo = null;

      Services.telemetry
        .getHistogramById("SECURITY_UI")
        .add(
          Ci.nsISecurityUITelemetry.WARNING_CONFIRM_ADDON_INSTALL_CLICK_THROUGH
        );
    };

    let cancelInstallation = () => {
      if (installInfo) {
        for (let install of installInfo.installs) {
          // The notification may have been closed because the add-ons got
          // cancelled elsewhere, only try to cancel those that are still
          // pending install.
          if (install.state != AddonManager.STATE_CANCELLED) {
            install.cancel();
          }
        }
      }

      showNextConfirmation();
    };

    let unsigned = installInfo.installs.filter(
      i => i.addon.signedState <= AddonManager.SIGNEDSTATE_MISSING
    );
    let someUnsigned =
      !!unsigned.length && unsigned.length < installInfo.installs.length;

    options.eventCallback = aEvent => {
      switch (aEvent) {
        case "removed":
          cancelInstallation();
          break;
        case "shown":
          let addonList = document.getElementById(
            "addon-install-confirmation-content"
          );
          while (addonList.firstChild) {
            addonList.firstChild.remove();
          }

          for (let install of installInfo.installs) {
            let container = document.createXULElement("hbox");

            let name = document.createXULElement("label");
            name.setAttribute("value", install.addon.name);
            name.setAttribute("class", "addon-install-confirmation-name");
            container.appendChild(name);

            if (
              someUnsigned &&
              install.addon.signedState <= AddonManager.SIGNEDSTATE_MISSING
            ) {
              let unsignedLabel = document.createXULElement("label");
              unsignedLabel.setAttribute(
                "value",
                gNavigatorBundle.getString("addonInstall.unsigned")
              );
              unsignedLabel.setAttribute(
                "class",
                "addon-install-confirmation-unsigned"
              );
              container.appendChild(unsignedLabel);
            }

            addonList.appendChild(container);
          }
          break;
      }
    };

    options.learnMoreURL = Services.urlFormatter.formatURLPref(
      "app.support.baseURL"
    );

    let messageString;
    let notification = document.getElementById(
      "addon-install-confirmation-notification"
    );
    if (unsigned.length == installInfo.installs.length) {
      // None of the add-ons are verified
      messageString = gNavigatorBundle.getString(
        "addonConfirmInstallUnsigned.message"
      );
      notification.setAttribute("warning", "true");
      options.learnMoreURL += "unsigned-addons";
    } else if (!unsigned.length) {
      // All add-ons are verified or don't need to be verified
      messageString = gNavigatorBundle.getString("addonConfirmInstall.message");
      notification.removeAttribute("warning");
      options.learnMoreURL += "find-and-install-add-ons";
    } else {
      // Some of the add-ons are unverified, the list of names will indicate
      // which
      messageString = gNavigatorBundle.getString(
        "addonConfirmInstallSomeUnsigned.message"
      );
      notification.setAttribute("warning", "true");
      options.learnMoreURL += "unsigned-addons";
    }

    let brandBundle = document.getElementById("bundle_brand");
    let brandShortName = brandBundle.getString("brandShortName");

    messageString = PluralForm.get(installInfo.installs.length, messageString);
    messageString = messageString.replace("#1", brandShortName);
    messageString = messageString.replace("#2", installInfo.installs.length);

    let action = {
      label: gNavigatorBundle.getString("addonInstall.acceptButton2.label"),
      accessKey: gNavigatorBundle.getString(
        "addonInstall.acceptButton2.accesskey"
      ),
      callback: acceptInstallation,
    };

    let secondaryAction = {
      label: gNavigatorBundle.getString("addonInstall.cancelButton.label"),
      accessKey: gNavigatorBundle.getString(
        "addonInstall.cancelButton.accesskey"
      ),
      callback: () => {},
    };

    if (height) {
      notification.style.minHeight = height + "px";
    }

    let tab = gBrowser.getTabForBrowser(browser);
    if (tab) {
      gBrowser.selectedTab = tab;
    }

    let popup = PopupNotifications.show(
      browser,
      "addon-install-confirmation",
      messageString,
      gUnifiedExtensions.getPopupAnchorID(browser, window),
      action,
      [secondaryAction],
      options
    );

    removeNotificationOnEnd(popup, installInfo.installs);

    Services.telemetry
      .getHistogramById("SECURITY_UI")
      .add(Ci.nsISecurityUITelemetry.WARNING_CONFIRM_ADDON_INSTALL);
  },

  // IDs of addon install related notifications
  NOTIFICATION_IDS: [
    "addon-install-blocked",
    "addon-install-complete",
    "addon-install-confirmation",
    "addon-install-failed",
    "addon-install-origin-blocked",
    "addon-install-webapi-blocked",
    "addon-install-policy-blocked",
    "addon-progress",
    "addon-webext-permissions",
    "xpinstall-disabled",
  ],

  /**
   * Remove all opened addon installation notifications
   *
   * @param {*} browser - Browser to remove notifications for
   * @returns {boolean} - true if notifications have been removed.
   */
  removeAllNotifications(browser) {
    let notifications = this.NOTIFICATION_IDS.map(id =>
      PopupNotifications.getNotification(id, browser)
    ).filter(notification => notification != null);

    PopupNotifications.remove(notifications, true);

    return !!notifications.length;
  },

  logWarningFullScreenInstallBlocked() {
    // If notifications have been removed, log a warning to the website console
    let consoleMsg = Cc["@mozilla.org/scripterror;1"].createInstance(
      Ci.nsIScriptError
    );
    let message = gBrowserBundle.GetStringFromName(
      "addonInstallFullScreenBlocked"
    );
    consoleMsg.initWithWindowID(
      message,
      gBrowser.currentURI.spec,
      null,
      0,
      0,
      Ci.nsIScriptError.warningFlag,
      "FullScreen",
      gBrowser.selectedBrowser.innerWindowID
    );
    Services.console.logMessage(consoleMsg);
  },

  observe(aSubject, aTopic, aData) {
    var brandBundle = document.getElementById("bundle_brand");
    var installInfo = aSubject.wrappedJSObject;
    var browser = installInfo.browser;

    // Make sure the browser is still alive.
    if (!browser || !gBrowser.browsers.includes(browser)) {
      return;
    }

    var messageString, action;
    var brandShortName = brandBundle.getString("brandShortName");

    var notificationID = aTopic;
    // Make notifications persistent
    var options = {
      displayURI: installInfo.originatingURI,
      persistent: true,
      hideClose: true,
      timeout: Date.now() + 30000,
      popupOptions: {
        position: "bottomright topright",
      },
    };

    switch (aTopic) {
      case "addon-install-disabled": {
        notificationID = "xpinstall-disabled";
        let secondaryActions = null;

        if (Services.prefs.prefIsLocked("xpinstall.enabled")) {
          messageString = gNavigatorBundle.getString(
            "xpinstallDisabledMessageLocked"
          );
        } else {
          messageString = gNavigatorBundle.getString(
            "xpinstallDisabledMessage"
          );

          action = {
            label: gNavigatorBundle.getString("xpinstallDisabledButton"),
            accessKey: gNavigatorBundle.getString(
              "xpinstallDisabledButton.accesskey"
            ),
            callback: function editPrefs() {
              Services.prefs.setBoolPref("xpinstall.enabled", true);
            },
          };

          secondaryActions = [
            {
              label: gNavigatorBundle.getString(
                "addonInstall.cancelButton.label"
              ),
              accessKey: gNavigatorBundle.getString(
                "addonInstall.cancelButton.accesskey"
              ),
              callback: () => {},
            },
          ];
        }

        PopupNotifications.show(
          browser,
          notificationID,
          messageString,
          gUnifiedExtensions.getPopupAnchorID(browser, window),
          action,
          secondaryActions,
          options
        );
        break;
      }
      case "addon-install-fullscreen-blocked": {
        // AddonManager denied installation because we are in DOM fullscreen
        this.logWarningFullScreenInstallBlocked();
        break;
      }
      case "addon-install-webapi-blocked":
      case "addon-install-policy-blocked":
      case "addon-install-origin-blocked": {
        if (aTopic == "addon-install-policy-blocked") {
          messageString = gNavigatorBundle.getString(
            "addonDomainBlockedByPolicy"
          );
        } else {
          messageString = gNavigatorBundle.getFormattedString(
            "xpinstallPromptMessage",
            [brandShortName]
          );
        }

        if (Services.policies) {
          let extensionSettings = Services.policies.getExtensionSettings("*");
          if (
            extensionSettings &&
            "blocked_install_message" in extensionSettings
          ) {
            messageString += " " + extensionSettings.blocked_install_message;
          }
        }

        options.removeOnDismissal = true;
        options.persistent = false;

        let secHistogram = Services.telemetry.getHistogramById("SECURITY_UI");
        secHistogram.add(
          Ci.nsISecurityUITelemetry.WARNING_ADDON_ASKING_PREVENTED
        );
        let popup = PopupNotifications.show(
          browser,
          notificationID,
          messageString,
          gUnifiedExtensions.getPopupAnchorID(browser, window),
          null,
          null,
          options
        );
        removeNotificationOnEnd(popup, installInfo.installs);
        break;
      }
      case "addon-install-blocked": {
        // Dismiss the progress notification.  Note that this is bad if
        // there are multiple simultaneous installs happening, see
        // bug 1329884 for a longer explanation.
        let progressNotification = PopupNotifications.getNotification(
          "addon-progress",
          browser
        );
        if (progressNotification) {
          progressNotification.remove();
        }

        // The informational content differs somewhat for site permission
        // add-ons. AOM no longer supports installing multiple addons,
        // so the array handling here is vestigial.
        let isSitePermissionAddon = installInfo.installs.every(
          ({ addon }) => addon?.type === lazy.SITEPERMS_ADDON_TYPE
        );
        let hasHost = !!options.displayURI;

        if (isSitePermissionAddon) {
          messageString = gNavigatorBundle.getString(
            "sitePermissionInstallFirstPrompt.header"
          );
        } else if (hasHost) {
          messageString = gNavigatorBundle.getFormattedString(
            "xpinstallPromptMessage.header",
            ["<>"]
          );
          options.name = options.displayURI.displayHost;
        } else {
          messageString = gNavigatorBundle.getString(
            "xpinstallPromptMessage.header.unknown"
          );
        }
        // displayURI becomes it's own label, so we unset it for this panel. It will become part of the
        // messageString above.
        let displayURI = options.displayURI;
        options.displayURI = undefined;

        options.eventCallback = topic => {
          if (topic !== "showing") {
            return;
          }
          let doc = browser.ownerDocument;
          let message = doc.getElementById("addon-install-blocked-message");
          // We must remove any prior use of this panel message in this window.
          while (message.firstChild) {
            message.firstChild.remove();
          }

          if (isSitePermissionAddon) {
            message.textContent = gNavigatorBundle.getString(
              "sitePermissionInstallFirstPrompt.message"
            );
          } else if (hasHost) {
            let text = gNavigatorBundle.getString(
              "xpinstallPromptMessage.message"
            );
            let b = doc.createElementNS("http://www.w3.org/1999/xhtml", "b");
            b.textContent = options.name;
            let fragment = BrowserUIUtils.getLocalizedFragment(doc, text, b);
            message.appendChild(fragment);
          } else {
            message.textContent = gNavigatorBundle.getString(
              "xpinstallPromptMessage.message.unknown"
            );
          }

          let article = isSitePermissionAddon
            ? "site-permission-addons"
            : "unlisted-extensions-risks";
          let learnMore = doc.getElementById("addon-install-blocked-info");
          learnMore.textContent = gNavigatorBundle.getString(
            "xpinstallPromptMessage.learnMore"
          );
          learnMore.setAttribute(
            "href",
            Services.urlFormatter.formatURLPref("app.support.baseURL") + article
          );
        };

        let secHistogram = Services.telemetry.getHistogramById("SECURITY_UI");
        action = {
          label: gNavigatorBundle.getString("xpinstallPromptMessage.install"),
          accessKey: gNavigatorBundle.getString(
            "xpinstallPromptMessage.install.accesskey"
          ),
          callback() {
            secHistogram.add(
              Ci.nsISecurityUITelemetry
                .WARNING_ADDON_ASKING_PREVENTED_CLICK_THROUGH
            );
            installInfo.install();
          },
        };
        let dontAllowAction = {
          label: gNavigatorBundle.getString("xpinstallPromptMessage.dontAllow"),
          accessKey: gNavigatorBundle.getString(
            "xpinstallPromptMessage.dontAllow.accesskey"
          ),
          callback: () => {
            for (let install of installInfo.installs) {
              if (install.state != AddonManager.STATE_CANCELLED) {
                install.cancel();
              }
            }
            if (installInfo.cancel) {
              installInfo.cancel();
            }
          },
        };

        let neverAllowCallback = () => {
          SitePermissions.setForPrincipal(
            browser.contentPrincipal,
            "install",
            SitePermissions.BLOCK
          );
          for (let install of installInfo.installs) {
            if (install.state != AddonManager.STATE_CANCELLED) {
              install.cancel();
            }
          }
          if (installInfo.cancel) {
            installInfo.cancel();
          }
        };

        let neverAllowAction = {
          label: gNavigatorBundle.getString(
            "xpinstallPromptMessage.neverAllow"
          ),
          accessKey: gNavigatorBundle.getString(
            "xpinstallPromptMessage.neverAllow.accesskey"
          ),
          callback: neverAllowCallback,
        };

        let neverAllowAndReportAction = {
          label: gNavigatorBundle.getString(
            "xpinstallPromptMessage.neverAllowAndReport"
          ),
          accessKey: gNavigatorBundle.getString(
            "xpinstallPromptMessage.neverAllowAndReport.accesskey"
          ),
          callback: () => {
            AMTelemetry.recordEvent({
              method: "reportSuspiciousSite",
              object: "suspiciousSite",
              value: displayURI?.displayHost ?? "(unknown)",
              extra: {},
            });
            neverAllowCallback();
          },
        };

        secHistogram.add(
          Ci.nsISecurityUITelemetry.WARNING_ADDON_ASKING_PREVENTED
        );

        let declineActions = [dontAllowAction, neverAllowAction];
        if (isSitePermissionAddon) {
          // Restrict this to site permission add-ons for now pending a decision
          // from product about how to approach this for extensions.
          declineActions.push(neverAllowAndReportAction);
        }
        let popup = PopupNotifications.show(
          browser,
          notificationID,
          messageString,
          gUnifiedExtensions.getPopupAnchorID(browser, window),
          action,
          declineActions,
          options
        );
        removeNotificationOnEnd(popup, installInfo.installs);
        break;
      }
      case "addon-install-started": {
        let needsDownload = function needsDownload(aInstall) {
          return aInstall.state != AddonManager.STATE_DOWNLOADED;
        };
        // If all installs have already been downloaded then there is no need to
        // show the download progress
        if (!installInfo.installs.some(needsDownload)) {
          return;
        }
        notificationID = "addon-progress";
        messageString = gNavigatorBundle.getString(
          "addonDownloadingAndVerifying"
        );
        messageString = PluralForm.get(
          installInfo.installs.length,
          messageString
        );
        messageString = messageString.replace(
          "#1",
          installInfo.installs.length
        );
        options.installs = installInfo.installs;
        options.contentWindow = browser.contentWindow;
        options.sourceURI = browser.currentURI;
        options.eventCallback = function(aEvent) {
          switch (aEvent) {
            case "removed":
              options.contentWindow = null;
              options.sourceURI = null;
              break;
          }
        };
        action = {
          label: gNavigatorBundle.getString("addonInstall.acceptButton2.label"),
          accessKey: gNavigatorBundle.getString(
            "addonInstall.acceptButton2.accesskey"
          ),
          disabled: true,
          callback: () => {},
        };
        let secondaryAction = {
          label: gNavigatorBundle.getString("addonInstall.cancelButton.label"),
          accessKey: gNavigatorBundle.getString(
            "addonInstall.cancelButton.accesskey"
          ),
          callback: () => {
            for (let install of installInfo.installs) {
              if (install.state != AddonManager.STATE_CANCELLED) {
                install.cancel();
              }
            }
          },
        };
        let notification = PopupNotifications.show(
          browser,
          notificationID,
          messageString,
          gUnifiedExtensions.getPopupAnchorID(browser, window),
          action,
          [secondaryAction],
          options
        );
        notification._startTime = Date.now();

        break;
      }
      case "addon-install-failed": {
        options.removeOnDismissal = true;
        options.persistent = false;

        // TODO This isn't terribly ideal for the multiple failure case
        for (let install of installInfo.installs) {
          let host;
          try {
            host = options.displayURI.host;
          } catch (e) {
            // displayURI might be missing or 'host' might throw for non-nsStandardURL nsIURIs.
          }

          if (!host) {
            host =
              install.sourceURI instanceof Ci.nsIStandardURL &&
              install.sourceURI.host;
          }

          // Construct the l10n ID for the error, e.g. "addonInstallError-3"
          let error =
            host || install.error == 0
              ? "addonInstallError"
              : "addonLocalInstallError";
          let args;
          if (install.error < 0) {
            // Append the error code for the installation failure to get the
            // matching translation of the error. The error code is defined in
            // AddonManager's _errors Map. Not all error codes listed there are
            // translated, since errors that are only triggered during updates
            // will never reach this code.
            error += install.error;
            args = [brandShortName, install.name];
          } else if (
            install.addon.blocklistState == Ci.nsIBlocklistService.STATE_BLOCKED
          ) {
            error += "Blocklisted";
            args = [install.name];
          } else {
            error += "Incompatible";
            args = [brandShortName, Services.appinfo.version, install.name];
          }

          if (
            install.addon &&
            !Services.policies.mayInstallAddon(install.addon)
          ) {
            error = "addonInstallBlockedByPolicy";
            let extensionSettings = Services.policies.getExtensionSettings(
              install.addon.id
            );
            let message = "";
            if (
              extensionSettings &&
              "blocked_install_message" in extensionSettings
            ) {
              message = " " + extensionSettings.blocked_install_message;
            }
            args = [install.name, install.addon.id, message];
          }

          // Add Learn More link when refusing to install an unsigned add-on
          if (install.error == AddonManager.ERROR_SIGNEDSTATE_REQUIRED) {
            options.learnMoreURL =
              Services.urlFormatter.formatURLPref("app.support.baseURL") +
              "unsigned-addons";
          }

          messageString = gNavigatorBundle.getFormattedString(error, args);

          PopupNotifications.show(
            browser,
            notificationID,
            messageString,
            gUnifiedExtensions.getPopupAnchorID(browser, window),
            action,
            null,
            options
          );

          // Can't have multiple notifications with the same ID, so stop here.
          break;
        }
        this._removeProgressNotification(browser);
        break;
      }
      case "addon-install-confirmation": {
        let showNotification = () => {
          let height = undefined;

          if (PopupNotifications.isPanelOpen) {
            let rect = document
              .getElementById("addon-progress-notification")
              .getBoundingClientRect();
            height = rect.height;
          }

          this._removeProgressNotification(browser);
          this.showInstallConfirmation(browser, installInfo, height);
        };

        let progressNotification = PopupNotifications.getNotification(
          "addon-progress",
          browser
        );
        if (progressNotification) {
          let downloadDuration = Date.now() - progressNotification._startTime;
          let securityDelay =
            Services.prefs.getIntPref("security.dialog_enable_delay") -
            downloadDuration;
          if (securityDelay > 0) {
            setTimeout(() => {
              // The download may have been cancelled during the security delay
              if (
                PopupNotifications.getNotification("addon-progress", browser)
              ) {
                showNotification();
              }
            }, securityDelay);
            break;
          }
        }
        showNotification();
        break;
      }
      case "addon-install-complete": {
        let secondaryActions = null;
        let numAddons = installInfo.installs.length;

        if (numAddons == 1) {
          messageString = gNavigatorBundle.getFormattedString(
            "addonInstalled",
            [installInfo.installs[0].name]
          );
        } else {
          messageString = gNavigatorBundle.getString("addonsGenericInstalled");
          messageString = PluralForm.get(numAddons, messageString);
          messageString = messageString.replace("#1", numAddons);
        }
        action = null;

        options.removeOnDismissal = true;
        options.persistent = false;

        PopupNotifications.show(
          browser,
          notificationID,
          messageString,
          gUnifiedExtensions.getPopupAnchorID(browser, window),
          action,
          secondaryActions,
          options
        );
        break;
      }
    }
  },
  _removeProgressNotification(aBrowser) {
    let notification = PopupNotifications.getNotification(
      "addon-progress",
      aBrowser
    );
    if (notification) {
      notification.remove();
    }
  },
};

var gExtensionsNotifications = {
  initialized: false,
  init() {
    this.updateAlerts();
    this.boundUpdate = this.updateAlerts.bind(this);
    ExtensionsUI.on("change", this.boundUpdate);
    this.initialized = true;
  },

  uninit() {
    // uninit() can race ahead of init() in some cases, if that happens,
    // we have no handler to remove.
    if (!this.initialized) {
      return;
    }
    ExtensionsUI.off("change", this.boundUpdate);
  },

  _createAddonButton(text, icon, callback) {
    let button = document.createXULElement("toolbarbutton");
    button.setAttribute("wrap", "true");
    button.setAttribute("label", text);
    button.setAttribute("tooltiptext", text);
    const DEFAULT_EXTENSION_ICON =
      "chrome://mozapps/skin/extensions/extensionGeneric.svg";
    button.setAttribute("image", icon || DEFAULT_EXTENSION_ICON);
    button.className = "addon-banner-item subviewbutton";

    button.addEventListener("command", callback);
    PanelUI.addonNotificationContainer.appendChild(button);
  },

  updateAlerts() {
    let sideloaded = ExtensionsUI.sideloaded;
    let updates = ExtensionsUI.updates;

    let container = PanelUI.addonNotificationContainer;

    while (container.firstChild) {
      container.firstChild.remove();
    }

    let items = 0;
    for (let update of updates) {
      if (++items > 4) {
        break;
      }
      let text = gNavigatorBundle.getFormattedString(
        "webextPerms.updateMenuItem",
        [update.addon.name]
      );
      this._createAddonButton(text, update.addon.iconURL, evt => {
        ExtensionsUI.showUpdate(gBrowser, update);
      });
    }

    let appName;
    for (let addon of sideloaded) {
      if (++items > 4) {
        break;
      }
      if (!appName) {
        let brandBundle = document.getElementById("bundle_brand");
        appName = brandBundle.getString("brandShortName");
      }

      let text = gNavigatorBundle.getFormattedString(
        "webextPerms.sideloadMenuItem",
        [addon.name, appName]
      );
      this._createAddonButton(text, addon.iconURL, evt => {
        // We need to hide the main menu manually because the toolbarbutton is
        // removed immediately while processing this event, and PanelUI is
        // unable to identify which panel should be closed automatically.
        PanelUI.hide();
        ExtensionsUI.showSideloaded(gBrowser, addon);
      });
    }
  },
};

var BrowserAddonUI = {
  async promptRemoveExtension(addon) {
    let { name } = addon;
    let title = await document.l10n.formatValue("addon-removal-title", {
      name,
    });
    let { getFormattedString, getString } = gNavigatorBundle;
    let btnTitle = getString("webext.remove.confirmation.button");
    let {
      BUTTON_TITLE_IS_STRING: titleString,
      BUTTON_TITLE_CANCEL: titleCancel,
      BUTTON_POS_0,
      BUTTON_POS_1,
      confirmEx,
    } = Services.prompt;
    let btnFlags = BUTTON_POS_0 * titleString + BUTTON_POS_1 * titleCancel;
    let checkboxState = { value: false };
    let checkboxMessage = null;

    // Enable abuse report checkbox in the remove extension dialog,
    // if enabled by the about:config prefs and the addon type
    // is currently supported.
    if (
      gAddonAbuseReportEnabled &&
      ["extension", "theme"].includes(addon.type)
    ) {
      checkboxMessage = await document.l10n.formatValue(
        "addon-removal-abuse-report-checkbox"
      );
    }

    let message = null;

    if (!Services.prefs.getBoolPref("prompts.windowPromptSubDialog", false)) {
      message = getFormattedString("webext.remove.confirmation.message", [
        name,
        document.getElementById("bundle_brand").getString("brandShorterName"),
      ]);
    }

    let result = confirmEx(
      window,
      title,
      message,
      btnFlags,
      btnTitle,
      /* button1 */ null,
      /* button2 */ null,
      checkboxMessage,
      checkboxState
    );

    return { remove: result === 0, report: checkboxState.value };
  },

  async reportAddon(addonId, reportEntryPoint) {
    let addon = addonId && (await AddonManager.getAddonByID(addonId));
    if (!addon) {
      return;
    }

    const win = await BrowserOpenAddonsMgr("addons://list/extension");

    win.openAbuseReport({ addonId, reportEntryPoint });
  },

  async removeAddon(addonId, eventObject) {
    let addon = addonId && (await AddonManager.getAddonByID(addonId));
    if (!addon || !(addon.permissions & AddonManager.PERM_CAN_UNINSTALL)) {
      return;
    }

    let { remove, report } = await this.promptRemoveExtension(addon);

    AMTelemetry.recordActionEvent({
      object: eventObject,
      action: "uninstall",
      value: remove ? "accepted" : "cancelled",
      extra: { addonId },
    });

    if (remove) {
      // Leave the extension in pending uninstall if we are also reporting the
      // add-on.
      await addon.uninstall(report);

      if (report) {
        await this.reportAddon(addon.id, "uninstall");
      }
    }
  },

  async manageAddon(addonId, eventObject) {
    let addon = addonId && (await AddonManager.getAddonByID(addonId));
    if (!addon) {
      return;
    }

    BrowserOpenAddonsMgr("addons://detail/" + encodeURIComponent(addon.id));
    AMTelemetry.recordActionEvent({
      object: eventObject,
      action: "manage",
      extra: { addonId: addon.id },
    });
  },
};

// We must declare `gUnifiedExtensions` using `var` below to avoid a
// "redeclaration" syntax error.
var gUnifiedExtensions = {
  _initialized: false,

  // We use a `<deck>` in the extension items to show/hide messages below each
  // extension name. We have a default message for origin controls, and
  // optionally a second message shown on hover, which describes the action
  // (when clicking on the action button). We have another message shown when
  // the menu button is hovered/focused. The constants below define the indexes
  // of each message in the `<deck>`.
  MESSAGE_DECK_INDEX_DEFAULT: 0,
  MESSAGE_DECK_INDEX_HOVER: 1,
  MESSAGE_DECK_INDEX_MENU_HOVER: 2,

  init() {
    if (this._initialized) {
      return;
    }

    this._button = document.getElementById("unified-extensions-button");
    // TODO: Bug 1778684 - Auto-hide button when there is no active extension.
    this._button.hidden = false;

    document
      .getElementById("nav-bar")
      .setAttribute("unifiedextensionsbuttonshown", true);

    gBrowser.addTabsProgressListener(this);
    window.addEventListener("TabSelect", () => this.updateAttention());

    this.permListener = () => this.updateAttention();
    lazy.ExtensionPermissions.addListener(this.permListener);

    gNavToolbox.addEventListener("customizationstarting", this);

    this._initialized = true;
  },

  uninit() {
    if (this.permListener) {
      lazy.ExtensionPermissions.removeListener(this.permListener);
      this.permListener = null;
    }
    gNavToolbox.removeEventListener("customizationstarting", this);
  },

  onLocationChange(browser, webProgress, _request, _uri, flags) {
    // Only update on top-level cross-document navigations in the selected tab.
    if (
      webProgress.isTopLevel &&
      browser === gBrowser.selectedBrowser &&
      !(flags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT)
    ) {
      this.updateAttention();
    }
  },

  // Update the attention indicator for the whole unified extensions button.
  updateAttention() {
    let attention = false;
    for (let policy of this.getActivePolicies()) {
      let widget = this.browserActionFor(policy)?.widget;

      // Only show for extensions which are not already visible in the toolbar.
      if (!widget || widget.areaType !== CustomizableUI.TYPE_TOOLBAR) {
        if (lazy.OriginControls.getAttention(policy, window)) {
          attention = true;
          break;
        }
      }
    }
    this.button.toggleAttribute("attention", attention);
    this.button.ownerDocument.l10n.setAttributes(
      this.button,
      attention
        ? "unified-extensions-button-permissions-needed"
        : "unified-extensions-button"
    );
  },

  getPopupAnchorID(aBrowser, aWindow) {
    const anchorID = "unified-extensions-button";
    const attr = anchorID + "popupnotificationanchor";

    if (!aBrowser[attr]) {
      // A hacky way of setting the popup anchor outside the usual url bar
      // icon box, similar to how it was done for CFR.
      // See: https://searchfox.org/mozilla-central/rev/c5c002f81f08a73e04868e0c2bf0eb113f200b03/toolkit/modules/PopupNotifications.sys.mjs#40
      aBrowser[attr] = aWindow.document.getElementById(
        anchorID
        // Anchor on the toolbar icon to position the popup right below the
        // button.
      ).firstElementChild;
    }

    return anchorID;
  },

  get button() {
    return this._button;
  },

  /**
   * Gets a list of active WebExtensionPolicy instances of type "extension",
   * sorted alphabetically based on add-on's names. Optionally, filter out
   * extensions with browser action.
   *
   * @param {bool} all When set to true (the default), return the list of all
   *                   active policies, including the ones that have a
   *                   browser action. Otherwise, extensions with browser
   *                   action are filtered out.
   * @returns {Array<WebExtensionPolicy>} An array of active policies.
   */
  getActivePolicies(all = true) {
    let policies = WebExtensionPolicy.getActiveExtensions();
    policies = policies.filter(policy => {
      let { extension } = policy;
      if (!policy.active || extension?.type !== "extension") {
        return false;
      }

      // Ignore hidden and extensions that cannot access the current window
      // (because of PB mode when we are in a private window), since users
      // cannot do anything with those extensions anyway.
      if (extension.isHidden || !policy.canAccessWindow(window)) {
        return false;
      }

      return all || !extension.hasBrowserActionUI;
    });

    policies.sort((a, b) => a.name.localeCompare(b.name));
    return policies;
  },

  /**
   * Returns true when there are active extensions listed/shown in the unified
   * extensions panel, and false otherwise (e.g. when extensions are pinned in
   * the toolbar OR there are 0 active extensions).
   *
   * @returns {boolean} Whether there are extensions listed in the panel.
   */
  hasExtensionsInPanel() {
    const policies = this.getActivePolicies();

    return !!policies
      .map(policy => this.browserActionFor(policy)?.widget)
      .filter(widget => {
        return (
          !widget ||
          widget?.areaType !== CustomizableUI.TYPE_TOOLBAR ||
          widget?.forWindow(window).overflowed
        );
      }).length;
  },

  handleEvent(event) {
    switch (event.type) {
      case "ViewShowing":
        this.onPanelViewShowing(event.target);
        break;

      case "ViewHiding":
        this.onPanelViewHiding(event.target);
        break;

      case "customizationstarting":
        this.panel.hidePopup();
        break;
    }
  },

  onPanelViewShowing(panelview) {
    const list = panelview.querySelector(".unified-extensions-list");
    // Only add extensions that do not have a browser action in this list since
    // the extensions with browser action have CUI widgets and will appear in
    // the panel (or toolbar) via the CUI mechanism.
    const policies = this.getActivePolicies(/* all */ false);

    for (const policy of policies) {
      const item = document.createElement("unified-extensions-item");
      item.setExtension(policy.extension);
      list.appendChild(item);
    }
  },

  onPanelViewHiding(panelview) {
    if (window.closed) {
      return;
    }
    const list = panelview.querySelector(".unified-extensions-list");
    while (list.lastChild) {
      list.lastChild.remove();
    }
    // If temporary access was granted, (maybe) clear attention indicator.
    requestAnimationFrame(() => this.updateAttention());
  },

  _panel: null,
  get panel() {
    // Lazy load the unified-extensions-panel panel the first time we need to
    // display it.
    if (!this._panel) {
      let template = document.getElementById(
        "unified-extensions-panel-template"
      );
      template.replaceWith(template.content);
      this._panel = document.getElementById("unified-extensions-panel");
      let customizationArea = this._panel.querySelector(
        "#unified-extensions-area"
      );
      CustomizableUI.registerPanelNode(
        customizationArea,
        CustomizableUI.AREA_ADDONS
      );
      CustomizableUI.addPanelCloseListeners(this._panel);

      // Lazy-load the l10n strings. Those strings are used for the CUI and
      // non-CUI extensions in the unified extensions panel.
      document
        .getElementById("unified-extensions-context-menu")
        .querySelectorAll("[data-lazy-l10n-id]")
        .forEach(el => {
          el.setAttribute("data-l10n-id", el.getAttribute("data-lazy-l10n-id"));
          el.removeAttribute("data-lazy-l10n-id");
        });
    }
    return this._panel;
  },

  async togglePanel(aEvent) {
    if (!CustomizationHandler.isCustomizing()) {
      if (aEvent) {
        if (
          // On MacOS, ctrl-click will send a context menu event from the
          // widget, so we don't want to bring up the panel when ctrl key is
          // pressed.
          (aEvent.type == "mousedown" &&
            (aEvent.button !== 0 ||
              (AppConstants.platform === "macosx" && aEvent.ctrlKey))) ||
          (aEvent.type === "keypress" &&
            aEvent.charCode !== KeyEvent.DOM_VK_SPACE &&
            aEvent.keyCode !== KeyEvent.DOM_VK_RETURN)
        ) {
          return;
        }

        // The button should directly open `about:addons` when the user does not
        // have any active extensions listed in the unified extensions panel.
        if (!this.hasExtensionsInPanel()) {
          await BrowserOpenAddonsMgr("addons://discover/");
          return;
        }
      }

      let panel = this.panel;

      if (!this._listView) {
        this._listView = PanelMultiView.getViewNode(
          document,
          "unified-extensions-view"
        );
        this._listView.addEventListener("ViewShowing", this);
        this._listView.addEventListener("ViewHiding", this);
      }

      if (this._button.open) {
        PanelMultiView.hidePopup(panel);
        this._button.open = false;
      } else {
        panel.hidden = false;
        PanelMultiView.openPopup(panel, this._button, {
          triggerEvent: aEvent,
        });
      }
    }

    // We always dispatch an event (useful for testing purposes).
    window.dispatchEvent(new CustomEvent("UnifiedExtensionsTogglePanel"));
  },

  async updateContextMenu(menu, event) {
    // When the context menu is open, `onpopupshowing` is called when menu
    // items open sub-menus. We don't want to update the context menu in this
    // case.
    if (event.target.id !== "unified-extensions-context-menu") {
      return;
    }

    const id = this._getExtensionId(menu);
    const addon = await AddonManager.getAddonByID(id);
    const widgetId = this._getWidgetId(menu);
    const forBrowserAction = !!widgetId;

    const pinButton = menu.querySelector(
      ".unified-extensions-context-menu-pin-to-toolbar"
    );
    const removeButton = menu.querySelector(
      ".unified-extensions-context-menu-remove-extension"
    );
    const reportButton = menu.querySelector(
      ".unified-extensions-context-menu-report-extension"
    );
    const menuSeparator = menu.querySelector(
      ".unified-extensions-context-menu-management-separator"
    );

    menuSeparator.hidden = !forBrowserAction;
    pinButton.hidden = !forBrowserAction;

    if (forBrowserAction) {
      let area = CustomizableUI.getPlacementOfWidget(widgetId).area;
      let inToolbar = area != CustomizableUI.AREA_ADDONS;
      pinButton.setAttribute("checked", inToolbar);
    }

    reportButton.hidden = !gAddonAbuseReportEnabled;
    removeButton.disabled = !(
      addon.permissions & AddonManager.PERM_CAN_UNINSTALL
    );

    ExtensionsUI.originControlsMenu(menu, id);

    const browserAction = this.browserActionFor(WebExtensionPolicy.getByID(id));
    if (browserAction) {
      browserAction.updateContextMenu(menu);
    }
  },

  // This is registered on the top-level unified extensions context menu.
  onContextMenuCommand(menu, event) {
    this.togglePanel();
  },

  browserActionFor(policy) {
    // Ideally, we wouldn't do that because `browserActionFor()` will only be
    // defined in `global` when at least one extension has required loading the
    // `ext-browserAction` code.
    let method = lazy.ExtensionParent.apiManager.global.browserActionFor;
    return method?.(policy?.extension);
  },

  async manageExtension(menu) {
    const id = this._getExtensionId(menu);

    await BrowserAddonUI.manageAddon(id, "unifiedExtensions");
  },

  async removeExtension(menu) {
    const id = this._getExtensionId(menu);

    await BrowserAddonUI.removeAddon(id, "unifiedExtensions");
  },

  async reportExtension(menu) {
    const id = this._getExtensionId(menu);

    await BrowserAddonUI.reportAddon(id, "unified_context_menu");
  },

  _getExtensionId(menu) {
    const { triggerNode } = menu;
    return triggerNode.dataset.extensionid;
  },

  _getWidgetId(menu) {
    const { triggerNode } = menu;
    return triggerNode.closest(".unified-extensions-item")?.id;
  },

  async onPinToToolbarChange(menu, event) {
    let shouldPinToToolbar = event.target.getAttribute("checked") == "true";
    // Revert the checkbox back to its original state. This is because the
    // addon context menu handlers are asynchronous, and there seems to be
    // a race where the checkbox state won't get set in time to show the
    // right state. So we err on the side of caution, and presume that future
    // attempts to open this context menu on an extension button will show
    // the same checked state that we started in.
    event.target.setAttribute("checked", !shouldPinToToolbar);

    let widgetId = this._getWidgetId(menu);
    if (!widgetId) {
      return;
    }

    this.pinToToolbar(widgetId, shouldPinToToolbar);
  },

  pinToToolbar(widgetId, shouldPinToToolbar) {
    let newArea = shouldPinToToolbar
      ? CustomizableUI.AREA_NAVBAR
      : CustomizableUI.AREA_ADDONS;
    let newPosition = shouldPinToToolbar ? undefined : 0;

    CustomizableUI.addWidgetToArea(widgetId, newArea, newPosition);

    this.updateAttention();
  },
};
