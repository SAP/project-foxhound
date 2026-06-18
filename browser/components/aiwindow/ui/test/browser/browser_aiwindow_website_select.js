/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests for the ai-website-select component
 */

const TEST_URL = getRootDirectory(gTestPath) + "test_website_select_page.html";

add_task(async function test_website_select_basic_rendering() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const uncheckedSelect = content.document.getElementById(
        "test-select-unchecked"
      );
      const checkedSelect = content.document.getElementById(
        "test-select-checked"
      );

      Assert.ok(uncheckedSelect, "Unchecked select component exists");
      Assert.ok(checkedSelect, "Checked select component exists");

      // Test initial states
      Assert.equal(
        uncheckedSelect.checked,
        false,
        "Unchecked select is initially unchecked"
      );
      Assert.equal(
        checkedSelect.checked,
        true,
        "Checked select is initially checked"
      );

      // Test properties
      Assert.equal(
        uncheckedSelect.label,
        "Mozilla Developer Network",
        "Unchecked select has correct label"
      );
      Assert.equal(
        checkedSelect.label,
        "Firefox Browser",
        "Checked select has correct label"
      );
    });
  });
});

add_task(async function test_website_select_checkbox_interaction() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const select = content.document.getElementById("test-select-unchecked");
      const shadowRoot = select.shadowRoot;
      const checkbox = shadowRoot.querySelector("moz-checkbox");

      Assert.ok(checkbox, "Checkbox element exists in shadow DOM");
      Assert.equal(checkbox.checked, false, "Checkbox is initially unchecked");

      // Click the checkbox
      const eventPromise = new Promise(resolve => {
        select.addEventListener("ai-website-select:change", resolve, {
          once: true,
        });
      });

      checkbox.click();
      const event = await eventPromise;

      Assert.equal(
        select.checked,
        true,
        "Select component is checked after click"
      );
      Assert.equal(
        event.detail.checked,
        true,
        "Event detail contains correct checked state"
      );
      Assert.equal(
        event.detail.linkedPanel,
        "test-select-unchecked",
        "Event detail contains correct tab ID"
      );
    });
  });
});

add_task(async function test_website_select_icon_fallback() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const select = content.document.getElementById("test-select-no-icon");
      const shadowRoot = select.shadowRoot;
      const checkbox = shadowRoot.querySelector("moz-checkbox");

      Assert.ok(checkbox, "Checkbox exists for no-icon select");

      // Check that default icon is used
      const expectedIcon = "chrome://global/skin/icons/defaultFavicon.svg";
      Assert.equal(
        checkbox.iconSrc,
        expectedIcon,
        "Default favicon is used when no icon provided"
      );
    });
  });
});

add_task(async function test_website_select_event_details() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const select = content.document.getElementById("test-select-unchecked");

      // Set up test data
      select.linkedPanel = "test-id";
      select.label = "Test Label";
      select.url = "https://test.example.com";
      select.iconSrc = "chrome://branding/content/icon16.png";

      const eventPromise = new Promise(resolve => {
        select.addEventListener("ai-website-select:change", resolve, {
          once: true,
        });
      });

      // Trigger change
      const checkbox = select.shadowRoot.querySelector("moz-checkbox");
      checkbox.click();
      const event = await eventPromise;

      // Verify event detail contains all properties
      Assert.equal(
        event.detail.linkedPanel,
        "test-id",
        "Event has correct linkedPanel"
      );
      Assert.equal(event.detail.label, "Test Label", "Event has correct label");
      Assert.equal(
        event.detail.url,
        "https://test.example.com",
        "Event has correct url"
      );
      Assert.equal(
        event.detail.iconSrc,
        "chrome://branding/content/icon16.png",
        "Event has correct iconSrc"
      );
      Assert.equal(
        event.detail.checked,
        true,
        "Event has correct checked state"
      );
    });
  });
});

add_task(async function test_website_select_programmatic_methods() {
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const select = content.document.getElementById("test-select-unchecked");

      // Test setChecked method
      let eventFired = false;
      let capturedEvent;
      select.addEventListener(
        "ai-website-select:change",
        e => {
          eventFired = true;
          capturedEvent = e;
        },
        { once: true }
      );

      select.setChecked(true);

      Assert.ok(eventFired, "Event was fired synchronously");
      Assert.equal(select.checked, true, "setChecked updates state to true");
      Assert.equal(
        capturedEvent.detail.checked,
        true,
        "setChecked fires event with correct state"
      );

      // Test setChecked with same value (should not fire event)
      eventFired = false;
      select.addEventListener(
        "ai-website-select:change",
        () => {
          eventFired = true;
        },
        { once: true }
      );

      select.setChecked(true);

      // Give it a moment to potentially fire
      await new Promise(resolve => content.setTimeout(resolve, 10));

      Assert.equal(select.checked, true, "setChecked maintains true state");
      Assert.ok(!eventFired, "setChecked with same value doesn't fire event");

      // Test that properties are accessible
      Assert.equal(
        select.label,
        "Mozilla Developer Network",
        "Label property is accessible"
      );
      Assert.ok(select.iconSrc, "IconSrc property is accessible");
      Assert.ok(select.url, "URL property is accessible");
    });
  });
});
