/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests for the ai-website-confirmation component
 */

const TEST_URL =
  getRootDirectory(gTestPath) + "test_website_confirmation_page.html";

add_task(async function test_website_confirmation_basic_rendering() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const emptyConfirmation = content.document.getElementById(
        "test-confirmation-empty"
      );
      const mixedConfirmation = content.document.getElementById(
        "test-confirmation-mixed"
      );
      const allCheckedConfirmation = content.document.getElementById(
        "test-confirmation-all-checked"
      );

      Assert.ok(emptyConfirmation, "Empty confirmation component exists");
      Assert.ok(mixedConfirmation, "Mixed confirmation component exists");
      Assert.ok(
        allCheckedConfirmation,
        "All-checked confirmation component exists"
      );

      // Test initial states
      Assert.equal(
        emptyConfirmation.tabs.length,
        0,
        "Empty confirmation has no tabs"
      );
      Assert.equal(
        mixedConfirmation.tabs.length,
        4,
        "Mixed confirmation has 4 tabs"
      );
      Assert.equal(
        allCheckedConfirmation.tabs.length,
        2,
        "All-checked confirmation has 2 tabs"
      );

      // Test mixed states
      const mixedTabs = mixedConfirmation.tabs;
      Assert.equal(mixedTabs[0].checked, true, "First tab is checked");
      Assert.equal(mixedTabs[1].checked, false, "Second tab is unchecked");
      Assert.equal(mixedTabs[2].checked, true, "Third tab is checked");
      Assert.equal(mixedTabs[3].checked, false, "Fourth tab is unchecked");
    });
  });
});

add_task(async function test_website_confirmation_select_all() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const confirmation = content.document.getElementById(
        "test-confirmation-mixed"
      );
      const shadowRoot = confirmation.shadowRoot;
      const selectAllButton = shadowRoot.querySelectorAll("moz-button")[1];

      Assert.ok(selectAllButton, "Select all button exists");

      // Initially some are unchecked, button should say "Select all"
      Assert.equal(
        selectAllButton.getAttribute("data-l10n-id"),
        "smart-window-confirm-select-all",
        "Button shows 'Select all' when some unchecked"
      );

      // Click select all
      let eventPromise = new Promise(resolve => {
        confirmation.addEventListener(
          "ai-website-confirmation:selection-change",
          resolve,
          {
            once: true,
          }
        );
      });

      selectAllButton.click();
      const event = await eventPromise;

      // All should be checked now
      Assert.ok(
        confirmation.tabs.every(tab => tab.checked),
        "All tabs are checked after select all"
      );
      Assert.equal(
        event.detail.selectedTabs.length,
        4,
        "Event shows 4 selected tabs"
      );

      // Button should now say "Deselect all"
      Assert.equal(
        selectAllButton.getAttribute("data-l10n-id"),
        "smart-window-confirm-deselect-all",
        "Button shows 'Deselect all' when all checked"
      );

      // Click deselect all
      eventPromise = new Promise(resolve => {
        confirmation.addEventListener(
          "ai-website-confirmation:selection-change",
          resolve,
          {
            once: true,
          }
        );
      });

      selectAllButton.click();
      await eventPromise;

      // All should be unchecked now
      Assert.ok(
        confirmation.tabs.every(tab => !tab.checked),
        "All tabs are unchecked after deselect all"
      );
    });
  });
});

add_task(async function test_website_confirmation_close_button() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const confirmation = content.document.getElementById(
        "test-confirmation-mixed"
      );
      const shadowRoot = confirmation.shadowRoot;
      const closeButton = shadowRoot.querySelectorAll("moz-button")[2];

      Assert.ok(closeButton, "Close button exists");

      // Initially 2 tabs are selected
      const selectedCount = confirmation.tabs.filter(tab => tab.checked).length;
      Assert.equal(selectedCount, 2, "Initially 2 tabs are selected");

      // Check button text shows count
      Assert.equal(
        closeButton.getAttribute("data-l10n-id"),
        "smart-window-confirm-close-tabs",
        "Close button has correct l10n id"
      );

      const l10nArgs = JSON.parse(closeButton.getAttribute("data-l10n-args"));
      Assert.equal(l10nArgs.count, 2, "Close button shows count of 2");
      Assert.equal(
        closeButton.disabled,
        false,
        "Close button is enabled with selections"
      );

      // Deselect all
      confirmation.deselectAll();

      // Wait for the component to re-render
      await new Promise(resolve => content.requestAnimationFrame(resolve));

      // Check button is disabled
      Assert.equal(
        closeButton.disabled,
        true,
        "Close button is disabled with no selections"
      );

      // When disabled, data-l10n-args should be empty or null
      const l10nArgsAttr = closeButton.getAttribute("data-l10n-args");
      Assert.ok(
        !l10nArgsAttr || l10nArgsAttr === "",
        "Close button has no data-l10n-args when disabled"
      );

      // Check that the correct l10n-id is set for the disabled state
      Assert.equal(
        closeButton.getAttribute("data-l10n-id"),
        "smart-window-confirm-close-tab",
        "Close button shows 'Close' without count when disabled"
      );
    });
  });
});

add_task(async function test_website_confirmation_individual_selection() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const confirmation = content.document.getElementById(
        "test-confirmation-mixed"
      );
      const shadowRoot = confirmation.shadowRoot;
      const websiteSelects = shadowRoot.querySelectorAll("ai-website-select");

      Assert.equal(websiteSelects.length, 4, "Has 4 website select components");

      // Test individual selection change
      const secondSelect = websiteSelects[1];
      const secondSelectCheckbox =
        secondSelect.shadowRoot.querySelector("moz-checkbox");

      Assert.equal(
        secondSelect.checked,
        false,
        "Second tab initially unchecked"
      );

      // Click to check it
      const eventPromise = new Promise(resolve => {
        confirmation.addEventListener(
          "ai-website-confirmation:selection-change",
          resolve,
          {
            once: true,
          }
        );
      });

      secondSelectCheckbox.click();
      const event = await eventPromise;

      Assert.equal(secondSelect.checked, true, "Second tab is now checked");
      Assert.equal(
        event.detail.selectedTabs.length,
        3,
        "Event shows 3 selected tabs after checking one more"
      );

      // Verify the tabs array was updated
      Assert.equal(
        confirmation.tabs[1].checked,
        true,
        "Confirmation tabs array updated correctly"
      );
    });
  });
});

add_task(async function test_website_confirmation_close_event() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const confirmation = content.document.getElementById(
        "test-confirmation-mixed"
      );
      const shadowRoot = confirmation.shadowRoot;
      const closeXButton = shadowRoot.querySelector("moz-button.close-button");

      Assert.ok(closeXButton, "Close X button exists");

      // Set up listener for close event
      const eventPromise = new Promise(resolve => {
        confirmation.addEventListener(
          "ai-website-confirmation:close",
          resolve,
          {
            once: true,
          }
        );
      });

      closeXButton.click();
      const event = await eventPromise;

      Assert.ok(event, "Close event was dispatched");
      Assert.equal(
        event.type,
        "ai-website-confirmation:close",
        "Event has correct type"
      );
      Assert.ok(event.bubbles, "Close event bubbles");
      Assert.ok(event.composed, "Close event is composed");
    });
  });
});

add_task(async function test_website_confirmation_programmatic_methods() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const confirmation = content.document.getElementById(
        "test-confirmation-empty"
      );

      // Set tabs programmatically
      const testTabs = [
        {
          linkedPanel: "prog-1",
          title: "Programmatic Tab 1",
          iconSrc: "chrome://branding/content/icon16.png",
          url: "https://prog1.example",
          checked: false,
        },
        {
          linkedPanel: "prog-2",
          title: "Programmatic Tab 2",
          iconSrc: "chrome://branding/content/icon16.png",
          url: "https://prog2.example",
          checked: false,
        },
      ];

      confirmation.tabs = testTabs;

      Assert.equal(confirmation.tabs.length, 2, "Tabs set programmatically");

      // Test selectAll method
      let eventFired = false;
      confirmation.addEventListener(
        "ai-website-confirmation:selection-change",
        () => {
          eventFired = true;
        },
        { once: true }
      );

      confirmation.selectAll();

      Assert.ok(eventFired, "Selection event fired after selectAll");
      Assert.ok(
        confirmation.tabs.every(tab => tab.checked),
        "All tabs checked after selectAll"
      );

      // Test getSelectedTabs method
      const selected = confirmation.getSelectedTabs();
      Assert.equal(
        selected.length,
        2,
        "getSelectedTabs returns all tabs when all selected"
      );
      Assert.equal(
        selected[0].linkedPanel,
        "prog-1",
        "First selected tab has correct ID"
      );
      Assert.equal(
        selected[1].linkedPanel,
        "prog-2",
        "Second selected tab has correct ID"
      );

      // Test deselectAll method
      eventFired = false;
      confirmation.addEventListener(
        "ai-website-confirmation:selection-change",
        () => {
          eventFired = true;
        },
        { once: true }
      );

      confirmation.deselectAll();

      Assert.ok(eventFired, "Selection event fired after deselectAll");
      Assert.ok(
        confirmation.tabs.every(tab => !tab.checked),
        "All tabs unchecked after deselectAll"
      );
      Assert.equal(
        confirmation.getSelectedTabs().length,
        0,
        "getSelectedTabs returns empty array when none selected"
      );
    });
  });
});

add_task(async function test_website_confirmation_scroll_behavior() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const confirmation = content.document.getElementById(
        "test-confirmation-mixed"
      );

      // Add more tabs to test scrolling
      const manyTabs = [];
      for (let i = 0; i < 20; i++) {
        manyTabs.push({
          linkedPanel: `scroll-tab-${i}`,
          title: `Scroll Test Tab ${i}`,
          iconSrc: "chrome://global/skin/icons/defaultFavicon.svg",
          url: `https://scroll${i}.example`,
          checked: i % 2 === 0,
        });
      }

      confirmation.tabs = manyTabs;

      // Wait for the component to re-render with new tabs
      await new Promise(resolve => content.requestAnimationFrame(resolve));

      const shadowRoot = confirmation.shadowRoot;
      const tabsList = shadowRoot.querySelector(".tabs-list");
      const fadeTop = shadowRoot.querySelector(".fade-top");
      const fadeBottom = shadowRoot.querySelector(".fade-bottom");

      Assert.ok(tabsList, "Tabs list exists");
      Assert.ok(fadeTop, "Top fade overlay exists");
      Assert.ok(fadeBottom, "Bottom fade overlay exists");

      // Check that overflow is handled
      Assert.equal(
        tabsList.style.overflowY ||
          content.getComputedStyle(tabsList).overflowY,
        "auto",
        "Tabs list has overflow-y: auto"
      );

      // Verify all tabs are rendered
      const websiteSelects = shadowRoot.querySelectorAll("ai-website-select");
      Assert.equal(websiteSelects.length, 20, "All 20 tabs are rendered");
    });
  });
});

add_task(async function test_website_confirmation_all_checked_state() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const confirmation = content.document.getElementById(
        "test-confirmation-all-checked"
      );
      const shadowRoot = confirmation.shadowRoot;
      const selectAllButton = shadowRoot.querySelectorAll("moz-button")[1];

      // All tabs start checked
      Assert.ok(
        confirmation.tabs.every(tab => tab.checked),
        "All tabs initially checked"
      );

      // Button should say "Deselect all"
      Assert.equal(
        selectAllButton.getAttribute("data-l10n-id"),
        "smart-window-confirm-deselect-all",
        "Button shows 'Deselect all' when all initially checked"
      );

      // Close button should show correct count
      const closeButton = shadowRoot.querySelectorAll("moz-button")[2];
      const l10nArgs = JSON.parse(closeButton.getAttribute("data-l10n-args"));
      Assert.equal(l10nArgs.count, 2, "Close button shows count of 2");
      Assert.equal(closeButton.disabled, false, "Close button is enabled");
    });
  });
});
