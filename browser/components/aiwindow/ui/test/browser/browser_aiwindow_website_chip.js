/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PAGE =
  "chrome://mochitests/content/browser/browser/components/aiwindow/ui/test/browser/test_website_chip_page.html";

/**
 * Opens a test page in a new tab.
 *
 * @param {string} pageUrl - The URL of the page to load
 * @returns {Promise<object>} - Object containing the tab and cleanup function
 */
async function openTestPage(pageUrl) {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, pageUrl);
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    await content.customElements.whenDefined("ai-website-chip");
  });
  return { tab, browser: tab.linkedBrowser };
}

/**
 * Sets properties on a chip element in content and waits for update.
 *
 * @param {Browser} browser - The browser element
 * @param {string} chipId - The ID of the chip element
 * @param {object} props - Properties to set on the chip
 * @returns {Promise<void>}
 */
async function setChipPropsInContent(browser, chipId, props) {
  await SpecialPowers.spawn(
    browser,
    [chipId, props],
    async (id, properties) => {
      const chip = content.document.getElementById(id);
      Object.assign(chip, properties);
      if (chip.updateComplete) {
        await chip.updateComplete;
      }
    }
  );
}

add_task(async function test_website_chip_inline_empty_state() {
  const { tab, browser } = await openTestPage(TEST_PAGE);

  await SpecialPowers.spawn(browser, [], async () => {
    const chip = content.document.getElementById("test-inline-chip");

    Assert.ok(chip, "Chip element should exist in the test page");
    Assert.equal(chip.type, "in-line", "Chip type should be in-line");
    Assert.equal(chip.label, "", "Chip label should be empty initially");

    const shadow = chip.shadowRoot;
    const placeholder = shadow.querySelector(".chip-label");
    Assert.ok(placeholder, "Placeholder label should exist");
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_website_chip_inline_with_label() {
  const { tab, browser } = await openTestPage(TEST_PAGE);

  await setChipPropsInContent(browser, "test-inline-chip", {
    label: "Mozilla Firefox",
    iconSrc: "chrome://branding/content/icon16.png",
  });

  await SpecialPowers.spawn(browser, [], async () => {
    const chip = content.document.getElementById("test-inline-chip");
    const shadow = chip.shadowRoot;
    const icon = shadow.querySelector(".chip-icon");
    const atSymbol = shadow.querySelector(".chip-at");
    const removeButton = shadow.querySelector(".chip-remove");

    Assert.ok(icon, "Icon should be rendered when iconSrc is set");
    Assert.ok(!atSymbol, "@ symbol should not be rendered when label is set");
    Assert.ok(!removeButton, "In-line chip should not have remove button");
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_website_chip_inline_click_event() {
  const { tab, browser } = await openTestPage(TEST_PAGE);

  await setChipPropsInContent(browser, "test-inline-chip", {
    label: "Test Site",
  });

  await SpecialPowers.spawn(browser, [], async () => {
    const chip = content.document.getElementById("test-inline-chip");

    let clickEvent = null;
    chip.addEventListener("ai-website-chip:click", e => (clickEvent = e), {
      once: true,
    });

    const shadow = chip.shadowRoot;
    const chipDiv = shadow.querySelector(".chip");
    chipDiv.click();

    Assert.ok(clickEvent, "Click event should fire");
    Assert.equal(
      clickEvent.detail.label,
      "Test Site",
      "Event detail should include label"
    );
    Assert.equal(clickEvent.bubbles, true, "Event should bubble");
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_website_chip_context_remove() {
  const { tab, browser } = await openTestPage(TEST_PAGE);

  await SpecialPowers.spawn(browser, [], async () => {
    const chip = content.document.getElementById("test-context-chip");

    Assert.equal(chip.type, "context-chip", "Chip type should be context-chip");
    Assert.equal(
      chip.label,
      "Example Site",
      "Label should be set from attribute"
    );

    const shadow = chip.shadowRoot;
    const removeButton = shadow.querySelector(".chip-remove");
    Assert.ok(removeButton, "Context chip should have remove button");

    const removeIcon = shadow.querySelector(".chip-remove-icon");
    Assert.ok(removeIcon, "Remove button should have icon");

    let removeEvent = null;
    chip.addEventListener("ai-website-chip:remove", e => (removeEvent = e), {
      once: true,
    });

    removeButton.click();

    Assert.ok(removeEvent, "Remove event should fire");
    Assert.equal(
      removeEvent.detail.label,
      "Example Site",
      "Event detail should include label"
    );
    Assert.equal(removeEvent.bubbles, true, "Event should bubble");
  });

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_website_chip_context_with_link() {
  const { tab, browser } = await openTestPage(TEST_PAGE);

  await SpecialPowers.spawn(browser, [], async () => {
    const chip = content.document.getElementById("test-context-chip-link");

    Assert.equal(chip.href, "https://mozilla.org", "Chip href should be set");

    const shadow = chip.shadowRoot;
    const link = shadow.querySelector("a.chip");

    Assert.ok(link, "Context chip with href should render as link");
    Assert.equal(link.target, "_blank", "Link should open in new tab");
  });

  BrowserTestUtils.removeTab(tab);
});
