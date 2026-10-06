/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Test for Bug 670318
 *
 * When LoadEntry() is called on a browser that has multiple duplicate history
 * entries, history.index can end up out of range (>= history.count).
 */

const URL =
  "http://mochi.test:8888/browser/docshell/test/browser/file_bug670318.html";

async function test_body(browser) {
  let history = browser.browsingContext.sessionHistory;
  let count = 0;

  let testDone = {};
  testDone.promise = new Promise(resolve => {
    testDone.resolve = resolve;
  });

  let listener = {
    async OnHistoryNewEntry(aNewURI) {
      if (aNewURI.spec == URL && 5 == ++count) {
        history.removeSHistoryListener(listener);
        let loaded = BrowserTestUtils.browserLoaded(browser);
        SpecialPowers.spawn(browser, [], () => {
          content.location.reload();
        });
        await loaded;
        Assert.less(history.index, history.count, "history.index is valid");
        testDone.resolve();
      }
    },

    OnHistoryReload: () => true,
    OnHistoryGotoIndex: () => {},
    OnHistoryPurge: () => {},
    OnHistoryReplaceEntry: () => {
      // The initial load of about:blank causes a transient entry to be
      // created, so our first navigation to a real page is a replace
      // instead of a new entry.
      ++count;
      // XXX I think this will be notified once |URL|, i.e. file_bug670318.html loads.
      // this is probably not desired.
    },

    QueryInterface: ChromeUtils.generateQI([
      "nsISHistoryListener",
      "nsISupportsWeakReference",
    ]),
  };

  history.addSHistoryListener(listener);
  BrowserTestUtils.startLoadingURIString(browser, URL);

  await testDone.promise;
}

add_task(async function test() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    test_body
  );
});
