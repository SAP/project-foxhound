/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test that the jump-to-bottom button exists and starts hidden/disabled.
 */
add_task(async function test_jump_to_bottom_button_initial_state() {
  const { win, sidebarBrowser } = await openAIWindowWithSidebar();

  try {
    const aiWindow = await TestUtils.waitForCondition(
      () => sidebarBrowser.contentDocument?.querySelector("ai-window"),
      "Wait for ai-window element"
    );
    const aichatBrowser = await TestUtils.waitForCondition(
      () => aiWindow.shadowRoot?.querySelector("#aichat-browser"),
      "Wait for #aichat-browser element"
    );
    if (aichatBrowser.currentURI?.spec !== "about:aichatcontent") {
      await BrowserTestUtils.browserLoaded(aichatBrowser);
    }

    await SpecialPowers.spawn(aichatBrowser, [], async () => {
      const chatContent = await ContentTaskUtils.waitForCondition(
        () => content.document.querySelector("ai-chat-content"),
        "Wait for ai-chat-content"
      );
      await chatContent.updateComplete;

      const btn = chatContent.shadowRoot.querySelector(
        ".jump-to-bottom-button"
      );
      Assert.ok(btn, "Jump-to-bottom button should exist");
      Assert.ok(btn.hasAttribute("disabled"), "Button should start disabled");
      Assert.ok(
        !btn.hasAttribute("visible"),
        "Button should not have visible attribute initially"
      );
      Assert.equal(
        btn.getAttribute("data-l10n-id"),
        "aiwindow-jump-to-bottom",
        "Button should have correct l10n ID"
      );
    });
  } finally {
    await BrowserTestUtils.closeWindow(win);
  }
});

/**
 * Test that the button becomes visible after scrolling up past threshold,
 * and clicking it scrolls to bottom and hides the button.
 */
add_task(async function test_jump_to_bottom_scroll_and_click() {
  const { win, sidebarBrowser } = await openAIWindowWithSidebar();

  try {
    const aiWindow = await TestUtils.waitForCondition(
      () => sidebarBrowser.contentDocument?.querySelector("ai-window"),
      "Wait for ai-window element"
    );
    const aichatBrowser = await TestUtils.waitForCondition(
      () => aiWindow.shadowRoot?.querySelector("#aichat-browser"),
      "Wait for #aichat-browser element"
    );
    if (aichatBrowser.currentURI?.spec !== "about:aichatcontent") {
      await BrowserTestUtils.browserLoaded(aichatBrowser);
    }

    await SpecialPowers.spawn(aichatBrowser, [], async () => {
      const chatContent = await ContentTaskUtils.waitForCondition(
        () => content.document.querySelector("ai-chat-content"),
        "Wait for ai-chat-content"
      );
      const chatContentJS = chatContent.wrappedJSObject || chatContent;
      await chatContent.updateComplete;

      const wrapper = chatContent.shadowRoot.querySelector(
        ".chat-content-wrapper"
      );
      const btn = chatContent.shadowRoot.querySelector(
        ".jump-to-bottom-button"
      );

      wrapper.style.scrollBehavior = "auto";

      // Inject messages to create overflow.
      const messages = [];
      for (let i = 0; i < 20; i++) {
        messages[i] = {
          role: i % 2 === 0 ? "user" : "assistant",
          body: `Test message ${i}. `.repeat(5),
          convId: "test-conv",
          ordinal: i,
          ...(i % 2 !== 0
            ? { messageId: `msg-${i}`, appliedMemories: [] }
            : {}),
        };
      }
      chatContentJS.conversationState = Cu.cloneInto(messages, content);
      await chatContent.updateComplete;

      await ContentTaskUtils.waitForCondition(
        () => wrapper.scrollHeight > wrapper.clientHeight,
        "Chat content should overflow"
      );

      // Verify the exact 50% viewport threshold boundary.
      const threshold = wrapper.clientHeight * 0.5;
      const maxScroll = wrapper.scrollHeight - wrapper.clientHeight;

      wrapper.scrollTop = Math.ceil(maxScroll - threshold);
      await new Promise(r => content.requestAnimationFrame(r));
      await new Promise(r => content.requestAnimationFrame(r));
      Assert.ok(
        !btn.hasAttribute("visible"),
        "Button should be hidden when exactly at the 50% threshold"
      );

      // One pixel past the threshold, button should appear.
      wrapper.scrollTop = maxScroll - threshold - 1;
      await new Promise(r => content.requestAnimationFrame(r));
      await new Promise(r => content.requestAnimationFrame(r));
      Assert.ok(
        btn.hasAttribute("visible"),
        "Button should be visible when scrolled just past the 50% threshold"
      );

      // Scroll to bottom first (simulates auto-scroll on new messages),
      // then to top so both scroll events actually fire.
      wrapper.scrollTop = wrapper.scrollHeight;
      await new Promise(r => content.requestAnimationFrame(r));
      wrapper.scrollTop = 0;

      await ContentTaskUtils.waitForCondition(
        () => btn.hasAttribute("visible"),
        "Button should become visible after scrolling up"
      );
      Assert.ok(
        !btn.hasAttribute("disabled"),
        "Button should not be disabled when visible"
      );

      btn.click();

      await ContentTaskUtils.waitForCondition(
        () => !btn.hasAttribute("visible"),
        "Button should hide after clicking to scroll to bottom"
      );
      Assert.ok(
        btn.hasAttribute("disabled"),
        "Button should be disabled when hidden"
      );
      Assert.ok(
        wrapper.hasAttribute("scrolled-to-bottom"),
        "Wrapper should have scrolled-to-bottom attribute at bottom"
      );
    });
  } finally {
    await BrowserTestUtils.closeWindow(win);
  }
});
