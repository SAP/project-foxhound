/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

add_task(async function test_select_popup_closing_enables_pointer_events() {
  const INITIAL_PAGE = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Initial Page</title>
</head>
<body>
  <h1 id="heading">Initial Page</h1>
  <button id="testbutton">Click Me</button>
  <script>
    window.addEventListener("unload", () => {});
  </script>
</body>
</html>
`;

  const SELECT_PAGE = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Select Page</title>
</head>
<body>
  <select id="testselect">
    <option>Option 1</option>
    <option>Option 2</option>
    <option>Option 3</option>
  </select>
  <script>
    window.addEventListener("unload", () => {});
  </script>
</body>
</html>
`;

  const initialUrl = "data:text/html," + encodeURI(INITIAL_PAGE);
  const selectUrl = "data:text/html," + encodeURI(SELECT_PAGE);

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: initialUrl,
    },
    async function (browser) {
      // Navigate to the page with the select element
      let loaded = BrowserTestUtils.browserLoaded(browser, false, selectUrl);
      BrowserTestUtils.startLoadingURIString(browser, selectUrl);
      await loaded;

      // Focus the select element
      await SpecialPowers.spawn(browser, [], async () => {
        const select = content.document.getElementById("testselect");
        const focusPromise = new Promise(resolve => {
          select.addEventListener("focus", resolve, { once: true });
        });
        select.focus();
        await focusPromise;
      });

      // Open the select popup
      let popup = await openSelectPopup("key");
      ok(popup, "Select popup should be open");

      // Verify popup is showing
      is(popup.state, "open", "Popup should be in open state");

      // Verify that pointer events are disabled on the browser while popup is open
      is(
        browser.style.pointerEvents,
        "none",
        "Browser pointer events should be disabled while popup is open"
      );

      // There are some race conditions when the popup might get hidden, so
      // for consistency prevent that always when navigating back.
      function preventDefault(event) {
        event.preventDefault();
      }
      popup.addEventListener("popuphiding", preventDefault);

      // Wait for pageshow event to know when navigation completes
      let pageshown = BrowserTestUtils.waitForContentEvent(browser, "pageshow");

      // Dispatch AppCommand "Back" event to mimic the behavior a hardware back
      // button on a mouse does.
      let commandEvent = new CommandEvent("AppCommand", {
        bubbles: true,
        cancelable: true,
        command: "Back",
      });
      document.documentElement.dispatchEvent(commandEvent);

      // Wait for back navigation to complete
      await pageshown;

      // Popup should still be open after navigation
      is(
        popup.state,
        "open",
        "Popup should still be open after back navigation"
      );

      popup.removeEventListener("popuphiding", preventDefault);

      // Now dispatch ESC to close the popup
      // This should not throw an exception even though the actor is invalid
      EventUtils.synthesizeKey("KEY_Escape", {}, window);

      // Wait for the popup to close
      await TestUtils.waitForCondition(
        () => popup.state === "closed",
        "Waiting for popup to close after ESC",
        100,
        50
      );

      ok(true, "Popup closed without throwing exception");

      // Verify that pointer events are restored on the browser after popup closes
      is(
        browser.style.pointerEvents,
        "",
        "Browser pointer events should be restored after popup closes"
      );

      // Verify that mouse events dispatched in parent process can reach the page
      // Set up click listener in content on the window
      let clickReceivedPromise = BrowserTestUtils.waitForContentEvent(
        browser,
        "click"
      );

      // We intentionally turn off this a11y check, because the following click
      // is sent on an arbitrary web content that is not expected to be tested
      // by itself with the browser mochitests, therefore this rule check shall
      // be ignored by a11y-checks suite.
      AccessibilityUtils.setEnv({ mustHaveAccessibleRule: false });

      // Dispatch mouse click in parent process at center of browser element
      EventUtils.synthesizeMouseAtCenter(browser, {}, window);
      AccessibilityUtils.resetEnv();

      let clickReceived = await clickReceivedPromise;
      ok(
        clickReceived,
        "Mouse events should reach the page after popup closes"
      );
    }
  );
});
