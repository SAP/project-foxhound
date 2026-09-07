"use strict";

// Bug 2011921 - Crash in BrowsingContextWebProgress::ContextReplaced
//
// When MaybeCheckUnloadingIsCanceled takes the async path for a BFCache
// navigation (because the current page has a beforeunload handler and the
// Navigation API is enabled), and another navigation replaces the browsing
// context before the callback fires, the callback calls FinishRestore →
// ReplacedBy on the already-replaced context whose mWebProgress is null.
//
// The race: two rapid back navigations both enter LoadURIs. The first takes
// the async MaybeCheckUnloadingIsCanceled path. The second may complete
// its BFCache restore (calling ReplacedBy and moving mWebProgress) before
// the first callback fires. When the first callback fires, it reaches
// FinishRestore at the unguarded direct call in MaybeLoadBFCache (which
// lacks the IsReplaced() check present in the PermitUnload callback), and
// dereferences the null mWebProgress.

const TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

add_task(async function test_rapid_back_with_beforeunload_bfcache() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["fission.bfcacheInParent", true],
      // Navigation API must be enabled for MaybeCheckUnloadingIsCanceled.
      ["dom.navigation.webidl.enabled", true],
      // Keep the default (true) for this pref so that beforeunload dialogs
      // are suppressed in automated tests (no user interaction), while the
      // beforeunload handler is still registered and NeedsBeforeUnload()
      // returns true.
      ["dom.require_user_interaction_for_beforeunload", true],
    ],
  });

  // Run multiple iterations to increase the probability of hitting the race
  // window. The race depends on IPC message ordering between the beforeunload
  // check round-trip and the second navigation's HistoryGo arrival.
  const ITERATIONS = 10;

  for (let i = 0; i < ITERATIONS; i++) {
    info(`--- Iteration ${i + 1}/${ITERATIONS} ---`);

    let tab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      TEST_PATH + "dummy_page.html?page1"
    );
    let browser = tab.linkedBrowser;

    // Navigate to page2 (page1 goes to BFCache).
    BrowserTestUtils.startLoadingURIString(
      browser,
      TEST_PATH + "dummy_page.html?page2"
    );
    await BrowserTestUtils.browserLoaded(browser);

    // Navigate to page3 (page2 goes to BFCache).
    BrowserTestUtils.startLoadingURIString(
      browser,
      TEST_PATH + "dummy_page.html?page3"
    );
    await BrowserTestUtils.browserLoaded(browser);

    // Register a beforeunload handler on the current page. This makes
    // NeedsBeforeUnload() return true on the WindowGlobalParent, which causes
    // MaybeCheckUnloadingIsCanceled to take the async path when navigating
    // away. With dom.require_user_interaction_for_beforeunload = true and no
    // user interaction, no dialog is shown but the async IPC round-trip still
    // occurs.
    await SpecialPowers.spawn(browser, [], () => {
      content.addEventListener("beforeunload", e => {
        e.preventDefault();
      });
    });

    // Strategy: trigger two back navigations from the content process,
    // separated by one event loop turn so they get different history epochs
    // (the ChildSHistory epoch increments via a dispatched runnable between
    // event turns). Both navigations proceed to the parent's HistoryGo →
    // LoadURIs. The first enters the async MaybeCheckUnloadingIsCanceled
    // path. The second arrives while the first is pending.
    SpecialPowers.spawn(browser, [], () => {
      content.history.back();
      content.setTimeout(() => {
        content.history.back();
      }, 0);
    });

    // Wait for async callbacks and IPC round-trips to settle.
    // The crash, if triggered, happens during this window.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try a different strategy too: trigger goBack from the parent process
    // while a content-initiated back navigation may still be in flight.
    // First, set up fresh history again.
    BrowserTestUtils.startLoadingURIString(
      browser,
      TEST_PATH + "dummy_page.html?page4"
    );
    await BrowserTestUtils.browserLoaded(browser);

    BrowserTestUtils.startLoadingURIString(
      browser,
      TEST_PATH + "dummy_page.html?page5"
    );
    await BrowserTestUtils.browserLoaded(browser);

    await SpecialPowers.spawn(browser, [], () => {
      content.addEventListener("beforeunload", e => {
        e.preventDefault();
      });
    });

    // Trigger back from content and parent nearly simultaneously.
    // These use different IPC paths, potentially avoiding epoch dedup.
    SpecialPowers.spawn(browser, [], () => {
      content.history.back();
    });
    browser.goBack();

    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 1000));

    BrowserTestUtils.removeTab(tab);
  }

  ok(true, "Completed all iterations without crashing (bug 2011921)");
});
