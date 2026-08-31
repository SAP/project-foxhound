/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Test that _popupshownListener is cleaned up if the panel is hidden before
// popupshown fires, preventing leaks of notification references.

async function showAndHide(hideBeforeShown) {
  let shownFired = false;
  let panel = PopupNotifications.panel;
  panel.addEventListener("popupshown", () => (shownFired = true), {
    once: true,
  });

  let notification = PopupNotifications.show(
    gBrowser.selectedBrowser,
    "test-popupshown-leak",
    "Test notification",
    null,
    { label: "OK", accessKey: "O", callback() {} },
    null,
    { removeOnDismissal: true }
  );

  if (hideBeforeShown) {
    await BrowserTestUtils.waitForEvent(panel, "popupshowing");
  } else {
    await BrowserTestUtils.waitForEvent(panel, "popupshown");
  }

  let hiddenPromise = BrowserTestUtils.waitForEvent(panel, "popuphidden");
  panel.hidePopup();
  await hiddenPromise;

  Assert.equal(
    shownFired,
    !hideBeforeShown,
    `popupshown should ${hideBeforeShown ? "not " : ""}have fired`
  );
  Assert.ok(
    !PopupNotifications._popupshownListener,
    "_popupshownListener should be null after panel is hidden"
  );

  notification.remove();
}

add_task(async function test_cleanup_on_early_hide() {
  await BrowserTestUtils.withNewTab("about:blank", () => showAndHide(true));
});

add_task(async function test_normal_show_and_hide() {
  await BrowserTestUtils.withNewTab("about:blank", () => showAndHide(false));
});
