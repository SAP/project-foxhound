/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const TEST_URI = `
  <!DOCTYPE html>
  <main>
    <a href="https://example.com/?s=search+terms&page=shopping&abc=ff">
      Shopping
    </a>
    <div class="ai-summary">AI summary</div>
    <div class="ai-summary-display" style="display: none;">AI summary</div>
    <div class="ai-summary-opacity" style="opacity: 0;">AI summary</div>
    <div class="ai-summary-visibility" style="visibility: hidden;">AI summary</div>
  </main>
`;
const URL =
  "https://example.com/document-builder.sjs?html=" +
  encodeURIComponent(TEST_URI) +
  "&s=search+terms&abc=ff";

function createTestConfig(overrides = {}) {
  return [
    {
      telemetryId: "example",
      searchPageRegexp: /^https:\/\/example.com\//,
      queryParamNames: ["s"],
      codeParamName: "abc",
      taggedCodes: ["ff"],
      adServerAttributes: ["mozAttr"],
      nonAdsLinkRegexps: [],
      extraAdServersRegexps: [/^https:\/\/example\.com\/ad/],
      components: [
        {
          type: SearchSERPTelemetryUtils.COMPONENTS.AD_LINK,
          default: true,
        },
      ],
      ...overrides,
    },
  ];
}

add_setup(async function () {
  // Enable local telemetry recording for the duration of the tests.
  let oldCanRecord = Services.telemetry.canRecordExtended;
  Services.telemetry.canRecordExtended = true;

  registerCleanupFunction(async () => {
    SearchSERPTelemetry.overrideSearchTelemetryForTests();
    Services.telemetry.canRecordExtended = oldCanRecord;
    resetTelemetry();
  });
});

add_task(async function test_impression_url() {
  resetTelemetry();

  let config = createTestConfig({
    impressionAttributes: [
      {
        key: "is_shopping_page",
        url: {
          regexp: "&page=shopping",
        },
      },
    ],
  });
  SearchSERPTelemetry.overrideSearchTelemetryForTests(config);
  await waitForIdle();

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    URL + "&page=shopping"
  );
  await waitForPageWithAdImpressions();

  assertSERPTelemetry([
    {
      impression: {
        is_shopping_page: "true",
      },
      adImpressions: [],
    },
  ]);

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_impression_url_value() {
  resetTelemetry();

  let config = createTestConfig({
    impressionAttributes: [
      {
        key: "is_shopping_page",
        value: "false",
      },
    ],
  });
  SearchSERPTelemetry.overrideSearchTelemetryForTests(config);
  await waitForIdle();

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, URL);
  await waitForPageWithAdImpressions();

  assertSERPTelemetry([{}]);

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_impression_element() {
  resetTelemetry();

  let config = createTestConfig({
    impressionAttributes: [
      {
        key: "shopping_tab_displayed",
        element: {
          selector: "a",
        },
      },
    ],
  });

  SearchSERPTelemetry.overrideSearchTelemetryForTests(config);
  await waitForIdle();

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, URL);
  await waitForPageWithAdImpressions();

  assertSERPTelemetry([
    {
      impression: {
        shopping_tab_displayed: "true",
      },
    },
  ]);

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_impression_element_regexp() {
  resetTelemetry();

  let config = createTestConfig({
    impressionAttributes: [
      {
        key: "shopping_tab_displayed",
        element: {
          selector: "a",
          attributeName: "href",
          regexp: "page=shopping",
        },
      },
    ],
  });

  SearchSERPTelemetry.overrideSearchTelemetryForTests(config);
  await waitForIdle();

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, URL);
  await waitForPageWithAdImpressions();

  assertSERPTelemetry([
    {
      impression: {
        shopping_tab_displayed: "true",
      },
    },
  ]);

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_impression_element_regexp_count_true() {
  resetTelemetry();

  let config = createTestConfig({
    impressionAttributes: [
      {
        key: "shopping_tab_displayed",
        element: {
          selector: "a",
          attributeName: "href",
          regexp: "page=shopping",
          component: {
            type: "shopping_tab",
            countImpressions: true,
          },
        },
      },
    ],
  });

  SearchSERPTelemetry.overrideSearchTelemetryForTests(config);
  await waitForIdle();

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, URL);
  await waitForPageWithAdImpressions();

  assertSERPTelemetry([
    {
      impression: {
        shopping_tab_displayed: "true",
      },
      adImpressions: [
        {
          component: SearchSERPTelemetryUtils.COMPONENTS.SHOPPING_TAB,
          ads_loaded: "1",
          ads_visible: "1",
          ads_hidden: "0",
        },
      ],
    },
  ]);

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_impression_element_regexp_count_false() {
  resetTelemetry();

  let config = createTestConfig({
    impressionAttributes: [
      {
        key: "shopping_tab_displayed",
        element: {
          selector: "a",
          attributeName: "href",
          regexp: "page=shopping",
          component: {
            type: "shopping_tab",
            countImpressions: false,
          },
        },
      },
    ],
  });

  SearchSERPTelemetry.overrideSearchTelemetryForTests(config);
  await waitForIdle();

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, URL);
  await waitForPageWithAdImpressions();

  assertSERPTelemetry([
    {
      impression: {
        shopping_tab_displayed: "true",
      },
      adImpressions: [],
    },
  ]);

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_impression_combined() {
  resetTelemetry();

  let config = createTestConfig({
    impressionAttributes: [
      {
        key: "is_shopping_page",
        url: {
          regexp: "&page=shopping",
        },
      },
      {
        key: "shopping_tab_displayed",
        element: {
          selector: "a",
          attributeName: "href",
          regexp: "page=shopping",
          component: {
            type: "shopping_tab",
            countImpressions: true,
          },
        },
      },
      {
        key: "has_ai_summary",
        element: {
          selector: ".ai-summary",
        },
      },
    ],
  });

  SearchSERPTelemetry.overrideSearchTelemetryForTests(config);
  await waitForIdle();

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, URL);
  await waitForPageWithAdImpressions();

  assertSERPTelemetry([
    {
      impression: {
        shopping_tab_displayed: "true",
        has_ai_summary: "true",
      },
      adImpressions: [
        {
          component: SearchSERPTelemetryUtils.COMPONENTS.SHOPPING_TAB,
          ads_loaded: "1",
          ads_visible: "1",
          ads_hidden: "0",
        },
      ],
    },
  ]);

  let promise = BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  let adImpression = waitForPageWithAdImpressions();
  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    content.document.querySelector("a").click();
  });
  await promise;
  await adImpression;

  assertSERPTelemetry([
    {
      impression: {
        shopping_tab_displayed: "true",
        has_ai_summary: "true",
      },
      adImpressions: [
        {
          component: SearchSERPTelemetryUtils.COMPONENTS.SHOPPING_TAB,
          ads_loaded: "1",
          ads_visible: "1",
          ads_hidden: "0",
        },
      ],
      engagements: [
        {
          action: SearchSERPTelemetryUtils.ACTIONS.CLICKED,
          target: SearchSERPTelemetryUtils.COMPONENTS.SHOPPING_TAB,
        },
      ],
    },
    {
      impression: {
        is_shopping_page: "true",
      },
    },
  ]);

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_impression_undefined() {
  resetTelemetry();

  let config = createTestConfig({
    impressionAttributes: [
      {
        key: "is_shopping_page",
        url: {
          regexp: "&page=shopping",
        },
      },
      {
        key: "shopping_tab_displayed",
        element: {
          selector: "a",
          attributeName: "href",
          regexp: "page=shopping",
          component: {
            type: "shopping_tab",
            countImpressions: true,
          },
        },
      },
      {
        key: "has_ai_summary",
        element: {
          selector: ".ai-summary",
        },
      },
    ],
  });

  SearchSERPTelemetry.overrideSearchTelemetryForTests(config);
  await waitForIdle();

  let promise = waitForPageWithImpression();
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    URL + "&page=shopping"
  );
  BrowserTestUtils.removeTab(tab);
  await promise;

  assertSERPTelemetry([
    {
      impression: {
        is_shopping_page: "true",
        has_ai_summary: "unknown",
        shopping_tab_displayed: "unknown",
      },
      adImpressions: [],
      abandonment: {
        reason: SearchSERPTelemetryUtils.ABANDONMENTS.TAB_CLOSE,
      },
    },
  ]);
});

add_task(async function test_impression_hidden() {
  resetTelemetry();

  let config = createTestConfig({
    impressionAttributes: [
      {
        key: "has_ai_summary",
        element: {
          selector:
            ".ai-summary-display, .ai-summary-opacity, .ai-summary-visibility",
        },
      },
    ],
  });

  SearchSERPTelemetry.overrideSearchTelemetryForTests(config);
  await waitForIdle();

  let promise = waitForPageWithImpression();
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, URL);

  await waitForPageWithAdImpressions();

  // Since the element is hidden, the attribute should be recorded as false.
  assertSERPTelemetry([
    {
      impression: {
        has_ai_summary: "false",
      },
    },
  ]);

  BrowserTestUtils.removeTab(tab);
  await promise;
});
