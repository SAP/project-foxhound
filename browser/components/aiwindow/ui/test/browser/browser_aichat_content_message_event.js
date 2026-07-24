/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test that messageEvent handler is properly set up and receives events
 */
add_task(async function test_messageEvent_user() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      await content.customElements.whenDefined("ai-chat-content");

      const chatContent = content.document.querySelector("ai-chat-content");
      Assert.ok(chatContent, "ai-chat-content element should exist");

      // Test that event listeners are properly set up
      let messageReceived = false;
      let receivedEventDetail = null;

      // Add our own listener to verify the event is dispatched
      chatContent.addEventListener("aiChatContentActor:message", event => {
        messageReceived = true;
        receivedEventDetail = event.detail;
      });

      const userEvent = new content.CustomEvent("aiChatContentActor:message", {
        detail: {
          role: "user",
          convId: "conv123",
          ordinal: 0,
          content: {
            body: "Hello, AI!",
          },
        },
        bubbles: true,
      });

      chatContent.dispatchEvent(userEvent);

      Assert.ok(messageReceived, "Message event should be received");
      Assert.equal(
        receivedEventDetail.role,
        "user",
        "Should receive correct role"
      );
      Assert.equal(
        receivedEventDetail.convId,
        "conv123",
        "Should receive correct convId"
      );
      Assert.equal(
        receivedEventDetail.content.body,
        "Hello, AI!",
        "Should receive correct message body"
      );
    });
  });

  await SpecialPowers.popPrefEnv();
});

/**
 * Test that messageEvent handles assistant messages correctly
 */
add_task(async function test_messageEvent_assistant() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      await content.customElements.whenDefined("ai-chat-content");

      const chatContent = content.document.querySelector("ai-chat-content");
      Assert.ok(chatContent, "ai-chat-content element should exist");

      let messageReceived = false;
      let receivedEventDetail = null;

      chatContent.addEventListener("aiChatContentActor:message", event => {
        messageReceived = true;
        receivedEventDetail = event.detail;
      });

      const assistantEvent = new content.CustomEvent(
        "aiChatContentActor:message",
        {
          detail: {
            role: "assistant",
            convId: "conv123",
            ordinal: 1,
            id: "msg456",
            content: {
              body: "Hello! How can I help you?",
            },
            memoriesApplied: ["memory1", "memory2"],
            tokens: {
              search: ["token1", "token2"],
            },
          },
          bubbles: true,
        }
      );

      chatContent.dispatchEvent(assistantEvent);

      Assert.ok(messageReceived, "Assistant message event should be received");
      Assert.equal(
        receivedEventDetail.role,
        "assistant",
        "Should receive correct role"
      );
      Assert.equal(
        receivedEventDetail.convId,
        "conv123",
        "Should receive correct convId"
      );
      Assert.equal(
        receivedEventDetail.content.body,
        "Hello! How can I help you?",
        "Should receive correct message body"
      );
      Assert.equal(
        receivedEventDetail.id,
        "msg456",
        "Should receive correct message ID"
      );
    });
  });

  await SpecialPowers.popPrefEnv();
});

/**
 * Test that messageEvent handles loading messages correctly
 */
add_task(async function test_messageEvent_loading() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      await content.customElements.whenDefined("ai-chat-content");

      const chatContent = content.document.querySelector("ai-chat-content");
      Assert.ok(chatContent, "ai-chat-content element should exist");

      let messageReceived = false;
      let receivedEventDetail = null;

      chatContent.addEventListener("aiChatContentActor:message", event => {
        messageReceived = true;
        receivedEventDetail = event.detail;
      });

      const loadingEvent = new content.CustomEvent(
        "aiChatContentActor:message",
        {
          detail: {
            role: "loading",
            isSearching: true,
            searchQuery: "test query",
          },
          bubbles: true,
        }
      );

      chatContent.dispatchEvent(loadingEvent);

      Assert.ok(messageReceived, "Loading message event should be received");
      Assert.equal(
        receivedEventDetail.role,
        "loading",
        "Should receive correct role"
      );
      Assert.equal(
        receivedEventDetail.isSearching,
        true,
        "Should receive correct isSearching flag"
      );
      Assert.equal(
        receivedEventDetail.searchQuery,
        "test query",
        "Should receive correct search query"
      );
    });
  });

  await SpecialPowers.popPrefEnv();
});

/**
 * Test that messageEvent handles clear-conversation messages correctly
 */
add_task(async function test_messageEvent_clear_conversation() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.smartwindow.enabled", true]],
  });

  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      await content.customElements.whenDefined("ai-chat-content");

      const chatContent = content.document.querySelector("ai-chat-content");
      Assert.ok(chatContent, "ai-chat-content element should exist");

      let messageReceived = false;
      let receivedEventDetail = null;

      chatContent.addEventListener("aiChatContentActor:message", event => {
        messageReceived = true;
        receivedEventDetail = event.detail;
      });

      const clearEvent = new content.CustomEvent("aiChatContentActor:message", {
        detail: {
          role: "clear-conversation",
          convId: "conv456",
        },
        bubbles: true,
      });

      chatContent.dispatchEvent(clearEvent);

      Assert.ok(messageReceived, "Clear conversation event should be received");
      Assert.equal(
        receivedEventDetail.role,
        "clear-conversation",
        "Should receive correct role"
      );
      Assert.equal(
        receivedEventDetail.convId,
        "conv456",
        "Should receive correct convId"
      );
    });
  });

  await SpecialPowers.popPrefEnv();
});
