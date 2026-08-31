/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

do_get_profile();

const { GetPageContent } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs"
);

const { PageExtractorParent } = ChromeUtils.importESModule(
  "resource://gre/actors/PageExtractorParent.sys.mjs"
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
      makeConversation()
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

add_task(async function test_getPageContent_multiple_urls() {
  const sb = sinon.createSandbox();

  try {
    const url1 = "https://example.com/page";
    const url2 = "https://other.com";
    const tabs = [
      createFakeTab(url1, "Page One"),
      createFakeTab(url2, "Page Two"),
    ];

    setupBrowserWindowTracker(sb, createFakeWindow(tabs));

    const result_array = await GetPageContent.getPageContent(
      { url_list: [url1, url2] },
      makeConversation()
    );

    Assert.equal(result_array.length, 2, "Should return results for both URLs");
    Assert.ok(
      result_array[0].includes("Page One"),
      "First result should contain first tab title"
    );
    Assert.ok(
      result_array[1].includes("Page Two"),
      "Second result should contain second tab title"
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

    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      makeConversation()
    );

    const result = result_array[0];

    // Headless extraction doesn't work in xpcshell environment so it falls
    // back to the catch handler.
    Assert.ok(
      result.includes("Could not retrieve the content for the page"),
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

      const conversation = makeConversation({
        privateData: true,
        untrustedInput: true,
      });

      const result_array = await GetPageContent.getPageContent(
        { url_list: [targetUrl] },
        conversation
      );

      const result = result_array[0];

      Assert.ok(
        result.includes("Access is not allowed"),
        "Should return access denied message when URL is not in allowed list"
      );
      Assert.ok(result.includes(targetUrl), "Should include the target URL");
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
      makeConversation()
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
      makeConversation()
    );

    const result = result_array[0];

    Assert.ok(result.includes("Content from"), "Should indicate content mode");
    Assert.ok(result.includes("Article"), "Should include tab title");
    Assert.ok(result.includes(targetUrl), "Should include URL");
    Assert.ok(result.includes(pageContent), "Should include extracted content");
  } finally {
    sb.restore();
  }
});

add_task(async function test_getPageContent_content_format() {
  const sb = sinon.createSandbox();

  try {
    const targetUrl = "https://example.com/long";
    const pageContent = "A".repeat(500);

    const mockExtractor = {
      getText: sinon.stub().resolves({ text: pageContent }),
      getReaderModeContent: sinon.stub().resolves({ text: "" }),
    };

    const tab = createFakeTab(targetUrl, "Long Page");
    tab.linkedBrowser.browsingContext.currentWindowContext.getActor = sinon
      .stub()
      .resolves(mockExtractor);

    setupBrowserWindowTracker(sb, createFakeWindow([tab]));

    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      makeConversation()
    );
    const result = result_array[0];

    Assert.ok(
      result.includes("Content from"),
      "Should start with content prefix"
    );
    Assert.ok(result.includes(targetUrl), "Should include URL in label");
    Assert.ok(result.includes(pageContent), "Should include full content");
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
      makeConversation()
    );

    const result = result_array[0];

    Assert.ok(
      result.includes("Content from"),
      "Should return content result even for whitespace-only content"
    );
    Assert.ok(result.includes("Empty Page"), "Should include tab label");
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
      makeConversation()
    );

    const result = result_array[0];

    Assert.ok(
      result.includes("Could not retrieve the content for the page"),
      "Should handle extraction error gracefully"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_getPageContent_reader_mode_content() {
  const sb = sinon.createSandbox();

  try {
    const targetUrl = "https://example.com/reader";
    const pageContent = "Clean reader mode text";

    const mockExtractor = {
      getText: sinon.stub().resolves({ text: pageContent }),
      getReaderModeContent: sinon.stub().resolves({ text: pageContent }),
    };

    const tab = createFakeTab(targetUrl, "Reader Test");
    tab.linkedBrowser.browsingContext.currentWindowContext.getActor = sinon
      .stub()
      .resolves(mockExtractor);

    setupBrowserWindowTracker(sb, createFakeWindow([tab]));

    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      makeConversation()
    );

    const result = result_array[0];

    Assert.ok(result.includes("Content from"), "Should return content result");
    Assert.ok(
      result.includes(pageContent),
      "Should include the extracted content"
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

    const result_array = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      makeConversation()
    );
    const result = result_array[0];

    Assert.ok(
      result.includes("This URL is not allowed"),
      "Should handle invalid URL format"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_getPageContent_refuses_both_security_flags() {
  const conversation = makeConversation({
    privateData: true,
    untrustedInput: true,
  });
  const result = await GetPageContent.getPageContent(
    { url_list: ["https://example.com"] },
    conversation
  );
  Assert.equal(result.length, 1, "Should return one message");
  Assert.ok(
    result[0].includes("Access is not allowed"),
    "Should return refusal message when both security flags are set"
  );
});

add_task(async function test_getPageContent_allows_untrusted_input_only() {
  const sb = sinon.createSandbox();
  try {
    const targetUrl = "https://example.com/page";
    const tabs = [createFakeTab(targetUrl, "Example Page")];
    setupBrowserWindowTracker(sb, createFakeWindow(tabs));

    const conversation = makeConversation({ untrustedInput: true });
    const result = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      conversation
    );
    Assert.equal(result.length, 1, "Should return one result");
    Assert.ok(
      result[0].includes("Example Page"),
      "Should return real content, not a refusal"
    );
  } finally {
    sb.restore();
  }
});

add_task(
  async function test_getPageContent_returns_error_string_for_non_array_url_list() {
    const result = await GetPageContent.getPageContent(
      { url_list: "not-an-array" },
      makeConversation()
    );
    Assert.equal(typeof result, "string", "Should return a string");
    Assert.ok(
      result.startsWith("Error:"),
      "Should return an error string so the model can self-correct"
    );
  }
);

add_task(async function test_getPageContent_ledger_url_uses_stripped_fetch() {
  // A URL in the untrusted ledger (e.g. one extracted from a SERP) should
  // bypass the private+untrusted block and be fetched through a stripped
  // headless extractor with `anonymousFetch: true`.
  const sb = sinon.createSandbox();
  try {
    const targetUrl = "https://search-result.example.com/article";
    const tabs = [createFakeTab("https://other.com", "Other")];
    setupBrowserWindowTracker(sb, createFakeWindow(tabs));

    const extractedText = "Stripped page content";
    const headlessStub = sb
      .stub(PageExtractorParent, "getHeadlessExtractor")
      .callsFake(({ callback }) => {
        const fakeExtractor = {
          getText: sinon.stub().resolves({
            text: extractedText,
            links: [],
          }),
        };
        return callback(fakeExtractor);
      });

    const conversation = makeConversation({
      privateData: true,
      untrustedInput: true,
    });
    conversation.serpUrlsForAnonymousFetch = new Set([targetUrl]);

    const result = await GetPageContent.getPageContent(
      { url_list: [targetUrl] },
      conversation
    );

    Assert.equal(result.length, 1, "Should return one result");
    Assert.equal(
      result[0],
      "Content from https://search-result.example.com/article:\n\nStripped page content",
      "Should return the content extracted by the headless extractor"
    );
    Assert.ok(
      headlessStub.calledOnce,
      "getHeadlessExtractor should be called for the ledger URL"
    );
    Assert.equal(
      headlessStub.firstCall.args[0].urlString,
      targetUrl,
      "Headless extractor should be called with the SERP URL"
    );
    Assert.equal(
      headlessStub.firstCall.args[0].anonymousFetch,
      true,
      "Ledger URLs must use the stripped fetch path"
    );
  } finally {
    sb.restore();
  }
});
