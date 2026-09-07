/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_beta_badge_in_window_switcher() {
  let button = document.getElementById("ai-window-toggle");
  let view = PanelMultiView.getViewNode(document, "ai-window-toggle-view");

  let viewShownPromise = BrowserTestUtils.waitForEvent(view, "ViewShown");
  EventUtils.synthesizeMouseAtCenter(button, {}, window);
  await viewShownPromise;

  let badge = view.querySelector("#ai-window-switch-ai moz-badge");

  await BrowserTestUtils.waitForMutationCondition(
    badge.shadowRoot,
    { childList: true, subtree: true, characterData: true },
    () => badge.shadowRoot.querySelector(".moz-badge-label")?.textContent
  );

  Assert.ok(
    BrowserTestUtils.isVisible(badge),
    "Beta badge should be visible in the window switcher"
  );

  PanelUI.panel.hidePopup();
});

add_task(async function test_beta_badge_in_app_menu() {
  let appMenuShownPromise = BrowserTestUtils.waitForEvent(
    PanelUI.panel,
    "ViewShown"
  );
  PanelUI.show();
  await appMenuShownPromise;

  let badge = document.querySelector("#appMenu-new-ai-window-button moz-badge");

  await BrowserTestUtils.waitForMutationCondition(
    badge.shadowRoot,
    { childList: true, subtree: true, characterData: true },
    () => badge.shadowRoot.querySelector(".moz-badge-label")?.textContent
  );

  Assert.ok(
    BrowserTestUtils.isVisible(badge),
    "Beta badge should be visible in the app menu"
  );

  await PanelUI.hide();
});

add_task(async function test_beta_badge_in_fullpage_heading() {
  const win = await openAIWindow();
  const browser = win.gBrowser.selectedBrowser;

  await SpecialPowers.spawn(browser, [], async () => {
    const aiWindow = content.document.querySelector("ai-window");

    let heading = await ContentTaskUtils.waitForCondition(
      () => aiWindow.shadowRoot?.querySelector("smartwindow-heading"),
      "Wait for fullpage heading"
    );

    let badge = heading.shadowRoot.querySelector("moz-badge");

    await ContentTaskUtils.waitForCondition(
      () => badge.shadowRoot?.querySelector(".moz-badge-label")?.textContent,
      "Badge label should render"
    );

    Assert.ok(
      badge.checkVisibility(),
      "Beta badge should be visible in the fullpage heading"
    );

    // Heading (and its badge) should hide when a chat is active.
    aiWindow.classList.add("chat-active");

    await ContentTaskUtils.waitForCondition(
      () => !heading.checkVisibility(),
      "Heading with badge should be hidden when chat is active"
    );

    aiWindow.classList.remove("chat-active");

    await ContentTaskUtils.waitForCondition(
      () => heading.checkVisibility(),
      "Heading with badge should reappear when chat-active is removed"
    );
  });

  await BrowserTestUtils.closeWindow(win);
});
