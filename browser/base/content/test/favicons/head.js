/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

ChromeUtils.defineESModuleGetters(this, {
  LinkHandlerParent: "resource:///actors/LinkHandlerParent.sys.mjs",
  PlacesTestUtils: "resource://testing-common/PlacesTestUtils.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",

  XPCShellContentUtils:
    "resource://testing-common/XPCShellContentUtils.sys.mjs",
});

// Clear the network cache between every test to make sure we get a stable state
Services.cache2.clear();

function waitForFaviconMessage(isTabIcon = undefined, expectedURL = undefined) {
  return new Promise((resolve, reject) => {
    let listener = (name, data) => {
      if (name != "SetIcon" && name != "SetFailedIcon") {
        return; // Ignore unhandled messages
      }

      // If requested filter out loads of the wrong kind of icon.
      if (isTabIcon != undefined && isTabIcon == data.isRichIcon) {
        return;
      }

      if (expectedURL && data.originalURL != expectedURL) {
        return;
      }

      LinkHandlerParent.removeListenerForTests(listener);

      if (name == "SetIcon") {
        resolve({
          iconURL: data.originalURL,
          dataURL: data.iconURL,
          isRichIcon: data.isRichIcon,
        });
      } else {
        reject({
          iconURL: data.originalURL,
          isRichIcon: data.isRichIcon,
        });
      }
    };

    LinkHandlerParent.addListenerForTests(listener);
  });
}

function waitForFavicon(browser, url) {
  return new Promise(resolve => {
    let listener = {
      onLinkIconAvailable(b, dataURI, iconURI) {
        if (b !== browser || iconURI != url) {
          return;
        }

        gBrowser.removeTabsProgressListener(listener);
        resolve();
      },
    };

    gBrowser.addTabsProgressListener(listener);
  });
}

function waitForLinkAvailable(browser) {
  let resolve, reject;

  let listener = {
    onLinkIconAvailable(b, dataURI, iconURI) {
      // Ignore icons for other browsers or empty icons.
      if (browser !== b || !iconURI) {
        return;
      }

      gBrowser.removeTabsProgressListener(listener);
      resolve(iconURI);
    },
  };

  let promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;

    gBrowser.addTabsProgressListener(listener);
  });

  promise.cancel = () => {
    gBrowser.removeTabsProgressListener(listener);

    reject();
  };

  return promise;
}
