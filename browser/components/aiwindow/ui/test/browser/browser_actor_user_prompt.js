/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test user prompt dispatch through updated actor system
 */
add_task(async function test_user_prompt_dispatch() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    const actor =
      browser.browsingContext.currentWindowGlobal.getActor("AIChatContent");

    // Test that dispatchUserPrompt method exists and can be called
    const testPrompt = {
      role: "user",
      content: "Hello, AI!",
    };
    const result = await actor.dispatchMessageToChatContent(testPrompt);

    // The method should return true for successful dispatch
    Assert.equal(
      result,
      undefined, // actor is async instead of query now?
      "dispatchUserPrompt should complete successfully"
    );
  });
});

/**
 * Test updated AI response dispatch method works correctly
 */
add_task(async function test_streaming_ai_response() {
  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    const actor =
      browser.browsingContext.currentWindowGlobal.getActor("AIChatContent");

    // Test streaming response format
    const streamingResponse = {
      role: "assistant",
      content: "Partial AI response...",
      latestAssistantMessageIndex: 0,
    };

    const result = await actor.dispatchMessageToChatContent(streamingResponse);
    Assert.equal(
      result,
      undefined, // actor is async instead of query now?
      "Streaming AI response should be dispatched successfully"
    );
  });

  await SpecialPowers.popPrefEnv();
});

/**
 * Test that the loader does not show when a previous user message is dispatched
 * (e.g. on tab select or conversation reload)
 */
add_task(async function test_loader_does_not_show_for_previous_user_message() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    const actor =
      browser.browsingContext.currentWindowGlobal.getActor("AIChatContent");

    await actor.dispatchMessageToChatContent({
      role: "user",
      content: { body: "Previous message" },
      convId: "test-conv-id",
      ordinal: 0,
      isPreviousMessage: true,
    });

    await SpecialPowers.spawn(browser, [], async () => {
      const contentEl = content.document.querySelector("ai-chat-content");
      await contentEl.updateComplete;

      const loaderEl = contentEl.shadowRoot.querySelector(
        "chat-assistant-loader"
      );
      Assert.ok(
        !loaderEl,
        "Loader should not appear when replaying previous user messages"
      );
    });
  });

  await SpecialPowers.popPrefEnv();
});

/**
 * Test if the loader shows after the user prompt is submitted
 */
add_task(async function test_loader_shows_on_user_submit() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    const actor =
      browser.browsingContext.currentWindowGlobal.getActor("AIChatContent");

    const userPrompt = {
      role: "user",
      content: { body: "Show loader please" },
    };
    await actor.dispatchMessageToChatContent(userPrompt);
    actor.setGeneratingOnChatContent(true);

    await SpecialPowers.spawn(browser, [], async () => {
      const contentEl = content.document.querySelector("ai-chat-content");
      await contentEl.updateComplete;

      let loaderEl;
      await ContentTaskUtils.waitForMutationCondition(
        contentEl.shadowRoot,
        { childList: true, subtree: true },
        () => {
          loaderEl = contentEl.shadowRoot.querySelector(
            "chat-assistant-loader"
          );
          return loaderEl;
        }
      );
      Assert.ok(loaderEl, "Loader element exists");

      const inner = loaderEl.shadowRoot?.querySelector(
        ".chat-assistant-loader"
      );
      Assert.ok(inner, "Loader has the correct content");
    });
  });

  await SpecialPowers.popPrefEnv();
});

/**
 * Regression: intermediate assistant-message-complete events (e.g. from a
 * tool-call sub-response mid-turn) should not hide the loader. Loader
 * visibility is driven solely by setGeneratingOnChatContent.
 */
add_task(
  async function test_loader_persists_through_intermediate_message_complete() {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.enabled", true]],
    });

    await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
      const actor =
        browser.browsingContext.currentWindowGlobal.getActor("AIChatContent");

      actor.setGeneratingOnChatContent(true);

      await SpecialPowers.spawn(browser, [], async () => {
        const contentEl = content.document.querySelector("ai-chat-content");
        await ContentTaskUtils.waitForMutationCondition(
          contentEl.shadowRoot,
          { childList: true, subtree: true },
          () => contentEl.shadowRoot.querySelector("chat-assistant-loader")
        );
        Assert.ok(
          contentEl.shadowRoot.querySelector("chat-assistant-loader"),
          "Loader appears when isGenerating is true"
        );
      });

      await actor.dispatchMessageToChatContent({
        role: "assistant-message-complete",
        content: { id: "intermediate-msg-id" },
      });

      await SpecialPowers.spawn(browser, [], async () => {
        const contentEl = content.document.querySelector("ai-chat-content");
        await contentEl.updateComplete;
        Assert.ok(
          contentEl.shadowRoot.querySelector("chat-assistant-loader"),
          "Loader stays visible after intermediate assistant-message-complete"
        );
      });

      actor.setGeneratingOnChatContent(false);

      await SpecialPowers.spawn(browser, [], async () => {
        const contentEl = content.document.querySelector("ai-chat-content");
        await ContentTaskUtils.waitForCondition(
          () => !contentEl.shadowRoot.querySelector("chat-assistant-loader"),
          "Loader hides when isGenerating becomes false"
        );
      });
    });

    await SpecialPowers.popPrefEnv();
  }
);
