/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

async function setupChatContent() {
  const restoreSignIn = skipSignIn();
  const { restore } = await stubEngineNetworkBoundaries({
    serverOptions: { streamChunks: ["Hello from mock."] },
  });
  return { restoreSignIn, restore };
}

/**
 * Test that the overflowing attribute shows up when the scrollbar is visible
 */
add_task(async function test_scrolling_and_overflowing_attribute() {
  const { restoreSignIn, restore } = await setupChatContent();

  try {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    const aiWindowEl = browser.contentDocument?.querySelector("ai-window");
    const aichatBrowser = await TestUtils.waitForCondition(
      () => aiWindowEl.shadowRoot?.querySelector("#aichat-browser"),
      "Wait for aichat-browser"
    );

    for (let i = 0; i < 3; i++) {
      await typeInSmartbar(browser, "Message " + i);
      await submitSmartbar(browser);

      await SpecialPowers.spawn(aichatBrowser, [i], async msgIndex => {
        const chatContent = content.document.querySelector("ai-chat-content");
        await ContentTaskUtils.waitForMutationCondition(
          chatContent.shadowRoot,
          { childList: true, subtree: true },
          () =>
            chatContent.shadowRoot.querySelectorAll(".chat-bubble-assistant")
              .length >=
            msgIndex + 1
        );
      });
    }

    await SpecialPowers.spawn(aichatBrowser, [], async () => {
      const chatContent = content.document.querySelector("ai-chat-content");
      const chatContentWrapper = chatContent.shadowRoot.querySelector(
        ".chat-content-wrapper"
      );

      Assert.ok(chatContentWrapper, "chat-content-wrapper should exist");
      await ContentTaskUtils.waitForCondition(
        () => chatContentWrapper.hasAttribute("overflowing"),
        "Wait for overflowing attribute"
      );

      Assert.ok(
        chatContentWrapper.hasAttribute("overflowing"),
        "chat-content-wrapper should have the overflowing attribute"
      );

      // Bug 2037529: a scrollable region is inherently tab-focusable so it can
      // be scrolled with the keyboard, which produced a 'blank' focus stop
      // between the chat header and the first chat element. The explicit
      // tabindex="-1" opts out of that behavior.
      Assert.equal(
        chatContentWrapper.getAttribute("tabindex"),
        "-1",
        "chat-content-wrapper must opt out of scrollable-region tab focus"
      );
    });

    await BrowserTestUtils.closeWindow(win);
  } finally {
    restoreSignIn();
    await restore();
  }
});

/**
 * Test that the overflowing attribute DOESN'T show up when the scrollbar is NOT visible
 */
add_task(async function test_no_scrolling_and_no_overflowing_attribute() {
  const { restoreSignIn, restore } = await setupChatContent();

  try {
    const win = await openAIWindow();
    const browser = win.gBrowser.selectedBrowser;

    await typeInSmartbar(
      browser,
      "hello this should be a short message that doesn't trigger the overflowing attribute."
    );
    await submitSmartbar(browser);

    const aiWindowEl = browser.contentDocument?.querySelector("ai-window");
    const aichatBrowser = await TestUtils.waitForCondition(
      () => aiWindowEl.shadowRoot?.querySelector("#aichat-browser"),
      "Wait for aichat-browser"
    );

    await SpecialPowers.spawn(aichatBrowser, [], async () => {
      const chatContent = content.document.querySelector("ai-chat-content");

      await ContentTaskUtils.waitForMutationCondition(
        chatContent.shadowRoot,
        { childList: true, subtree: true, attributes: true },
        () => chatContent.shadowRoot.querySelector(".chat-content-wrapper")
      );

      const chatContentWrapper = chatContent.shadowRoot.querySelector(
        ".chat-content-wrapper"
      );
      Assert.ok(chatContentWrapper, "chat-content-wrapper should exist");
      Assert.ok(
        !chatContentWrapper.hasAttribute("overflowing"),
        "chat-content-wrapper should NOT have the overflowing attribute"
      );
    });

    await BrowserTestUtils.closeWindow(win);
  } finally {
    restoreSignIn();
    await restore();
  }
});
