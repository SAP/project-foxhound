/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

async function test_back_button(x, y) {
  // If the first button is the back button, set up history.
  let firstLocation =
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://example.org/browser/browser/base/content/test/general/dummy_page.html";
  await BrowserTestUtils.openNewForegroundTab(gBrowser, firstLocation);
  await ContentTask.spawn(gBrowser.selectedBrowser, {}, async function () {
    // Mark the first entry as having been interacted with.
    content.document.notifyUserGestureActivation();
    content.history.pushState("page2", "page2", "page2");
  });

  let popStatePromise = BrowserTestUtils.waitForContentEvent(
    gBrowser.selectedBrowser,
    "popstate",
    true
  );
  EventUtils.synthesizeMouseAtPoint(x, y, {}, window);
  await popStatePromise;
  is(
    gBrowser.selectedBrowser.currentURI.spec,
    firstLocation,
    "Clicking the first pixel should have navigated back."
  );
  gBrowser.removeCurrentTab();
}

async function test_sidebar_button(x, y) {
  // If the first button is the sidebar, check initial sidebar state
  let sidebarMain = document.getElementById("sidebar-main");
  let initialSidebarHiddenState = sidebarMain.hidden;

  EventUtils.synthesizeMouseAtPoint(x, y, {}, window);
  is(
    sidebarMain.hidden,
    !initialSidebarHiddenState,
    "Clicking the first pixel should toggle the sidebar"
  );

  // Ensure sidebar is put back into original state for following tests
  EventUtils.synthesizeMouseAtPoint(x, y, {}, window);
  is(
    sidebarMain.hidden,
    initialSidebarHiddenState,
    "Clicking the first pixel should toggle the sidebar"
  );
  Services.prefs.clearUserPref("browser.engagement.sidebar-button.has-used");
}

add_task(async function () {
  let navBarCustomizationTarget = document.getElementById(
    "nav-bar-customization-target"
  );
  // The first button in the nav bar could be either the back or sidebar button, depending
  // on whether sidebar.revamp is true and what OS we are using.
  let firstNavBarButton = navBarCustomizationTarget.childNodes[0].id;

  window.maximize();

  // Find where the nav-bar is vertically.
  var navBar = document.getElementById("nav-bar");
  var boundingRect = navBar.getBoundingClientRect();
  var yPixel = boundingRect.top + Math.floor(boundingRect.height / 2);
  var xPixel = 0; // Use the first pixel of the screen since it is maximized.

  if (firstNavBarButton == "back-button") {
    await test_back_button(xPixel, yPixel);
  } else if (firstNavBarButton == "sidebar-button") {
    await test_sidebar_button(xPixel, yPixel);
  }

  window.restore();
});
