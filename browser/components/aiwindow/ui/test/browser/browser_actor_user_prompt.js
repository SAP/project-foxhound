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
 * Test if the error component shows the generic message after the error is thrown
 */
add_task(async function test_error_shows_on_assistant_error() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    const actor =
      browser.browsingContext.currentWindowGlobal.getActor("AIChatContent");

    const errorMessage = {
      role: "",
      content: { isError: true, status: 400 },
    };

    await actor.dispatchMessageToChatContent(errorMessage);

    await SpecialPowers.spawn(browser, [], async () => {
      const contentEl = content.document.querySelector("ai-chat-content");
      await contentEl.updateComplete;

      let errorEl;
      await ContentTaskUtils.waitForMutationCondition(
        contentEl.shadowRoot,
        { childList: true, subtree: true },
        () => {
          errorEl = contentEl.shadowRoot.querySelector("chat-assistant-error");
          return errorEl;
        }
      );
      Assert.ok(errorEl, "chat-assistant-error component exists");

      const errorHeader = errorEl.shadowRoot?.querySelector(
        ".chat-assistant-error__header"
      );
      Assert.ok(errorHeader, "chat-assistant-error header prop exists");
      Assert.equal(
        errorHeader.getAttribute("data-l10n-id"),
        "smartwindow-assistant-error-generic-header",
        "chat-assistant-error header has the correct text"
      );
    });

    /* simulating a user prompt to test if the error message is hidden */
    const userPrompt = {
      role: "user",
      content: { body: "Show loader please" },
    };
    await actor.dispatchMessageToChatContent(userPrompt);

    await SpecialPowers.spawn(browser, [], async () => {
      const contentEl = content.document.querySelector("ai-chat-content");
      await contentEl.updateComplete;

      const errorEl = contentEl.shadowRoot.querySelector(
        "chat-assistant-error"
      );
      Assert.ok(!errorEl, "chat-assistant-error component no longer exists");
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
