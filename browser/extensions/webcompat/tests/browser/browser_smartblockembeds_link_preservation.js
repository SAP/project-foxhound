/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

/**
 * Tests that SmartBlock preserves links and text content from blocked embeds
 */

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.trustPanel.featureGate", false],
      ["test.wait300msAfterTabSwitch", true],
      [SEC_DELAY_PREF, 1000],
      [TRACKING_PREF, true],
      [SMARTBLOCK_EMBEDS_ENABLED_PREF, true],
    ],
  });

  await UrlClassifierTestUtils.addTestTrackers();
  await generateTestShims();

  registerCleanupFunction(() => {
    UrlClassifierTestUtils.cleanupTestTrackers();
    Services.prefs.clearUserPref("browser.protections_panel.infoMessage.seen");
  });
});

add_task(async function test_smartblock_preserves_links_and_text() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    waitForLoad: true,
  });

  await loadSmartblockPageOnTab(tab);

  // Wait for the embed to be replaced with placeholder
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    await ContentTaskUtils.waitForCondition(() => {
      const placeholder = content.document.querySelector(
        ".shimmed-embedded-content"
      );
      return placeholder !== null;
    }, "Waiting for SmartBlock placeholder to appear");
  });

  // Check that the preserved content is present
  const preservedContent = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    async function () {
      const wrapper = content.document.querySelector(
        ".shimmed-embedded-content"
      ).parentElement;

      // Find the safe content container
      const safeContentContainer = wrapper.querySelector("div:nth-child(2)");
      if (!safeContentContainer) {
        return { found: false };
      }

      // Check for explanatory header
      const header = safeContentContainer.querySelector("div:first-child");
      const headerText = header ? header.textContent : null;

      // Check for preserved link
      const link = safeContentContainer.querySelector("a");
      const linkHref = link ? link.href : null;
      const linkText = link ? link.textContent : null;

      // Check for preserved text content
      const allText = safeContentContainer.textContent;

      return {
        found: true,
        headerText,
        linkHref,
        linkText,
        hasOriginalText: allText.includes("Check out this content"),
        hasPostedByText: allText.includes("Posted by @testuser"),
      };
    }
  );

  ok(preservedContent.found, "Preserved content container should exist");
  is(
    preservedContent.headerText,
    "Content from blocked embed:",
    "Explanatory header should be present"
  );
  is(
    preservedContent.linkHref,
    "https://example.com/post/12345",
    "Link href should be preserved"
  );
  is(
    preservedContent.linkText,
    "View original post",
    "Link text should be preserved"
  );
  ok(
    preservedContent.hasOriginalText,
    "Original text content should be preserved"
  );
  ok(preservedContent.hasPostedByText, "Posted by text should be preserved");

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_smartblock_link_attributes() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    waitForLoad: true,
  });

  await loadSmartblockPageOnTab(tab);

  // Wait for the embed to be replaced
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    await ContentTaskUtils.waitForCondition(() => {
      const placeholder = content.document.querySelector(
        ".shimmed-embedded-content"
      );
      return placeholder !== null;
    }, "Waiting for SmartBlock placeholder to appear");
  });

  // Check that links have proper security attributes
  const linkAttributes = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    async function () {
      const wrapper = content.document.querySelector(
        ".shimmed-embedded-content"
      ).parentElement;
      const link = wrapper.querySelector("a");

      if (!link) {
        return { found: false };
      }

      return {
        found: true,
        target: link.getAttribute("target"),
        rel: link.getAttribute("rel"),
        hasBlueColor: link.style.color.includes("rgb"),
        hasUnderline: link.style.textDecoration === "underline",
      };
    }
  );

  ok(linkAttributes.found, "Link should exist in preserved content");
  is(linkAttributes.target, "_blank", "Link should open in new tab");
  is(
    linkAttributes.rel,
    "noopener noreferrer",
    "Link should have security attributes"
  );
  ok(linkAttributes.hasBlueColor, "Link should be styled with blue color");
  ok(linkAttributes.hasUnderline, "Link should be underlined");

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_smartblock_restores_original_on_unblock() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    waitForLoad: true,
  });

  await loadSmartblockPageOnTab(tab);

  // Wait for placeholder
  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    await ContentTaskUtils.waitForCondition(() => {
      return content.document.querySelector(".shimmed-embedded-content");
    });
  });

  // Click on placeholder to open protections panel
  await clickOnPagePlaceholder(tab);

  // Wait for clickjacking delay
  let delayTime = Services.prefs.getIntPref(SEC_DELAY_PREF);
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, delayTime + 100));

  // Setup promise to wait for embed script to finish
  let embedScriptFinished = BrowserTestUtils.waitForContentEvent(
    tab.linkedBrowser,
    "testEmbedScriptFinished",
    false,
    null,
    true
  );

  // Check that SmartBlock UI is visible
  ok(
    BrowserTestUtils.isVisible(
      gProtectionsHandler._protectionsPopupSmartblockContainer
    ),
    "Smartblock section is visible"
  );

  // Click toggle to unblock
  let blockedEmbedToggle =
    gProtectionsHandler._protectionsPopupSmartblockToggleContainer
      .firstElementChild;
  ok(blockedEmbedToggle, "Toggle exists in container");
  blockedEmbedToggle.click();

  await embedScriptFinished;

  // Check that embed is loaded (the embed script replaces .broken-embed-content
  // with .loaded-embed-content)
  const embedRestored = await SpecialPowers.spawn(
    tab.linkedBrowser,
    [],
    async function () {
      const brokenEmbed = content.document.querySelector(
        ".broken-embed-content"
      );
      const loadedEmbed = content.document.querySelector(
        ".loaded-embed-content"
      );
      const placeholder = content.document.querySelector(
        ".shimmed-embedded-content"
      );

      return {
        brokenEmbedGone: brokenEmbed === null,
        loadedEmbedExists: loadedEmbed !== null,
        placeholderGone: placeholder === null,
      };
    }
  );

  ok(embedRestored.brokenEmbedGone, "Broken embed placeholder should be gone");
  ok(embedRestored.loadedEmbedExists, "Loaded embed should now exist");
  ok(embedRestored.placeholderGone, "SmartBlock placeholder should be removed");

  BrowserTestUtils.removeTab(tab);
});
