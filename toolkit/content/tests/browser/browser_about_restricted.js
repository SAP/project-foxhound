/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

const CROSS_SITE_TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.org"
);

const ADULT_URL = TEST_PATH + "file_restricted.html";
const CROSS_SITE_ADULT_URL = CROSS_SITE_TEST_PATH + "file_restricted.html";
const ADULT_URL_DYNAMIC = TEST_PATH + "file_restricted_dynamic.html";
const PAGE_WITH_LINK_TO_ADULT_URL =
  TEST_PATH + "file_restricted_navigation.html";
const PAGE_WITH_FRAMED_ADULT_URL = TEST_PATH + "file_restricted_frame.html";
const ADULT_DATA_URL =
  "data:text/html;base64,PCFET0NUWVBFIGh0bWw+CjxodG1sPgo8aGVhZD4KPHRpdGxlPnJlc3RyaWN0ZWQ8L3RpdGxlPgo8bWV0YSBuYW1lPSJSQVRJTkciIGNvbnRlbnQ9IlJUQS01MDQyLTE5OTYtMTQwMC0xNTc3LVJUQSIgLz4KPHNjcmlwdD4KICB2YXIgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoIlRlc3RLZWVwc1J1bm5pbmdTY3JpcHRzIik7CiAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCwge2J1YmJsZXM6dHJ1ZX0pOwo8L3NjcmlwdD4KPC9oZWFkPgo8Ym9keT4KPC9ib2R5Pgo8L2h0bWw+Cg==";
const SAFE_URL = TEST_PATH + "file_empty.html";
const ADULT_URL_HOST = "example.com";
const CROSS_SITE_ADULT_URL_HOST = "example.org";
const RESTRICTED_EXAMPLE_URL = "about:restricted?e=restrictedcontent";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["security.restrict_to_adults.always", true]],
  });
});

// This checks that the contents of the about:restricted page are correct!
async function validateErrorPageContents(args) {
  const { whyIsAlways, host, errorSourceURL } = args;
  const { searchParams } = URL.fromURI(content.document.documentURIObject);
  const errorCode = searchParams.get("e");
  is(
    errorCode,
    "restrictedcontent",
    "Correct error page url parameter for error code"
  );
  let why = content.document.getElementById("errorShortDesc2");
  if (whyIsAlways) {
    is(
      why.getAttribute("data-l10n-id"),
      "restricted-page-explain-why-always",
      "Correct error message for always showing the error page on adult content"
    );
  } else {
    is(
      why.getAttribute("data-l10n-id"),
      "restricted-page-explain-why",
      "Correct error message for respecting the platform configuration"
    );
  }
  let what = content.document.getElementById("errorShortDesc");
  if (host) {
    is(
      what.getAttribute("data-l10n-id"),
      "restricted-page-explain-what-named",
      "Correct error message if we redirected to the about:restricted page"
    );
    is(
      JSON.parse(what.getAttribute("data-l10n-args")).host,
      host,
      "Correct host if we redirected to the about:restricted page"
    );
  } else {
    is(
      what.getAttribute("data-l10n-id"),
      "restricted-page-explain-what",
      "Correct error message if no url provided to the about:restricted page"
    );
  }
  if (errorSourceURL) {
    const encodedURL = searchParams.get("u");
    const argSourceURL = decodeURI(encodedURL);
    is(
      argSourceURL,
      errorSourceURL,
      "Correct URL appears in the URL search parameter `u` for the error page"
    );
  }
}

add_task(async function test_correct_error_message() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;
  let doneLoading = BrowserTestUtils.waitForContentEvent(
    browser,
    "AboutRestrictedLoad",
    false,
    null,
    true
  );
  BrowserTestUtils.startLoadingURIString(browser, RESTRICTED_EXAMPLE_URL);
  await doneLoading;
  ok(browser.isRemoteBrowser, "Browser should be remote.");
  await ContentTask.spawn(
    browser,
    {
      whyIsAlways: true,
    },
    validateErrorPageContents
  );
  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.pushPrefEnv({
    set: [["security.restrict_to_adults.always", false]],
  });

  tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  browser = tab.linkedBrowser;
  doneLoading = BrowserTestUtils.waitForContentEvent(
    browser,
    "AboutRestrictedLoad",
    false,
    null,
    true
  );
  BrowserTestUtils.startLoadingURIString(browser, RESTRICTED_EXAMPLE_URL);
  await doneLoading;
  ok(browser.isRemoteBrowser, "Browser should be remote.");
  await ContentTask.spawn(
    browser,
    {
      whyIsAlways: false,
    },
    validateErrorPageContents
  );
  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_inaction_for_safe_url() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;
  let browserLoaded = BrowserTestUtils.browserLoaded(
    browser,
    false,
    SAFE_URL,
    true
  );

  BrowserTestUtils.startLoadingURIString(browser, SAFE_URL);
  await browserLoaded;

  await ContentTask.spawn(browser, SAFE_URL, async function (safe_url) {
    is(
      content.document.documentURI,
      safe_url,
      "Did not redirect to the about:restricted page"
    );
  });
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_inaction_for_not_enabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["security.restrict_to_adults.always", false]],
  });
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;
  let browserLoaded = BrowserTestUtils.browserLoaded(
    browser,
    false,
    ADULT_URL,
    true
  );

  BrowserTestUtils.startLoadingURIString(browser, ADULT_URL);
  await browserLoaded;

  await ContentTask.spawn(browser, ADULT_URL, async function (safe_url) {
    is(
      content.document.documentURI,
      safe_url,
      "Did not redirect to the about:restricted page"
    );
  });
  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_redirect() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;
  let doneLoading = BrowserTestUtils.waitForContentEvent(
    browser,
    "AboutRestrictedLoad",
    false,
    null,
    true
  );
  BrowserTestUtils.startLoadingURIString(browser, ADULT_URL);
  await doneLoading;
  ok(browser.isRemoteBrowser, "Browser should be remote.");
  await ContentTask.spawn(
    browser,
    { whyIsAlways: true, host: ADULT_URL_HOST, errorSourceURL: ADULT_URL },
    validateErrorPageContents
  );
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_data_url() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;
  let doneLoading = BrowserTestUtils.waitForContentEvent(
    browser,
    "AboutRestrictedLoad",
    false,
    null,
    true
  );
  BrowserTestUtils.startLoadingURIString(browser, ADULT_DATA_URL);
  await doneLoading;
  ok(browser.isRemoteBrowser, "Browser should be remote.");
  await ContentTask.spawn(
    browser,
    { whyIsAlways: true, host: undefined, errorSourceURL: "" },
    validateErrorPageContents
  );
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_further_tags_not_handled() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;
  let doneLoading = BrowserTestUtils.waitForContentEvent(
    browser,
    "AboutRestrictedLoad",
    false,
    null,
    true
  );
  let ranMoreScripts = false;
  let ranMoreScriptsPromise = BrowserTestUtils.waitForContentEvent(
    browser,
    "TestKeepsRunningScripts",
    false,
    null,
    true
  );
  ranMoreScriptsPromise
    .catch(() => {
      ok(
        false,
        "We should not get a rejection from the listener for TestKeepsRunningScripts"
      );
    })
    .finally(() => {
      ok(
        false,
        "We should not fulfill the listener for TestKeepsRunningScripts"
      );
      ranMoreScripts = true;
    });
  BrowserTestUtils.startLoadingURIString(browser, ADULT_URL);
  await doneLoading;
  is(
    ranMoreScripts,
    false,
    "Did not run more scripts after handling the meta rating tag"
  );
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_dynamic_bind() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;
  let doneLoading = BrowserTestUtils.waitForContentEvent(
    browser,
    "AboutRestrictedLoad",
    false,
    null,
    true
  );
  let ranMoreScripts = false;
  let ranMoreScriptsPromise = BrowserTestUtils.waitForContentEvent(
    browser,
    "TestKeepsRunningScripts",
    false,
    null,
    true
  );
  ranMoreScriptsPromise
    .catch(() => {
      ok(
        false,
        "We should not get a rejection from the listener for TestKeepsRunningScripts"
      );
    })
    .finally(() => {
      ok(
        false,
        "We should not fulfill the listener for TestKeepsRunningScripts"
      );
      ranMoreScripts = false;
    });
  BrowserTestUtils.startLoadingURIString(browser, ADULT_URL_DYNAMIC);
  await doneLoading;
  ok(browser.isRemoteBrowser, "Browser should be remote.");
  await ContentTask.spawn(
    browser,
    {
      whyIsAlways: true,
      host: ADULT_URL_HOST,
      errorSourceURL: ADULT_URL_DYNAMIC,
    },
    validateErrorPageContents
  );
  is(
    ranMoreScripts,
    false,
    "Did not run more scripts after handling the meta rating tag"
  );
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_go_back() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;

  BrowserTestUtils.startLoadingURIString(browser, SAFE_URL);
  await BrowserTestUtils.browserLoaded(browser, false, SAFE_URL);

  let doneLoading = BrowserTestUtils.waitForContentEvent(
    browser,
    "AboutRestrictedLoad",
    false,
    null,
    true
  );
  BrowserTestUtils.startLoadingURIString(browser, ADULT_URL);
  await doneLoading;
  let pageShownPromise = BrowserTestUtils.waitForContentEvent(
    browser,
    "pageshow",
    true
  );
  await ContentTask.spawn(browser, {}, async function () {
    let returnButton = content.document.getElementById("goBack");
    returnButton.click();
  });
  await pageShownPromise;
  is(gBrowser.currentURI.spec, SAFE_URL, "Went back");
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_same_origin_iframe() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;
  let doneLoading = BrowserTestUtils.waitForContentEvent(
    browser,
    "AboutRestrictedLoad",
    false,
    null,
    true
  );
  BrowserTestUtils.startLoadingURIString(browser, PAGE_WITH_FRAMED_ADULT_URL);
  await doneLoading;
  await ContentTask.spawn(browser, {}, async function () {
    ok(
      !content.document.documentURI.startsWith("about:restricted"),
      "top document should not be an about:restricted page"
    );
    let frame = content.document.getElementById("frame");
    ok(
      frame.contentWindow.document.documentURI.startsWith("about:restricted"),
      "the frame should be a restricted page"
    );
  });
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_cross_site_iframe() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;
  let doneLoading = BrowserTestUtils.waitForContentEvent(
    browser,
    "AboutRestrictedLoad",
    false,
    null,
    true
  );
  BrowserTestUtils.startLoadingURIString(
    browser,
    PAGE_WITH_FRAMED_ADULT_URL + "?host=" + CROSS_SITE_ADULT_URL_HOST
  );
  await doneLoading;
  await ContentTask.spawn(browser, {}, async function () {
    ok(
      !content.document.documentURI.startsWith("about:restricted"),
      "top document should not be an about:restricted page"
    );
    info("It'd be better to test this directly, but this works.");
    ok(
      true,
      "Since we received an AboutRestrictedLoad, it must have bubbled from the xorigin frame"
    );
  });
  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_same_origin_navigation() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;
  let browserLoaded = BrowserTestUtils.browserLoaded(
    browser,
    false,
    PAGE_WITH_LINK_TO_ADULT_URL,
    true
  );

  BrowserTestUtils.startLoadingURIString(browser, PAGE_WITH_LINK_TO_ADULT_URL);
  await browserLoaded;

  let doneLoading = BrowserTestUtils.waitForContentEvent(
    browser,
    "AboutRestrictedLoad",
    false,
    null,
    true
  );

  await BrowserTestUtils.synthesizeMouseAtCenter("#link", {}, browser);
  await doneLoading;
  await ContentTask.spawn(
    browser,
    {
      whyIsAlways: true,
      host: ADULT_URL_HOST,
      errorSourceURL: ADULT_URL,
    },
    validateErrorPageContents
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_cross_site_navigation() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  let browser = tab.linkedBrowser;
  let browserLoaded = BrowserTestUtils.browserLoaded(
    browser,
    false,
    PAGE_WITH_LINK_TO_ADULT_URL + "?host=" + CROSS_SITE_ADULT_URL_HOST,
    true
  );

  BrowserTestUtils.startLoadingURIString(
    browser,
    PAGE_WITH_LINK_TO_ADULT_URL + "?host=" + CROSS_SITE_ADULT_URL_HOST
  );
  await browserLoaded;

  let doneLoading = BrowserTestUtils.waitForContentEvent(
    browser,
    "AboutRestrictedLoad",
    false,
    null,
    true
  );

  await BrowserTestUtils.synthesizeMouseAtCenter("#link", {}, browser);
  await doneLoading;
  await ContentTask.spawn(
    browser,
    {
      whyIsAlways: true,
      host: CROSS_SITE_ADULT_URL_HOST,
      errorSourceURL: CROSS_SITE_ADULT_URL,
    },
    validateErrorPageContents
  );

  BrowserTestUtils.removeTab(tab);
});
