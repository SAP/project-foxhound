/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Test that slow heuristic results are still waited for on selection.

"use strict";

add_task(async function test_slow_heuristic() {
  // Must be between chunkResultsDelayMs and DEFERRING_TIMEOUT_MS
  let timeout = 150;
  Assert.greater(timeout, ProvidersManager.chunkResultsDelayMs);
  Assert.greater(UrlbarEventBufferer.DEFERRING_TIMEOUT_MS, timeout);

  // First, add a provider that adds a heuristic result on a delay.
  let heuristicResult = new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.URL,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    heuristic: true,
    payload: { url: "https://example.com/" },
  });
  let heuristicProvider = new UrlbarTestUtils.TestProvider({
    results: [heuristicResult],
    name: "heuristicProvider",
    priority: Infinity,
    addTimeout: timeout,
  });
  let providersManager = ProvidersManager.getInstanceForSap("urlbar");
  providersManager.registerProvider(heuristicProvider);
  registerCleanupFunction(() => {
    providersManager.unregisterProvider(heuristicProvider);
  });

  // Do a search without waiting for a result.
  const win = await BrowserTestUtils.openNewBrowserWindow();
  let promiseLoaded = BrowserTestUtils.browserLoaded(
    win.gBrowser.selectedBrowser
  );

  win.gURLBar.focus();
  EventUtils.sendString("test", win);
  EventUtils.synthesizeKey("KEY_Enter", {}, win);
  await promiseLoaded;

  await UrlbarTestUtils.promisePopupClose(win);
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function test_fast_heuristic() {
  let longTimeoutMs = 1000000;
  let originalHeuristicTimeout = ProvidersManager.chunkResultsDelayMs;
  ProvidersManager.chunkResultsDelayMs = longTimeoutMs;
  registerCleanupFunction(() => {
    ProvidersManager.chunkResultsDelayMs = originalHeuristicTimeout;
  });

  // Add a fast heuristic provider.
  let heuristicResult = new UrlbarResult({
    type: UrlbarUtils.RESULT_TYPE.URL,
    source: UrlbarUtils.RESULT_SOURCE.OTHER_LOCAL,
    heuristic: true,
    payload: { url: "https://example.com/" },
  });
  let heuristicProvider = new UrlbarTestUtils.TestProvider({
    results: [heuristicResult],
    name: "heuristicProvider",
    priority: Infinity,
  });
  let providersManager = ProvidersManager.getInstanceForSap("urlbar");
  providersManager.registerProvider(heuristicProvider);
  registerCleanupFunction(() => {
    providersManager.unregisterProvider(heuristicProvider);
  });

  // Do a search.
  const win = await BrowserTestUtils.openNewBrowserWindow();

  let startTime = ChromeUtils.now();
  Assert.greater(
    longTimeoutMs,
    ChromeUtils.now() - startTime,
    "Heuristic result is returned faster than chunkResultsDelayMs"
  );

  await UrlbarTestUtils.promisePopupClose(win);
  await BrowserTestUtils.closeWindow(win);
});
