/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PAGE =
  "chrome://mochitests/content/browser/browser/components/aiwindow/ui/test/browser/test_chat_assistant_error.html";

/**
 * Tests if the error component is cleared when a new user message is sent
 * (which is what happens when the retry button is clicked in the real flow)
 */
add_task(async function test_retry_button_clears_error() {
  await BrowserTestUtils.withNewTab("about:aichatcontent", async browser => {
    const actor =
      browser.browsingContext.currentWindowGlobal.getActor("AIChatContent");

    const errorMessage = {
      role: "",
      content: { isError: true, status: null },
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
    });

    // Send a new user message (simulating what happens after retry)
    const userMessage = {
      role: "user",
      convId: "test-conv-123",
      ordinal: 0,
      content: { body: "hey assistant" },
    };
    await actor.dispatchMessageToChatContent(userMessage);

    await SpecialPowers.spawn(browser, [], async () => {
      const contentEl = content.document.querySelector("ai-chat-content");
      await contentEl.updateComplete;

      const errorEl = contentEl.shadowRoot.querySelector(
        "chat-assistant-error"
      );
      Assert.ok(!errorEl, "error is cleared when new user message is sent");
    });
  });
});

/**
 * Tests if the error component returns the correct string/button based on the error subcode
 */
add_task(async function test_error_status() {
  await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const errorComponent = content.document.querySelector(
        "chat-assistant-error"
      );
      Assert.ok(errorComponent, "Error component exists");

      const shadow = errorComponent.shadowRoot;
      Assert.ok(shadow, "Shadow root exists");

      async function testErrorScenario(
        errorObj,
        expectedHeader,
        expectedBody,
        expectedButton,
        expectedEvent,
        expectedHeaderArgs = null
      ) {
        errorComponent.error = errorObj;
        await errorComponent.updateComplete;

        const header = shadow.querySelector(".chat-assistant-error__header");
        const body = shadow.querySelector(".chat-assistant-error__body");
        const button = shadow.querySelector(".chat-assistant-error__button");

        Assert.ok(header, "Error header exists");
        Assert.equal(
          header.getAttribute("data-l10n-id"),
          expectedHeader,
          `Header has correct l10n-id: ${expectedHeader}`
        );
        if (expectedHeaderArgs) {
          Assert.equal(
            header.getAttribute("data-l10n-args"),
            JSON.stringify(expectedHeaderArgs),
            `Header has correct l10n-args: ${JSON.stringify(expectedHeaderArgs)}`
          );
        } else {
          Assert.ok(
            !header.hasAttribute("data-l10n-args"),
            "Header has no l10n-args"
          );
        }

        if (expectedBody) {
          Assert.ok(body, "Error body exists");
          Assert.equal(
            body.getAttribute("data-l10n-id"),
            expectedBody,
            `Body has correct l10n-id: ${expectedBody}`
          );
        } else {
          Assert.ok(!body, "Error body should not exist");
        }

        if (expectedButton) {
          Assert.ok(button, "Action button exists");
          Assert.equal(
            button.getAttribute("data-l10n-id"),
            expectedButton,
            `Button has correct l10n-id: ${expectedButton}`
          );
          let eventPromise = ContentTaskUtils.waitForEvent(
            errorComponent,
            expectedEvent
          );
          button.click();
          await eventPromise;

          Assert.ok(true, `${expectedEvent} event fired when button clicked`);
        } else {
          Assert.ok(!button, "Action button should not exist");
        }
      }

      await testErrorScenario(
        { error: 1 },
        "smartwindow-assistant-error-budget-header",
        "smartwindow-assistant-error-budget-body",
        null,
        null
      );

      await testErrorScenario(
        { error: 2 },
        "smartwindow-assistant-error-many-requests-header",
        null,
        null,
        null
      );

      await testErrorScenario(
        { error: 5 },
        "smartwindow-assistant-error-many-requests-header",
        null,
        null,
        null
      );

      await testErrorScenario(
        { error: 6 },
        "smartwindow-assistant-error-many-requests-header",
        null,
        null,
        null
      );

      await testErrorScenario(
        { error: 3 },
        "smartwindow-assistant-error-max-length-header",
        null,
        "smartwindow-clear-btn",
        "aiChatError:new-chat"
      );

      await testErrorScenario(
        { error: 4 },
        "smartwindow-assistant-error-capacity-header",
        null,
        null,
        null
      );

      await testErrorScenario(
        { clientReason: "fxaTokenUnavailable" },
        "smartwindow-assistant-error-account-header",
        null,
        "smartwindow-signin-btn",
        "aiChatError:sign-in"
      );

      await testErrorScenario(
        { httpStatus: 401 },
        "smartwindow-assistant-error-http-header",
        null,
        "smartwindow-retry-btn",
        "aiChatError:retry-message",
        { status: 401 }
      );

      await testErrorScenario(
        { error: 7 },
        "smartwindow-assistant-error-request-blocked-header",
        null,
        null,
        null
      );

      await testErrorScenario(
        { error: "server_error" },
        "smartwindow-assistant-error-generic-header",
        null,
        "smartwindow-retry-btn",
        "aiChatError:retry-message"
      );

      await testErrorScenario(
        {},
        "smartwindow-assistant-error-generic-header",
        null,
        "smartwindow-retry-btn",
        "aiChatError:retry-message"
      );

      await testErrorScenario(
        { error: 0 },
        "smartwindow-assistant-error-generic-header",
        null,
        "smartwindow-retry-btn",
        "aiChatError:retry-message"
      );

      await testErrorScenario(
        { error: 9 }, // any number that is not a known error
        "smartwindow-assistant-error-generic-header",
        null,
        "smartwindow-retry-btn",
        "aiChatError:retry-message"
      );

      await testErrorScenario(
        { error: 9, httpStatus: 500 },
        "smartwindow-assistant-error-http-header",
        null,
        "smartwindow-retry-btn",
        "aiChatError:retry-message",
        { status: 500 }
      );

      await testErrorScenario(
        { httpStatus: 502 },
        "smartwindow-assistant-error-http-header",
        null,
        "smartwindow-retry-btn",
        "aiChatError:retry-message",
        { status: 502 }
      );
    });
  });
});
