/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/*
 * Tests for link opening from <ai-chat-message> through AIChatContentParent.
 *
 * Exercises the full click-to-tab flow: user clicks a rendered markdown link
 * inside the <ai-chat-message> shadow DOM -> click handler dispatches
 * AIChatContent:OpenLink -> AIChatContentChild forwards to parent ->
 * AIChatContentParent#handleOpenLink either switches to an existing tab or
 * opens a new one.
 */

const TEST_URL = "https://example.com/";

/**
 * Creates an <ai-chat-message> with a markdown link, waits for it to render,
 * and clicks the link. This exercises the real click handler inside the
 * component's shadow DOM.
 *
 * @param {MozBrowser} browser - Browser loaded with about:aichatcontent
 * @param {string} url - The URL to embed in the markdown link
 */
async function clickRenderedLink(browser, url) {
  await SpecialPowers.spawn(browser, [url], async linkUrl => {
    if (content.document.readyState !== "complete") {
      await ContentTaskUtils.waitForEvent(content, "load");
    }
    await content.customElements.whenDefined("ai-chat-message");

    const doc = content.document;
    const el = doc.createElement("ai-chat-message");
    doc.body.appendChild(el);

    const elJS = el.wrappedJSObject || el;
    elJS.role = "assistant";
    el.setAttribute("role", "assistant");
    const md = `Click [here](${linkUrl}) for more`;
    elJS.message = md;
    el.setAttribute("message", md);

    await ContentTaskUtils.waitForCondition(() => {
      const msg = el.shadowRoot?.querySelector(".message-assistant");
      return msg?.querySelector("a[href]");
    }, "Rendered markdown link should appear in shadow DOM");

    el.shadowRoot.querySelector(".message-assistant a[href]").click();
    el.remove();
  });
}

/**
 * Clicking a link should open a new foreground tab when no existing tab
 * has a matching URL.
 */
add_task(async function test_click_opens_new_tab() {
  const chatTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:aichatcontent"
  );

  try {
    const tabPromise = BrowserTestUtils.waitForNewTab(gBrowser);
    await clickRenderedLink(chatTab.linkedBrowser, TEST_URL);
    const newTab = await tabPromise;

    Assert.ok(newTab, "A new tab should be created for the link");
    Assert.equal(
      gBrowser.selectedTab,
      newTab,
      "The newly opened tab should become the selected tab"
    );
    Assert.equal(
      newTab.linkedBrowser.currentURI.spec,
      TEST_URL,
      "The new tab should navigate to the clicked URL"
    );

    BrowserTestUtils.removeTab(newTab);
  } finally {
    BrowserTestUtils.removeTab(chatTab);
  }
});

/**
 * Clicking a link should switch to an already-open tab instead of opening
 * a duplicate when that URL is already loaded.
 */
add_task(async function test_click_switches_to_existing_tab() {
  const existingTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_URL
  );
  const chatTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:aichatcontent"
  );

  try {
    Assert.equal(
      gBrowser.selectedTab,
      chatTab,
      "Precondition: the chat tab is selected, not the existing one"
    );
    const initialTabCount = gBrowser.tabs.length;

    await clickRenderedLink(chatTab.linkedBrowser, TEST_URL);

    await BrowserTestUtils.waitForCondition(
      () => gBrowser.selectedTab === existingTab,
      "Browser should switch to the existing tab with the matching URL"
    );

    Assert.equal(
      gBrowser.tabs.length,
      initialTabCount,
      "No additional tab should be created"
    );
  } finally {
    BrowserTestUtils.removeTab(chatTab);
    BrowserTestUtils.removeTab(existingTab);
  }
});

/**
 * Non-http(s) schemes (javascript:, data:, file:) must be silently
 * blocked. Dispatches the OpenLink event directly since the Sanitizer
 * API may strip non-http hrefs from rendered markdown.
 */
add_task(async function test_non_http_schemes_are_blocked() {
  const chatTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:aichatcontent"
  );

  try {
    const initialTabCount = gBrowser.tabs.length;

    await SpecialPowers.spawn(chatTab.linkedBrowser, [], async () => {
      for (const url of [
        "javascript:alert(1)",
        "data:text/html,hi",
        "file:///etc/passwd",
      ]) {
        content.document.dispatchEvent(
          new content.CustomEvent("AIChatContent:OpenLink", {
            bubbles: true,
            detail: { url },
          })
        );
      }
    });

    // Give actor messaging a tick to deliver any would-be tab opens.
    await new Promise(r => Services.tm.dispatchToMainThread(r));

    Assert.equal(
      gBrowser.tabs.length,
      initialTabCount,
      "No tabs should be opened for non-http(s) URLs"
    );
  } finally {
    BrowserTestUtils.removeTab(chatTab);
  }
});

/**
 * Empty or missing URLs should be silently ignored without opening a tab.
 */
add_task(async function test_empty_url_is_ignored() {
  const chatTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:aichatcontent"
  );

  try {
    const initialTabCount = gBrowser.tabs.length;

    await SpecialPowers.spawn(chatTab.linkedBrowser, [], async () => {
      for (const url of ["", undefined]) {
        content.document.dispatchEvent(
          new content.CustomEvent("AIChatContent:OpenLink", {
            bubbles: true,
            detail: { url },
          })
        );
      }
    });

    await new Promise(r => Services.tm.dispatchToMainThread(r));

    Assert.equal(
      gBrowser.tabs.length,
      initialTabCount,
      "No tabs should be opened for empty/missing URLs"
    );
  } finally {
    BrowserTestUtils.removeTab(chatTab);
  }
});
