/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

async function handleCommandLine(args, state) {
  const target = args.at(-1);

  const workingDir = Services.dirsvc.get("CurWorkD", Ci.nsIFile);
  const fakeCmdLine = Cu.createCommandLine(args, workingDir, state);

  const cmdLineHandler = Cc["@mozilla.org/browser/final-clh;1"].getService(
    Ci.nsICommandLineHandler
  );

  if (Ci.nsICommandLine.STATE_INITIAL_LAUNCH == state) {
    const newWinPromise = BrowserTestUtils.waitForNewWindow({
      waitForAnyURLLoaded: false,
    });

    cmdLineHandler.handle(fakeCmdLine);

    let newWin = await newWinPromise;
    await BrowserTestUtils.waitForDocLoadAndStopIt(
      target,
      newWin.gBrowser.selectedBrowser
    );
    await BrowserTestUtils.closeWindow(newWin);
    return;
  }

  if (Ci.nsICommandLine.STATE_REMOTE_EXPLICIT == state) {
    let openedTab;
    const stopLoadPromise = new Promise(resolve => {
      const onTabOpen = async event => {
        gBrowser.tabContainer.removeEventListener("TabOpen", onTabOpen);
        openedTab = event.target;

        resolve(
          await BrowserTestUtils.waitForDocLoadAndStopIt(
            target,
            openedTab.linkedBrowser
          )
        );
      };

      gBrowser.tabContainer.addEventListener("TabOpen", onTabOpen, {
        once: false,
      });
    });

    cmdLineHandler.handle(fakeCmdLine);

    await stopLoadPromise;
    BrowserTestUtils.removeTab(openedTab);
    return;
  }

  Assert.ok(false, "Unsupported state.");
}

add_setup(async function () {
  // Ensure that these tests start in a clean Glean environment.
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
});

// Returns the number of times the specified search activation occurred or 0 if
// no data is available for the given label.
function getWindowsStartSearchActivationCount(label) {
  return (
    Glean.browserEngagement.windowsStartSearchActivationCount[
      label
    ].testGetValue() ?? 0
  );
}

add_task(async function test_launched_unlike_windows_search_no_osint() {
  let label = "startup";
  let counterBefore = getWindowsStartSearchActivationCount(label);
  await handleCommandLine(
    ["-url", "https://bing.com/search?q=test"],
    Ci.nsICommandLine.STATE_INITIAL_LAUNCH
  );
  Assert.equal(
    getWindowsStartSearchActivationCount(label),
    counterBefore,
    `Does not increase a telemetry counter labeled "${label}" when called without -osint.`
  );
});

add_task(async function test_launched_unlike_windows_search_not_bing() {
  for (let label of ["startup", "new_tab"]) {
    let counterBefore = getWindowsStartSearchActivationCount(label);
    await handleCommandLine(
      ["-osint", "-url", "https://example.com/search?q=test"],
      Ci.nsICommandLine.STATE_INITIAL_LAUNCH
    );
    Assert.equal(
      getWindowsStartSearchActivationCount(label),
      counterBefore,
      `Does not increase the ${label} telemetry counter when the domain is not bing.`
    );
  }
});

add_task(async function test_launched_unlike_windows_search_no_search_path() {
  let label = "startup";
  let counterBefore = getWindowsStartSearchActivationCount(label);
  await handleCommandLine(
    ["-osint", "-url", "https://bing.com/"],
    Ci.nsICommandLine.STATE_INITIAL_LAUNCH
  );
  Assert.equal(
    getWindowsStartSearchActivationCount(label),
    counterBefore,
    `Does not increase a telemetry counter labeled "${label}" when called without /search path.`
  );
});

add_task(async function test_launched_like_windows_search() {
  let label = "startup";
  let counterBefore = getWindowsStartSearchActivationCount(label);
  await handleCommandLine(
    ["-osint", "-url", "https://bing.com/search?q=test"],
    Ci.nsICommandLine.STATE_INITIAL_LAUNCH
  );
  Assert.equal(
    getWindowsStartSearchActivationCount(label),
    counterBefore + 1,
    `Increases a telemetry counter labeled "${label}" when called with the /search path.`
  );
});

add_task(async function test_invoked_like_windows_search() {
  let label = "new_tab";
  let counterBefore = getWindowsStartSearchActivationCount(label);
  await handleCommandLine(
    ["-osint", "-url", "https://bing.com/search?q=test"],
    Ci.nsICommandLine.STATE_REMOTE_EXPLICIT
  );
  Assert.equal(
    getWindowsStartSearchActivationCount(label),
    counterBefore + 1,
    `Increases a telemetry counter labeled "${label}" when called with the /search path.`
  );
});
