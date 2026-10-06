/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests SERP telemetry for POST-based search providers. POST engines submit
 * the search query in the request body rather than the URL, so the SERP URL
 * is the same regardless of the query. The tracking partner code is also
 * passed in the POST body.
 */

"use strict";

const POST_SERP_URL =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.org"
  ) + "searchTelemetryAd_post_result.sjs";

const TEST_PROVIDER_INFO = [
  {
    telemetryId: "example-post",
    searchPageRegexp: new RegExp(
      "^https://example\\.org/browser/browser/components/search/test/browser/telemetry/searchTelemetryAd_post_result\\.sjs"
    ),
    queryParamNames: ["s"],
    codeParamName: "abc",
    taggedCodes: ["ff"],
    extraAdServersRegexps: [/^https:\/\/example\.com\/ad/],
    alwaysMatchSERP: {
      parent: true,
      child: true,
    },
    components: [
      {
        type: SearchSERPTelemetryUtils.COMPONENTS.AD_LINK,
        default: true,
      },
    ],
  },
];

// Simulates navigating to a POST-based SERP by programmatically submitting a
// form. We don't use a simple fetch() or loadURI() because SERP telemetry reads
// the query and partner code from the session history entry's POST data, which
// is only populated by a real browser-level form submission.
async function loadPostSERP(query, partnerCode) {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );
  let browser = tab.linkedBrowser;

  let loadPromise = BrowserTestUtils.browserLoaded(
    browser,
    false,
    POST_SERP_URL
  );
  await SpecialPowers.spawn(
    browser,
    [POST_SERP_URL, query, partnerCode],
    async (url, q, code) => {
      let form = content.document.createElement("form");
      form.method = "POST";
      form.action = url;

      let queryInput = content.document.createElement("input");
      queryInput.type = "hidden";
      queryInput.name = "s";
      queryInput.value = q;
      form.appendChild(queryInput);

      let codeInput = content.document.createElement("input");
      codeInput.type = "hidden";
      codeInput.name = "abc";
      codeInput.value = code;
      form.appendChild(codeInput);

      content.document.body.appendChild(form);
      form.submit();
    }
  );
  await loadPromise;

  return tab;
}

add_setup(async function () {
  SearchSERPTelemetry.overrideSearchTelemetryForTests(TEST_PROVIDER_INFO);
  await waitForIdle();

  let oldCanRecord = Services.telemetry.canRecordExtended;
  Services.telemetry.canRecordExtended = true;

  registerCleanupFunction(async () => {
    SearchSERPTelemetry.overrideSearchTelemetryForTests();
    Services.telemetry.canRecordExtended = oldCanRecord;
    resetTelemetry();
  });
});

// Test that a POST SERP with a tagged partner code records an impression.
add_task(async function test_post_serp_impression() {
  resetTelemetry();

  let tab = await loadPostSERP("test query", "ff");
  await waitForPageWithAdImpressions();

  assertSERPTelemetry([
    {
      impression: {
        provider: "example-post",
        tagged: "true",
        partner_code: "ff",
        source: "unknown",
      },
      adImpressions: [
        {
          component: SearchSERPTelemetryUtils.COMPONENTS.AD_LINK,
          ads_loaded: "2",
          ads_visible: "2",
          ads_hidden: "0",
        },
      ],
    },
  ]);

  BrowserTestUtils.removeTab(tab);
});

// Test that a POST SERP without the partner code is recorded as organic.
add_task(async function test_post_serp_impression_organic() {
  resetTelemetry();

  let tab = await loadPostSERP("test query", "");
  await waitForPageWithAdImpressions();

  assertSERPTelemetry([
    {
      impression: {
        provider: "example-post",
        tagged: "false",
        partner_code: "",
        source: "unknown",
      },
      adImpressions: [
        {
          component: SearchSERPTelemetryUtils.COMPONENTS.AD_LINK,
          ads_loaded: "2",
          ads_visible: "2",
          ads_hidden: "0",
        },
      ],
    },
  ]);

  BrowserTestUtils.removeTab(tab);
});

// Test that clicking an ad on a POST SERP records an engagement event.
add_task(async function test_post_serp_engagement_ad_click() {
  resetTelemetry();

  let tab = await loadPostSERP("test query", "ff");
  await waitForPageWithAdImpressions();

  let browserLoadedPromise = BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  await BrowserTestUtils.synthesizeMouseAtCenter("#ad1", {}, tab.linkedBrowser);
  await browserLoadedPromise;

  assertSERPTelemetry([
    {
      impression: {
        provider: "example-post",
        tagged: "true",
        partner_code: "ff",
      },
      adImpressions: [
        {
          component: SearchSERPTelemetryUtils.COMPONENTS.AD_LINK,
          ads_loaded: "2",
          ads_visible: "2",
          ads_hidden: "0",
        },
      ],
      engagements: [
        {
          action: SearchSERPTelemetryUtils.ACTIONS.CLICKED,
          target: SearchSERPTelemetryUtils.COMPONENTS.AD_LINK,
        },
      ],
    },
  ]);

  BrowserTestUtils.removeTab(tab);
});

// Test that closing a POST SERP tab before engagement records an abandonment.
add_task(async function test_post_serp_abandonment_tab_close() {
  resetTelemetry();

  let pageImpression = waitForPageWithImpression();
  let tab = await loadPostSERP("test query", "ff");
  BrowserTestUtils.removeTab(tab);
  await pageImpression;

  assertSERPTelemetry([
    {
      impression: {
        provider: "example-post",
        tagged: "true",
        partner_code: "ff",
        shopping_tab_displayed: "unknown",
        has_ai_summary: "unknown",
      },
      adImpressions: [],
      abandonment: {
        reason: SearchSERPTelemetryUtils.ABANDONMENTS.TAB_CLOSE,
      },
    },
  ]);
});

// Test that navigating away from a POST SERP records an abandonment.
add_task(async function test_post_serp_abandonment_navigation() {
  resetTelemetry();

  let tab = await loadPostSERP("test query", "ff");
  await waitForPageWithAdImpressions();

  let browserLoadedPromise = BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    false,
    "https://www.example.com/"
  );
  BrowserTestUtils.startLoadingURIString(
    tab.linkedBrowser,
    "https://www.example.com"
  );
  await browserLoadedPromise;

  assertSERPTelemetry([
    {
      impression: {
        provider: "example-post",
        tagged: "true",
        partner_code: "ff",
      },
      adImpressions: [
        {
          component: SearchSERPTelemetryUtils.COMPONENTS.AD_LINK,
          ads_loaded: "2",
          ads_visible: "2",
          ads_hidden: "0",
        },
      ],
      abandonment: {
        reason: SearchSERPTelemetryUtils.ABANDONMENTS.NAVIGATION,
      },
    },
  ]);

  BrowserTestUtils.removeTab(tab);
});

// Test that opening multiple POST SERP tabs records each engagement against
// its corresponding impression, not against an unrelated impression.
add_task(async function test_post_serp_multiple_tabs_engagement_mapping() {
  resetTelemetry();

  const TABS_TO_OPEN = 3;
  let tabs = [];

  for (let i = 0; i < TABS_TO_OPEN; i++) {
    let tab = await loadPostSERP(`query ${i}`, "ff");
    await waitForPageWithAdImpressions();
    tabs.push(tab);
  }

  await Services.fog.testFlushAllChildren();
  let recordedImpressions = Glean.serp.impression.testGetValue() ?? [];

  Assert.equal(
    recordedImpressions.length,
    TABS_TO_OPEN,
    "Should have one impression per tab."
  );

  let impressionIds = recordedImpressions.map(
    impression => impression.extra.impression_id
  );

  // Verify all impression IDs are unique.
  let impressionIdSet = new Set(impressionIds);
  Assert.equal(
    impressionIdSet.size,
    TABS_TO_OPEN,
    "Each tab should have a unique impression_id."
  );

  resetTelemetry();

  // Click an ad on each tab and verify the engagement is mapped to the correct
  // impression.
  for (let i = 0; i < TABS_TO_OPEN; i++) {
    let tab = tabs[i];
    let impressionId = impressionIds[i];

    await BrowserTestUtils.switchTab(gBrowser, tab);
    let browserLoadedPromise = BrowserTestUtils.browserLoaded(
      tab.linkedBrowser
    );
    await BrowserTestUtils.synthesizeMouseAtCenter(
      "#ad1",
      {},
      tab.linkedBrowser
    );
    await browserLoadedPromise;

    await Services.fog.testFlushAllChildren();
    let engagements = Glean.serp.engagement.testGetValue() ?? [];
    Assert.equal(
      engagements.length,
      i + 1,
      `Should have ${i + 1} engagement(s) recorded.`
    );

    Assert.deepEqual(
      engagements[i].extra,
      {
        action: SearchSERPTelemetryUtils.ACTIONS.CLICKED,
        target: SearchSERPTelemetryUtils.COMPONENTS.AD_LINK,
        impression_id: impressionId,
      },
      `Engagement for tab ${i} should reference the correct impression_id.`
    );
  }

  for (let tab of tabs) {
    BrowserTestUtils.removeTab(tab);
  }
});
