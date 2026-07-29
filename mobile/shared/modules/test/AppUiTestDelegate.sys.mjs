/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  EventDispatcher: "resource://gre/modules/Messaging.sys.mjs",
  GeckoViewTabBridge: "resource://gre/modules/GeckoViewTab.sys.mjs",
  mobileWindowTracker: "resource://gre/modules/GeckoViewWebExtension.sys.mjs",
});

const TEST_SUPPORT_EXTENSION_ID = "test-runner-support@tests.mozilla.org";

/**
 * The implementation of AppUiTestDelegate. All implementations need to be kept
 * in sync. For details, see:
 * testing/specialpowers/content/AppTestDelegateParent.sys.mjs
 *
 * This implementation mostly forwards calls to TestRunnerApiEngine in
 * mobile/android/test_runner/src/main/java/org/mozilla/geckoview/test_runner/TestRunnerApiEngine.java
 */
class Delegate {
  _sendMessageToApp(data) {
    // "GeckoView:WebExtension:Message" with the "nativeApp" property set is a
    // message usually emitted by the runtime.sendNativeMessage implementation.
    //
    // Although a dummy extension with ID TEST_SUPPORT_EXTENSION_ID is installed
    // by TestRunnerActivity, the sendNativeMessage API is not used directly.
    // Instead, we forge a message in the same (internal) format here.
    //
    // The message is ultimately received and handled by TestRunnerApiEngine at
    // mobile/android/test_runner/src/main/java/org/mozilla/geckoview/test_runner/TestRunnerApiEngine.java
    return lazy.EventDispatcher.instance.sendRequestForResult(
      "GeckoView:WebExtension:Message",
      {
        sender: {
          envType: "addon_child",
          url: "test-runner-support:///",
        },
        data,
        extensionId: TEST_SUPPORT_EXTENSION_ID,
        nativeApp: "test-runner-support",
      }
    );
  }

  clickPageAction(window, extensionId) {
    return this._sendMessageToApp({ type: "clickPageAction", extensionId });
  }

  clickBrowserAction(window, extensionId) {
    return this._sendMessageToApp({ type: "clickBrowserAction", extensionId });
  }

  closePageAction(window, extensionId) {
    return this._sendMessageToApp({ type: "closePageAction", extensionId });
  }

  closeBrowserAction(window, extensionId) {
    return this._sendMessageToApp({ type: "closeBrowserAction", extensionId });
  }

  awaitExtensionPanel(window, extensionId) {
    return this._sendMessageToApp({ type: "awaitExtensionPanel", extensionId });
  }

  async removeTab(tab) {
    const window = tab.browser.documentGlobal;
    await lazy.GeckoViewTabBridge.closeTab({
      window,
      extensionId: TEST_SUPPORT_EXTENSION_ID,
    });
  }

  async openNewForegroundTab(window, url, waitForLoad = true) {
    const uri = Services.io.newURI(url);
    const tab = await lazy.GeckoViewTabBridge.createNewTab({
      extensionId: TEST_SUPPORT_EXTENSION_ID,
      createProperties: {
        url,
        active: true,
      },
    });

    const { browser } = tab;
    // On desktop, the openNewForegroundTab implementation uses the system
    // principal to trigger navigations. Here we historically used content
    // principals, and following the principle of least privilege, we only
    // use system principals when needed.
    // There is also an argument to be made to unconditionally use the system
    // principal, but for now, we do not.
    // Web pages cannot open top-level data:-URLs, but users are allowed to
    // navigate to data:-URLs, which use the system principal.
    const triggeringPrincipal = uri.schemeIs("data")
      ? Services.scriptSecurityManager.getSystemPrincipal()
      : Services.scriptSecurityManager.createContentPrincipal(uri, {});

    browser.fixupAndLoadURIString(url, {
      loadFlags: Ci.nsIWebNavigation.LOAD_FLAGS_NONE,
      triggeringPrincipal,
    });

    const newWindow = browser.documentGlobal;
    lazy.mobileWindowTracker.setTabActive(newWindow, true);

    if (!waitForLoad) {
      return tab;
    }

    return new Promise(resolve => {
      const listener = ev => {
        const { browsingContext, internalURL } = ev.detail;

        // Sometimes we arrive here without an internalURL. If that's the
        // case, just keep waiting until we get one.
        if (!internalURL || internalURL == "about:blank") {
          return;
        }

        // Ignore subframes
        if (browsingContext !== browsingContext.top) {
          return;
        }

        resolve(tab);
        browser.removeEventListener("AppTestDelegate:load", listener, true);
      };
      browser.addEventListener("AppTestDelegate:load", listener, true);
    });
  }
}

export var AppUiTestDelegate = new Delegate();
