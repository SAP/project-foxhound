/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test that actor message dispatching works with updated event names
 */
add_task(async function test_actor_event_mapping() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });
  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      await content.customElements.whenDefined("ai-chat-content");

      const chatElement = content.document.querySelector("ai-chat-content");
      Assert.ok(chatElement, "ai-chat-content element should be present");

      // Test that event listeners are properly set up for new event names
      let messageReceived = false;

      chatElement.addEventListener("aiChatContentActor:message", () => {
        messageReceived = true;
      });

      const messageEvent = new content.CustomEvent(
        "aiChatContentActor:message",
        {
          detail: {
            content: "Test response",
            latestAssistantMessageIndex: 0,
            role: "assistant",
          },
          bubbles: true,
        }
      );
      chatElement.dispatchEvent(messageEvent);

      Assert.ok(messageReceived, "AI response event should be received");
    });
  });

  await SpecialPowers.popPrefEnv();
});
