/* import-globals-from ../browser/head.js */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/translations/tests/browser/head.js",
  this
);

async function setupEvaluation({ url }) {
  {
    const { RemoteSettingsClient } = ChromeUtils.importESModule(
      "resource://services-settings/RemoteSettingsClient.sys.mjs"
    );
    RemoteSettingsClient.prototype.validateCollectionSignature = async () => {};
  }

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    url,
    true // waitForLoad
  );

  return {
    tab,

    async cleanup() {
      info("Cleaning up");
      BrowserTestUtils.removeTab(tab);

      clearDirtyPrefs();
    },
  };
}

function clearDirtyPrefs() {
  Services.prefs.clearUserPref(
    "browser.translations.mostRecentTargetLanguages"
  );
  Services.prefs.clearUserPref("intl.locale.requested");
}

/**
 * Report eval data out to stdout, which will be picked up by the test harness for
 * analysis.
 *
 * @param {any} data - JSON serializable data.
 */
function reportEvalResult(data) {
  info("evalDataPayload | " + JSON.stringify(data));

  dump("-------------------------------------\n");
  dump("Eval result:\n");
  dump(JSON.stringify(data, null, 2));
  dump("\n");
}

/**
 * Wait for every element in the selector to have been mutated once.
 *
 * @param {MozBrowser} browser
 * @param {string} selector
 * @returns {Promise<void>}
 */
function waitForMutations(browser, selector) {
  return SpecialPowers.spawn(browser, [selector], async selector => {
    const elements = new Set(content.document.querySelectorAll(selector));

    await new Promise(resolve => {
      for (const element of elements) {
        const observer = new content.MutationObserver(() => {
          elements.delete(element);
          observer.disconnect();
          if (elements.size === 0) {
            resolve();
          }
        });
        observer.observe(content.document.querySelector("article"), {
          subtree: true,
          characterData: true,
          childList: true,
        });
      }
    });
  });
}
