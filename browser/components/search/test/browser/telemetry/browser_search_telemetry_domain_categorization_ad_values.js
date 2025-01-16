/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/*
 * These tests check the number of ads clicked from a SERP containing a
 * categorization impression. Existing tests already check for the counting ads
 * and tracking clicks, and the categorization impression piggybacks off
 * of it. Hence, this is just mostly a sanity check.
 */

ChromeUtils.defineESModuleGetters(this, {
  SearchUtils: "resource://gre/modules/SearchUtils.sys.mjs",
});

const TEST_PROVIDER_INFO = [
  {
    telemetryId: "example",
    searchPageRegexp:
      /^https:\/\/example.org\/browser\/browser\/components\/search\/test\/browser\/telemetry\/searchTelemetry/,
    queryParamNames: ["s"],
    codeParamName: "abc",
    taggedCodes: ["ff"],
    adServerAttributes: ["mozAttr"],
    nonAdsLinkRegexps: [],
    extraAdServersRegexps: [/^https:\/\/example\.com\/ad/],
    // The search telemetry entry responsible for targeting the specific results.
    domainExtraction: {
      ads: [
        {
          selectors: "[data-ad-domain]",
          method: "data-attribute",
          options: {
            dataAttributeKey: "adDomain",
          },
        },
        {
          selectors: ".ad",
          method: "href",
          options: {
            queryParamKey: "ad_domain",
          },
        },
      ],
      nonAds: [
        {
          selectors: "#results .organic a",
          method: "href",
        },
      ],
    },
    components: [
      {
        type: SearchSERPTelemetryUtils.COMPONENTS.AD_LINK,
        default: true,
      },
    ],
  },
];

add_setup(async function () {
  SearchSERPTelemetry.overrideSearchTelemetryForTests(TEST_PROVIDER_INFO);
  await waitForIdle();

  let promise = waitForDomainToCategoriesUpdate();
  await insertRecordIntoCollectionAndSync();
  await SpecialPowers.pushPrefEnv({
    set: [["browser.search.serpEventTelemetryCategorization.enabled", true]],
  });
  await promise;

  registerCleanupFunction(async () => {
    SearchSERPTelemetry.overrideSearchTelemetryForTests();
    resetTelemetry();
  });
});

add_task(async function test_load_serp_and_categorize() {
  resetTelemetry();

  let url = getSERPUrl("searchTelemetryDomainCategorizationReporting.html");
  info("Load a SERP with organic and sponsored results.");
  let promise = waitForPageWithCategorizedDomains();
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url);
  await promise;

  await BrowserTestUtils.removeTab(tab);
  assertCategorizationValues([
    {
      organic_category: "3",
      organic_num_domains: "1",
      organic_num_inconclusive: "0",
      organic_num_unknown: "0",
      sponsored_category: "4",
      sponsored_num_domains: "2",
      sponsored_num_inconclusive: "0",
      sponsored_num_unknown: "0",
      mappings_version: "1",
      app_version: APP_VERSION,
      channel: CHANNEL,
      locale: LOCALE,
      region: REGION,
      partner_code: "ff",
      provider: "example",
      tagged: "true",
      num_ads_clicked: "0",
      num_ads_visible: "2",
    },
  ]);
});

add_task(async function test_load_serp_and_categorize_and_click_organic() {
  resetTelemetry();

  let url = getSERPUrl("searchTelemetryDomainCategorizationReporting.html");
  info("Load a SERP with organic and sponsored results.");
  let promise = waitForPageWithCategorizedDomains();
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url);
  await promise;

  promise = BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  await BrowserTestUtils.synthesizeMouseAtCenter(
    ".organic a",
    {},
    tab.linkedBrowser
  );
  await promise;

  assertCategorizationValues([
    {
      organic_category: "3",
      organic_num_domains: "1",
      organic_num_inconclusive: "0",
      organic_num_unknown: "0",
      sponsored_category: "4",
      sponsored_num_domains: "2",
      sponsored_num_inconclusive: "0",
      sponsored_num_unknown: "0",
      mappings_version: "1",
      app_version: APP_VERSION,
      channel: CHANNEL,
      locale: LOCALE,
      region: REGION,
      partner_code: "ff",
      provider: "example",
      tagged: "true",
      num_ads_clicked: "0",
      num_ads_visible: "2",
    },
  ]);

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_load_serp_and_categorize_and_click_sponsored() {
  resetTelemetry();

  let url = getSERPUrl("searchTelemetryDomainCategorizationReporting.html");
  info("Load a sample SERP with organic and sponsored results.");
  let promise = waitForPageWithCategorizedDomains();
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url);
  await promise;

  promise = BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  await BrowserTestUtils.synthesizeMouseAtCenter("a.ad", {}, tab.linkedBrowser);
  await promise;

  assertCategorizationValues([
    {
      organic_category: "3",
      organic_num_domains: "1",
      organic_num_inconclusive: "0",
      organic_num_unknown: "0",
      sponsored_category: "4",
      sponsored_num_domains: "2",
      sponsored_num_inconclusive: "0",
      sponsored_num_unknown: "0",
      mappings_version: "1",
      app_version: APP_VERSION,
      channel: CHANNEL,
      locale: LOCALE,
      region: REGION,
      partner_code: "ff",
      provider: "example",
      tagged: "true",
      num_ads_clicked: "1",
      num_ads_visible: "2",
    },
  ]);

  await BrowserTestUtils.removeTab(tab);
});
