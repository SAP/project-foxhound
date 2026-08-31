"use strict";

const TEST_PAGE =
  "chrome://mochitests/content/browser/browser/components/aiwindow/ui/test/browser/test_applied_memories_page.html";

add_task(async function test_applied_memories_button_basic() {
  // We intentionally turn off this a11y check, because the following
  // click is sent on an arbitrary web content that is not expected to
  // be tested by itself with the browser mochitests, therefore this
  // rule check shall be ignored by a11y-checks suite.
  AccessibilityUtils.setEnv({ mustHaveAccessibleRule: false });
  await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const doc = content.document;
      const button = doc.getElementById("test-button");

      button.messageId = "msg-1";
      button.appliedMemories = [
        { memory_summary: "User is vegan" },
        { memory_summary: "User has a cat" },
      ];

      await content.customElements.whenDefined("applied-memories-button");

      let popover = button.shadowRoot.querySelector(".popover");
      ok(popover, "Popover element exists");
      ok(!popover.classList.contains("open"), "Popover is initially closed");

      const trigger = button.shadowRoot.querySelector(
        "moz-button.memories-trigger"
      );
      ok(trigger, "Found memories trigger");

      trigger.click();
      await content.Promise.resolve();

      popover = button.shadowRoot.querySelector(".popover");
      ok(
        popover.classList.contains("open"),
        "Popover opens after trigger click"
      );

      const items = button.shadowRoot.querySelectorAll(".memories-list-item");
      is(items.length, 2, "Two memories rendered initially");

      const removeButton = items[0].querySelector(".memories-remove-button");
      ok(removeButton, "Found remove button for first memory");

      let removeEventDetail = null;
      function onRemove(evt) {
        button.removeEventListener("remove-applied-memory", onRemove);
        removeEventDetail = evt.detail;
      }
      button.addEventListener("remove-applied-memory", onRemove);

      removeButton.click();
      button.appliedMemories = [{ memory_summary: "User has a cat" }];
      await content.Promise.resolve();

      const itemsAfter = button.shadowRoot.querySelectorAll(
        ".memories-list-item"
      );
      is(itemsAfter.length, 1, "One memory remains after removal");

      ok(removeEventDetail, "remove-applied-memory event fired");
      is(removeEventDetail.messageId, "msg-1", "Event includes messageId");
      is(
        removeEventDetail.memory.memory_summary,
        "User is vegan",
        "Event includes memory"
      );

      doc.body.click();

      await content.Promise.resolve();

      popover = button.shadowRoot.querySelector(".popover");
      ok(
        !popover.classList.contains("open"),
        "Popover closes on outside click"
      );
    });
  });
  AccessibilityUtils.resetEnv();
});

add_task(async function test_applied_memories_button_retry_without_memories() {
  await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const button = content.document.getElementById("test-button");

      button.messageId = "msg-1";
      button.appliedMemories = [
        { memory_summary: "User is vegan" },
        { memory_summary: "User has a cat" },
      ];

      await content.customElements.whenDefined("applied-memories-button");

      const trigger = button.shadowRoot.querySelector(
        "moz-button.memories-trigger"
      );
      trigger.click();
      await content.Promise.resolve();

      const retryWithoutMemoriesButton = button.shadowRoot.querySelector(
        ".retry-without-memories-button"
      );
      ok(retryWithoutMemoriesButton, "Found retry-without-memories button");

      let retryEventDetail = null;
      function onRetry(evt) {
        button.removeEventListener("retry-without-memories", onRetry);
        retryEventDetail = evt.detail;
      }
      button.addEventListener("retry-without-memories", onRetry);

      retryWithoutMemoriesButton.click();
      await content.Promise.resolve();

      ok(retryEventDetail, "retry-without-memories event fired");
      is(retryEventDetail.messageId, "msg-1", "Event includes messageId");
    });
  });
});

add_task(async function test_applied_memories_button_showCallout_auto_opens() {
  await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const button = content.document.getElementById("test-button");
      button.messageId = "msg-1";
      button.appliedMemories = [{ memory_summary: "User is vegan" }];

      await content.customElements.whenDefined("applied-memories-button");

      let toggleEventDetail = null;
      function onToggle(evt) {
        button.removeEventListener("toggle-applied-memories", onToggle);
        toggleEventDetail = evt.detail;
      }
      button.addEventListener("toggle-applied-memories", onToggle);

      button.showCallout = true;
      await button.updateComplete;

      ok(button.open, "Popover auto-opens when showCallout is set");
      ok(
        button.shadowRoot.querySelector(".popover").classList.contains("open"),
        "Popover has open class"
      );
      ok(toggleEventDetail, "toggle-applied-memories event fired");
      is(toggleEventDetail.open, true, "Event detail indicates open");

      const callout = button.shadowRoot.querySelector(".memories-callout");
      ok(callout, "Callout element is rendered");
    });
  });
});

add_task(async function test_applied_memories_button_keyboard_navigation() {
  await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      function pressKey(element, key) {
        element.dispatchEvent(
          new content.KeyboardEvent("keydown", {
            key,
            bubbles: true,
            composed: true,
          })
        );
      }

      function assertFocused(root, element, message) {
        is(root.activeElement, element, message);
      }

      const button = content.document.getElementById("test-button");
      button.messageId = "msg-1";
      button.appliedMemories = [
        { memory_summary: "User is vegan" },
        { memory_summary: "User has a cat" },
      ];

      await content.customElements.whenDefined("applied-memories-button");
      await button.updateComplete;

      let popover = button.shadowRoot.querySelector(".popover");
      ok(popover.inert, "Popover is inert when closed");

      const trigger = button.shadowRoot.querySelector(
        "moz-button.memories-trigger"
      );
      trigger.click();
      await button.updateComplete;

      popover = button.shadowRoot.querySelector(".popover");
      ok(!popover.inert, "Popover is not inert when open");

      const root = button.shadowRoot;
      const removeButtons = root.querySelectorAll(".memories-remove-button");
      const retryButton = root.querySelector(".retry-without-memories-button");

      is(removeButtons.length, 2, "Two remove buttons rendered");

      // Opening the dialog should focus the first delete button.
      assertFocused(
        root,
        removeButtons[0],
        "First delete button focused on open"
      );

      // ArrowDown moves to next delete button
      pressKey(removeButtons[0], "ArrowDown");
      assertFocused(
        root,
        removeButtons[1],
        "ArrowDown moves to second delete button"
      );

      // ArrowDown wraps from last delete button to first
      pressKey(removeButtons[1], "ArrowDown");
      assertFocused(
        root,
        removeButtons[0],
        "ArrowDown wraps to first delete button"
      );

      // ArrowUp wraps from first delete button to last
      pressKey(removeButtons[0], "ArrowUp");
      assertFocused(
        root,
        removeButtons[1],
        "ArrowUp wraps to last delete button"
      );

      // Home jumps to first delete button
      pressKey(removeButtons[1], "Home");
      assertFocused(
        root,
        removeButtons[0],
        "Home jumps to first delete button"
      );

      // End jumps to last delete button
      pressKey(removeButtons[0], "End");
      assertFocused(root, removeButtons[1], "End jumps to last delete button");

      // Tab from retry button closes popover
      retryButton.focus();
      pressKey(retryButton, "Tab");
      await button.updateComplete;
      ok(!button.open, "Tab from retry button closes popover");

      // Reopen and test Escape
      trigger.click();
      await button.updateComplete;

      pressKey(removeButtons[0], "Escape");
      await button.updateComplete;

      ok(!button.open, "Escape closes popover");
      assertFocused(root, trigger, "Escape returns focus to trigger");
      popover = root.querySelector(".popover");
      ok(popover.inert, "Popover is inert after Escape");
    });
  });
});

add_task(async function test_applied_memories_button_manage_memories() {
  await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const button = content.document.getElementById("test-button");
      button.messageId = "msg-1";
      button.appliedMemories = [{ memory_summary: "User is vegan" }];
      button.showCallout = true;

      await content.customElements.whenDefined("applied-memories-button");
      await button.updateComplete;

      const manageButton = button.shadowRoot.querySelector(
        ".manage-memories-button"
      );
      ok(manageButton, "Found manage memories button");

      let manageEventFired = false;
      function onManage() {
        button.removeEventListener("manage-memories", onManage);
        manageEventFired = true;
      }
      button.addEventListener("manage-memories", onManage);

      manageButton.click();
      await content.Promise.resolve();

      ok(manageEventFired, "manage-memories event fired");
    });
  });
});
