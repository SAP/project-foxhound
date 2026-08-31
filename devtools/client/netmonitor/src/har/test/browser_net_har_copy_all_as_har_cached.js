/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test covers a fix (see Bug 1995694) where reloading pages with js sources
 * when the cache is enabled throws an error which then causes copy all as har
 * to break (see Bug 1995746).
 */

add_task(async function () {
  // Disable tcp fast open, because it is setting a response header indicator
  // (bug 1352274). TCP Fast Open is not present on all platforms therefore the
  // number of response headers will vary depending on the platform.
  await pushPref("network.tcp.tcp_fastopen_enable", false);

  info("Tests multiple reloads of html which contains a JS bundle");
  const { monitor } = await initNetMonitor(SOURCEMAP_URL, {
    enableCache: true,
  });

  info("Reload the browser at least 4 times to trigger the error");
  let runs = 4;
  while (runs > 0) {
    const wait = waitForNetworkEvents(monitor, 4);
    info(`Reload the browser (run ${5 - runs})`);
    await reloadSelectedTab();
    info(`Wait for network events (run ${5 - runs})`);
    await wait;
    --runs;
  }

  info("Try to copy all as HAR");
  const har = await copyAllAsHARWithContextMenu(monitor);
  isnot(har.log, null, "The HAR log must exist");
  await teardown(monitor);
});
