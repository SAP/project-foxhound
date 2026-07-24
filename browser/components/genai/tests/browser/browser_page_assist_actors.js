/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Test PageAssist actors functionality
 */

const TEST_PAGE_URL = getRootDirectory(gTestPath) + "data/readableEn.html";
const TEST_HTML_PAGE = `
  <!DOCTYPE html>
  <html>
    <head><title>Simple Test Page</title></head>
    <body>
      <p>This is a simple paragraph.</p>
    </body>
  </html>
`;
const NON_READABLE_HTML = `
    <!DOCTYPE html>
    <html>
      <head><title>Non-readerable Page</title></head>
      <body>empty</body>
    </html>
  `;
const TEST_LINK_URL_EN =
  "https://example.com/browser/browser/components/genai/tests/browser/data/readableEn.html";

/**
 * Helpers
 */

function getPageAssistParentActor(browser) {
  return browser.browsingContext.currentWindowGlobal.getActor("PageAssist");
}

function assertCommonPageData(pageData) {
  Assert.ok(pageData, "Page data should be returned");
  Assert.ok(pageData.title, "Page should have a title");
  Assert.equal(
    typeof pageData.isReaderable,
    "boolean",
    "isReaderable should be a boolean"
  );
}

registerCleanupFunction(async () => {
  // Ensure sidebar is hidden after each test:
  try {
    await SpecialPowers.popPrefEnv(); // undo any pushPrefEnv from this test
  } catch {}
  if (!document.getElementById("sidebar-box").hidden) {
    info(
      `Sidebar ${SidebarController.currentID} was left open, closing it in cleanup function`
    );
    SidebarController.hide({ dismissPanel: true });
  }
});

// Waits until AboutReader has had a chance to set the flag for the selected tab.
async function waitForReaderFlag(browser, expected) {
  await BrowserTestUtils.waitForCondition(
    () => browser.isArticle === expected,
    `selectedBrowser.isArticle should be ${expected}`
  );
}

// Loads a URL and waits for the reader flag to match expectation.
async function loadAndAwaitReader(browser, url, expected) {
  BrowserTestUtils.startLoadingURIString(browser, url);
  await BrowserTestUtils.browserLoaded(browser);
  await waitForReaderFlag(browser, expected);
}

/**
 * Open the Page Assist sidebar and return the page-assist element util
 *
 * @returns {Promise<HTMLElement>} page-assist element
 */
async function openPageAssistSidebar() {
  await SidebarController.show("viewGenaiPageAssistSidebar");
  const sideBarEl = SidebarController.browser.contentWindow.document;
  const pageAssistEl = sideBarEl.querySelector("page-assist");
  Assert.ok(pageAssistEl, "Page assist element should exist");

  await BrowserTestUtils.waitForCondition(
    () => pageAssistEl.shadowRoot,
    "Shadow root should exist"
  );
  return pageAssistEl;
}

/**
 * Test that PageAssistChild can fetch page data correctly
 */
add_task(async function test_page_assist_child_fetch_data() {
  await BrowserTestUtils.withNewTab(TEST_PAGE_URL, async browser => {
    const parentActor = getPageAssistParentActor(browser);
    const pageData = await parentActor.fetchPageData();

    Assert.ok(pageData, "Page data should be returned");
    Assert.equal(
      pageData.url,
      TEST_PAGE_URL,
      "Page URL should match test page"
    );
    assertCommonPageData(pageData);

    if (pageData.isReaderable) {
      Assert.ok(pageData.content, "Readable page should have content");
      Assert.ok(pageData.excerpt, "Readable page should have excerpt");
      Assert.ok(pageData.textContent, "Page should have text content");
    }
  });
});

/**
 * Test PageAssist integration with sidebar
 */
add_task(async function test_page_assist_sidebar_integration() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ml.pageAssist.enabled", true]],
  });

  await BrowserTestUtils.withNewTab(TEST_LINK_URL_EN, async browser => {
    // 1) Open sidebar and wait until readerable flag is known for the current page.
    const sidebarEl = await openPageAssistSidebar();

    await waitForReaderFlag(browser, /* expected */ true);
    await BrowserTestUtils.waitForCondition(
      () => sidebarEl.isCurrentPageReaderable === true,
      "Sidebar should mirror browser.isArticle === true"
    );

    // 2) Grab controls and assert initial enabled state.
    const shadowRoot = sidebarEl.shadowRoot;
    const textarea = shadowRoot.querySelector("page-assists-input");
    const submitBtn = shadowRoot.querySelector("page-assists-input");
    Assert.ok(textarea, "Prompt textarea should exist");
    Assert.ok(submitBtn, "Submit button should exist");

    // 3) Stub the AI call so we can test submission deterministically.
    const { PageAssist } = ChromeUtils.importESModule(
      "moz-src:///browser/components/genai/PageAssist.sys.mjs"
    );
    const originalFetchAi = PageAssist.fetchAiResponse;
    PageAssist.fetchAiResponse = async (prompt, pageData) => {
      // sanity: pageData should be readerable here
      Assert.ok(
        pageData?.isReaderable,
        "fetchPageData used on a readerable page"
      );
      return `STUBBED: ${prompt}`;
    };

    // 4) Type a prompt and submit, then verify UI updates.
    textarea.value = "summarize this page";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    shadowRoot.querySelector("#submit-user-prompt-btn").click();

    await BrowserTestUtils.waitForCondition(
      () => sidebarEl.aiResponse?.startsWith("STUBBED:"),
      "aiResponse should appear with stubbed content"
    );
    const respEl = shadowRoot.querySelector(".ai-response");
    Assert.ok(
      respEl && respEl.textContent.includes("STUBBED:"),
      "Response rendered"
    );

    // 5) Navigate to a non-readerable page → controls should disable.
    const nonReadableUrl =
      "data:text/html," + encodeURIComponent(NON_READABLE_HTML);
    await loadAndAwaitReader(browser, nonReadableUrl, /* expected */ false);

    await BrowserTestUtils.waitForCondition(
      () => sidebarEl.isCurrentPageReaderable === false,
      "Sidebar should mirror browser.isArticle === false"
    );

    // 6) Navigate back to a readerable page → controls re-enable.
    await loadAndAwaitReader(browser, TEST_LINK_URL_EN, /* expected */ true);
    await BrowserTestUtils.waitForCondition(
      () => sidebarEl.isCurrentPageReaderable === true,
      "Sidebar should flip back to readerable"
    );

    // 7) Clean up stub + sidebar.
    PageAssist.fetchAiResponse = originalFetchAi;
    SidebarController.hide();
  });

  await SpecialPowers.popPrefEnv();
});

/**
 * Test PageAssist actor message handling
 */
add_task(async function test_page_assist_actor_messages() {
  const dataUrl = "data:text/html," + encodeURIComponent(TEST_HTML_PAGE);

  await BrowserTestUtils.withNewTab(dataUrl, async browser => {
    const parentActor = getPageAssistParentActor(browser);
    const pageData = await parentActor.fetchPageData();

    Assert.ok(pageData, "Should receive page data");
  });
});

/**
 * Test PageAssist with non-readable page
 */
add_task(async function test_page_assist_non_readable_page() {
  const dataUrl = "data:text/html," + encodeURIComponent(NON_READABLE_HTML);

  await BrowserTestUtils.withNewTab(dataUrl, async browser => {
    const parentActor = getPageAssistParentActor(browser);
    const pageData = await parentActor.fetchPageData();

    Assert.ok(pageData, "Page data should be returned");
    // Non-readable expectations based on actor implementation
    Assert.equal(pageData.isReaderable, false, "Should not be readerable");
    Assert.equal(
      pageData.content,
      "",
      "Non-readable page should have empty content"
    );
    Assert.equal(
      pageData.excerpt,
      "",
      "Non-readable page should have empty excerpt"
    );
  });
});

/**
 * Test that page-assist component fetches page data directly
 */
add_task(async function test_page_assist_component_fetch_data() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ml.pageAssist.enabled", true]],
  });

  await BrowserTestUtils.withNewTab(TEST_PAGE_URL, async () => {
    const sideBarEl = await openPageAssistSidebar();
    const pageData = await sideBarEl._fetchPageData();

    Assert.ok(pageData, "Page data should be fetched");
    Assert.equal(pageData.url, TEST_PAGE_URL, "URL should match test page");
    Assert.ok(pageData.title, "Should have title");

    if (pageData.isReaderable) {
      Assert.ok(pageData.textContent, "Should have text content");
    }

    const originalFetch = sideBarEl._fetchPageData;

    // Test handling when no page data is returned
    sideBarEl._fetchPageData = async () => null;

    await sideBarEl._handleSubmit();

    await BrowserTestUtils.waitForCondition(
      () => sideBarEl.aiResponse === "No page data",
      "Should show 'No page data' when fetch fails"
    );

    Assert.equal(
      sideBarEl.aiResponse,
      "No page data",
      "Should handle missing page data"
    );
    sideBarEl._fetchPageData = originalFetch;
    SidebarController.hide();
  });

  await SpecialPowers.popPrefEnv();
});

/**
 * Test isPageReaderable functionality
 */
add_task(async function test_page_assist_is_readerable() {
  // Readable page
  await BrowserTestUtils.withNewTab(TEST_LINK_URL_EN, async browser => {
    await BrowserTestUtils.waitForCondition(
      () => browser.isArticle === true,
      "browser.isArticle should become true for a readable page"
    );
    Assert.ok(
      browser.isArticle,
      "Readable test page should set isArticle = true"
    );
  });

  // Non-readable data: page (AboutReader won't set isArticle)
  const dataUrl = "data:text/html," + encodeURIComponent(NON_READABLE_HTML);
  await BrowserTestUtils.withNewTab(dataUrl, async browser => {
    await BrowserTestUtils.waitForCondition(
      () =>
        browser.currentURI?.spec.startsWith("data:") ||
        browser.isArticle === false,
      "For data: URLs AboutReader may not set isArticle; treat as non-readerable"
    );
    Assert.notStrictEqual(
      browser.isArticle,
      true,
      "Data URL is not readerable"
    );
  });
});

/**
 * Test page-assist component URL change detection
 */
add_task(async function test_page_assist_url_change_detection() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ml.pageAssist.enabled", true]],
  });

  await BrowserTestUtils.withNewTab(TEST_LINK_URL_EN, async browser => {
    const sidebarEl = await openPageAssistSidebar();

    // Initial state: wait for AboutReader to set the flag, then for the component to mirror it.
    await BrowserTestUtils.waitForCondition(
      () =>
        typeof browser.isArticle === "boolean" && browser.isArticle === true,
      "Readable page should set browser.isArticle = true"
    );
    await BrowserTestUtils.waitForCondition(
      () => sidebarEl.isCurrentPageReaderable === true,
      "Sidebar should mirror isArticle = true"
    );

    // Navigate to a non-readable page
    const nonReadableUrl =
      "data:text/html," + encodeURIComponent(NON_READABLE_HTML);
    BrowserTestUtils.startLoadingURIString(browser, nonReadableUrl);
    await BrowserTestUtils.browserLoaded(browser);

    // Wait for the flag flip, then for the component to mirror it
    await BrowserTestUtils.waitForCondition(
      () =>
        typeof browser.isArticle === "boolean" && browser.isArticle === false,
      "After navigation, browser.isArticle should be false"
    );
    await BrowserTestUtils.waitForCondition(
      () => sidebarEl.isCurrentPageReaderable === false,
      "Sidebar should mirror isArticle = false"
    );

    SidebarController.hide();
  });

  await SpecialPowers.popPrefEnv();
});
