/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { GetPageContent } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs"
);

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

function createFakeBrowser(url, hasBrowsingContext = true) {
  const parsedUrl = new URL(url);
  const browser = {
    currentURI: {
      spec: url,
      hostPort: parsedUrl.host,
    },
  };

  if (hasBrowsingContext) {
    browser.browsingContext = {
      currentWindowContext: {
        getActor: sinon.stub().resolves({
          getText: sinon.stub().resolves({ text: "Sample page content" }),
          getReaderModeContent: sinon.stub().resolves({ text: "" }),
        }),
      },
    };
  } else {
    browser.browsingContext = null;
  }

  return browser;
}

function createFakeTab(url, title, hasBrowsingContext = true) {
  return {
    linkedBrowser: createFakeBrowser(url, hasBrowsingContext),
    label: title,
  };
}

function createFakeWindow(tabs, closed = false, isAIWindow = true) {
  return {
    closed,
    gBrowser: {
      tabs,
    },
    document: {
      documentElement: {
        hasAttribute: attr => attr === "ai-window" && isAIWindow,
      },
    },
  };
}

function setupBrowserWindowTracker(sandbox, windows) {
  const BrowserWindowTracker = ChromeUtils.importESModule(
    "resource:///modules/BrowserWindowTracker.sys.mjs"
  ).BrowserWindowTracker;

  let windowArray;
  if (windows === null) {
    windowArray = [];
  } else if (Array.isArray(windows)) {
    windowArray = windows;
  } else {
    windowArray = [windows];
  }
  sandbox.stub(BrowserWindowTracker, "orderedWindows").get(() => windowArray);
}

add_task(async function test_getPageContent_exact_url_match() {
  const sb = sinon.createSandbox();

  try {
    const targetUrl = "https://example.com/page";
    const tabs = [
      createFakeTab("https://other.com", "Other"),
      createFakeTab(targetUrl, "Example Page"),
    ];

    setupBrowserWindowTracker(sb, createFakeWindow(tabs));

    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      new Set([targetUrl])
    );

    const result = result_array[0];

    Assert.ok(result, "Result should have text property");
    Assert.ok(result.includes("Example Page"), "Should include page title");
    Assert.ok(
      result.includes("Sample page content"),
      "Should include page content"
    );
    Assert.ok(
      result.includes(targetUrl),
      "Should include URL in result message"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_getPageContent_hostname_match() {
  const sb = sinon.createSandbox();

  try {
    const tabs = [
      createFakeTab("https://example.com/page", "Example Page"),
      createFakeTab("https://other.com", "Other"),
    ];

    setupBrowserWindowTracker(sb, createFakeWindow(tabs));

    const result_array = await GetPageContent.getPageContent(
      { url_list: ["http://example.com/different"] },
      new Set(["http://example.com/different"])
    );

    const result = result_array[0];

    Assert.ok(
      result.includes("Example Page"),
      "Should match by hostname when exact match fails"
    );
    Assert.ok(
      result.includes("Sample page content"),
      "Should include page content"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_getPageContent_tab_not_found_with_allowed_url() {
  const sb = sinon.createSandbox();

  try {
    const targetUrl = "https://external.com/article";
    const tabs = [
      createFakeTab("https://example.com", "Example"),
      createFakeTab("https://other.com", "Other"),
    ];

    setupBrowserWindowTracker(sb, createFakeWindow(tabs));

    const allowedUrls = new Set([targetUrl]);
    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      allowedUrls
    );

    const result = result_array[0];

    // Headless extraction doesn't work in xpcshell environment
    // In real usage, this would attempt headless extraction for allowed URLs
    Assert.ok(
      result.includes("Cannot find URL"),
      "Should return error when tab not found (headless doesn't work in xpcshell)"
    );
    Assert.ok(result.includes(targetUrl), "Should include target URL in error");
  } finally {
    sb.restore();
  }
});

add_task(
  async function test_getPageContent_tab_not_found_without_allowed_url() {
    const sb = sinon.createSandbox();

    try {
      const targetUrl = "https://notfound.com/page";
      const tabs = [
        createFakeTab("https://example.com", "Example"),
        createFakeTab("https://other.com", "Other"),
        createFakeTab("https://third.com", "Third"),
        createFakeTab("https://fourth.com", "Fourth"),
      ];

      setupBrowserWindowTracker(sb, createFakeWindow(tabs));

      const allowedUrls = new Set(["https://different.com"]);

      // When URL is not in allowedUrls, it attempts headless extraction
      // This doesn't work in xpcshell, so we expect an error
      let errorThrown = false;
      try {
        await GetPageContent.getPageContent(
          { url_list: [targetUrl] },
          allowedUrls
        );
      } catch (error) {
        errorThrown = true;
        Assert.ok(
          error.message.includes("addProgressListener"),
          "Should fail with headless browser error in xpcshell"
        );
      }

      Assert.ok(
        errorThrown,
        "Should throw error when attempting headless extraction in xpcshell"
      );
    } finally {
      sb.restore();
    }
  }
);

add_task(async function test_getPageContent_no_browsing_context() {
  const sb = sinon.createSandbox();

  try {
    const targetUrl = "https://example.com/loading";
    const tabs = [createFakeTab(targetUrl, "Loading Page", false)];

    setupBrowserWindowTracker(sb, createFakeWindow(tabs));

    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      new Set([targetUrl])
    );
    const result = result_array[0];

    Assert.ok(
      result.includes("Cannot access content"),
      "Should return error for unavailable browsing context"
    );
    Assert.ok(
      result.includes("Loading Page"),
      "Should include tab label in error"
    );
    Assert.ok(
      result.includes(targetUrl),
      "Should include URL in error message"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_getPageContent_successful_extraction() {
  const sb = sinon.createSandbox();

  try {
    const targetUrl = "https://example.com/article";
    const pageContent = "This is a well-written article with lots of content.";

    const mockExtractor = {
      getText: sinon.stub().resolves({ text: pageContent }),
      getReaderModeContent: sinon.stub().resolves({ text: "" }),
    };

    const tab = createFakeTab(targetUrl, "Article");
    tab.linkedBrowser.browsingContext.currentWindowContext.getActor = sinon
      .stub()
      .resolves(mockExtractor);

    setupBrowserWindowTracker(sb, createFakeWindow([tab]));

    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      new Set([targetUrl])
    );

    const result = result_array[0];

    Assert.ok(result.includes("Content (full page)"), "Should indicate mode");
    Assert.ok(result.includes("Article"), "Should include tab title");
    Assert.ok(result.includes(targetUrl), "Should include URL");
    Assert.ok(result.includes(pageContent), "Should include extracted content");
  } finally {
    sb.restore();
  }
});

add_task(async function test_getPageContent_content_truncation() {
  const sb = sinon.createSandbox();

  try {
    const targetUrl = "https://example.com/long";
    const longContent = "A".repeat(15000);

    const mockExtractor = {
      getText: sinon.stub().resolves({ text: longContent }),
      getReaderModeContent: sinon.stub().resolves({ text: "" }),
    };

    const tab = createFakeTab(targetUrl, "Long Page");
    tab.linkedBrowser.browsingContext.currentWindowContext.getActor = sinon
      .stub()
      .resolves(mockExtractor);

    setupBrowserWindowTracker(sb, createFakeWindow([tab]));

    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      new Set([targetUrl])
    );
    const result = result_array[0];

    const contentMatch = result.match(/Content \(full page\) from.*:\s*(.*)/s);
    Assert.ok(contentMatch, "Should match content pattern");

    const extractedContent = contentMatch[1].trim();
    Assert.lessOrEqual(
      extractedContent.length,
      10003,
      "Content should be truncated to ~10000 chars (with ...)"
    );
    Assert.ok(
      extractedContent.endsWith("..."),
      "Truncated content should end with ..."
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_getPageContent_empty_content() {
  const sb = sinon.createSandbox();

  try {
    const targetUrl = "https://example.com/empty";

    const mockExtractor = {
      getText: sinon.stub().resolves({ text: "   \n  \n   " }),
      getReaderModeContent: sinon.stub().resolves({ text: "" }),
    };

    const tab = createFakeTab(targetUrl, "Empty Page");
    tab.linkedBrowser.browsingContext.currentWindowContext.getActor = sinon
      .stub()
      .resolves(mockExtractor);

    setupBrowserWindowTracker(sb, createFakeWindow([tab]));

    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      new Set([targetUrl])
    );

    const result = result_array[0];

    // Whitespace content is normalized but still returns success
    Assert.ok(
      result.includes("Content (full page)"),
      "Should use full page mode after reader fallback"
    );
    Assert.ok(result.includes("Empty Page"), "Should include tab label");
    // The content is essentially empty after normalization, but still returned
    Assert.ok(
      result.match(/:\s*$/),
      "Content should be mostly empty after normalization"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_getPageContent_extraction_error() {
  const sb = sinon.createSandbox();

  try {
    const targetUrl = "https://example.com/error";

    const mockExtractor = {
      getText: sinon.stub().rejects(new Error("Extraction failed")),
      getReaderModeContent: sinon.stub().resolves({ text: "" }),
    };

    const tab = createFakeTab(targetUrl, "Error Page");
    tab.linkedBrowser.browsingContext.currentWindowContext.getActor = sinon
      .stub()
      .resolves(mockExtractor);

    setupBrowserWindowTracker(sb, createFakeWindow([tab]));

    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      new Set([targetUrl])
    );

    const result = result_array[0];

    Assert.ok(
      result.includes("returned no content"),
      "Should handle extraction error gracefully"
    );
    Assert.ok(result.includes("Error Page"), "Should include tab label");
  } finally {
    sb.restore();
  }
});

add_task(async function test_getPageContent_reader_mode_string() {
  const sb = sinon.createSandbox();

  try {
    const targetUrl = "https://example.com/reader";
    const readerContent = "Clean reader mode text";

    const mockExtractor = {
      getText: sinon.stub().resolves({ text: "Full content" }),
      getReaderModeContent: sinon.stub().resolves({ text: readerContent }),
    };

    const tab = createFakeTab(targetUrl, "Reader Test");
    tab.linkedBrowser.browsingContext.currentWindowContext.getActor = sinon
      .stub()
      .resolves(mockExtractor);

    setupBrowserWindowTracker(sb, createFakeWindow([tab]));

    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      new Set([targetUrl])
    );

    const result = result_array[0];

    Assert.ok(
      result.includes("Content (reader mode)"),
      "Should use reader mode by default"
    );
    Assert.ok(
      result.includes(readerContent),
      "Should include reader mode content"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_getPageContent_invalid_url_format() {
  const sb = sinon.createSandbox();

  try {
    const targetUrl = "not-a-valid-url";
    const tabs = [createFakeTab("https://example.com", "Example")];

    setupBrowserWindowTracker(sb, createFakeWindow(tabs));

    // Add URL to allowed list so it searches tabs instead of trying headless
    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      new Set([targetUrl])
    );
    const result = result_array[0];

    Assert.ok(
      result.includes("Cannot find URL"),
      "Should handle invalid URL format"
    );
  } finally {
    sb.restore();
  }
});
