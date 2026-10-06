/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const ACTOR = "Bug422543";

let getActor = browser => {
  return browser.browsingContext.currentWindowGlobal.getActor(ACTOR);
};

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  });
});

add_task(async function runTests() {
  await setup();
  let browser = gBrowser.selectedBrowser;
  // Now that we're set up, initialize our frame script.
  checkListeners("initial", "listeners initialized");

  // Check if all history listeners are always notified.
  info("# part 1");
  await whenPageShown(browser, () =>
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    BrowserTestUtils.startLoadingURIString(browser, "http://www.example.com/")
  );
  checkListeners("newentry", "shistory has a new entry");
  ok(browser.canGoBackIgnoringUserInteraction, "we can go back");

  await whenPageShown(browser, () => browser.goBack());
  checkListeners("gotoindex", "back to the first shentry");
  ok(browser.canGoForward, "we can go forward");

  await whenPageShown(browser, () => browser.goForward());
  checkListeners("gotoindex", "forward to the second shentry");

  await whenPageShown(browser, () => browser.reload());
  checkListeners("reload", "current shentry reloaded");

  await whenPageShown(browser, () => browser.gotoIndex(0));
  checkListeners("gotoindex", "back to the first index");

  // Check nsISHistory.notifyOnHistoryReload
  info("# part 2");
  ok(notifyReload(browser), "reloading has not been canceled");
  checkListeners("reload", "saw the reload notification");

  // Let the first listener cancel the reload action.
  info("# part 3");
  resetListeners();
  setListenerRetval(0, false);
  ok(!notifyReload(browser), "reloading has been canceled");
  checkListeners("reload", "saw the reload notification");

  // Let both listeners cancel the reload action.
  info("# part 4");
  resetListeners();
  setListenerRetval(1, false);
  ok(!notifyReload(browser), "reloading has been canceled");
  checkListeners("reload", "saw the reload notification");

  // Let the second listener cancel the reload action.
  info("# part 5");
  resetListeners();
  setListenerRetval(0, true);
  ok(!notifyReload(browser), "reloading has been canceled");
  checkListeners("reload", "saw the reload notification");
});

class SHistoryListener {
  constructor() {
    this.retval = true;
    this.last = "initial";
  }

  OnHistoryNewEntry() {
    this.last = "newentry";
  }

  OnHistoryGotoIndex() {
    this.last = "gotoindex";
  }

  OnHistoryPurge() {
    this.last = "purge";
  }

  OnHistoryReload() {
    this.last = "reload";
    return this.retval;
  }

  OnHistoryReplaceEntry() {}
}
SHistoryListener.prototype.QueryInterface = ChromeUtils.generateQI([
  "nsISHistoryListener",
  "nsISupportsWeakReference",
]);

let listeners = [new SHistoryListener(), new SHistoryListener()];

function checkListeners(aLast, aMessage) {
  is(listeners[0].last, aLast, aMessage);
  is(listeners[1].last, aLast, aMessage);
}

function resetListeners() {
  for (let listener of listeners) {
    listener.last = "initial";
  }
}

function notifyReload(browser) {
  return browser.browsingContext.sessionHistory.notifyOnHistoryReload();
}

function setListenerRetval(num, val) {
  listeners[num].retval = val;
}

async function setup() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "http://mochi.test:8888"
  );

  let browser = tab.linkedBrowser;
  registerCleanupFunction(async function () {
    for (let listener of listeners) {
      browser.browsingContext.sessionHistory.removeSHistoryListener(listener);
    }
    gBrowser.removeTab(tab);
  });
  for (let listener of listeners) {
    browser.browsingContext.sessionHistory.addSHistoryListener(listener);
  }
}

function whenPageShown(aBrowser, aNavigation) {
  let promise = new Promise(resolve => {
    let unregister = BrowserTestUtils.addContentEventListener(
      aBrowser,
      "pageshow",
      () => {
        unregister();
        resolve();
      },
      { capture: true }
    );
  });

  aNavigation();
  return promise;
}
