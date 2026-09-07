/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Check the existence of a shopping tab and navigation to a shopping page.
 * Most existing tests don't include shopping tabs, so this explicitly loads a
 * page with a shopping tab and clicks on it.
 */

"use strict";

// The setup for each test is the same, the only differences are the various
// permutations of the search tests.
const BASE_TEST_PROVIDER = {
  telemetryId: "example",
  searchPageRegexp:
    /^https:\/\/example.org\/browser\/browser\/components\/search\/test\/browser\/telemetry\/searchTelemetryAd/,
  queryParamNames: ["s"],
  codeParamName: "abc",
  taggedCodes: ["ff"],
  extraAdServersRegexps: [/^https:\/\/example\.org\/ad/],
  components: [
    {
      type: SearchSERPTelemetryUtils.COMPONENTS.AD_LINK,
      default: true,
    },
  ],
  impressionAttributes: [
    {
      key: "is_shopping_page",
      url: {
        regexp: "&page=shopping",
      },
    },
  ],
};

const TEST_PROVIDER_INFO_1 = [
  {
    ...BASE_TEST_PROVIDER,
    impressionAttributes: [
      {
        key: "is_shopping_page",
        url: {
          regexp: "&page=shopping&",
        },
      },
      {
        key: "shopping_tab_displayed",
        element: {
          selector: "nav a#shopping",
          attributeName: "href",
          regexp: "&page=shopping&",
          component: {
            type: "shopping_tab",
            countImpressions: true,
          },
        },
      },
    ],
  },
];

const TEST_PROVIDER_INFO_2 = [
  {
    ...BASE_TEST_PROVIDER,
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
          selector: "nav a#shopping",
          component: {
            type: "shopping_tab",
            countImpressions: true,
          },
        },
      },
    ],
  },
];

add_setup(async function () {
  SearchSERPTelemetry.overrideSearchTelemetryForTests(TEST_PROVIDER_INFO_1);
  await waitForIdle();
  // Enable local telemetry recording for the duration of the tests.
  let oldCanRecord = Services.telemetry.canRecordExtended;
  Services.telemetry.canRecordExtended = true;

  registerCleanupFunction(async () => {
    SearchSERPTelemetry.overrideSearchTelemetryForTests();
    Services.telemetry.canRecordExtended = oldCanRecord;
    resetTelemetry();
  });
});

async function loadSerpAndClickShoppingTab(page) {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    getSERPUrl(page)
  );
  await waitForPageWithAdImpressions();

  assertSERPTelemetry([
    {
      impression: {
        is_shopping_page: "false",
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

  let pageLoadPromise = BrowserTestUtils.waitForLocationChange(gBrowser);
  BrowserTestUtils.synthesizeMouseAtCenter("#shopping", {}, tab.linkedBrowser);
  await pageLoadPromise;

  assertSERPTelemetry([
    {
      impression: {
        is_shopping_page: "false",
        shopping_tab_displayed: "true",
      },
      engagements: [
        {
          action: SearchSERPTelemetryUtils.ACTIONS.CLICKED,
          target: SearchSERPTelemetryUtils.COMPONENTS.SHOPPING_TAB,
        },
      ],
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
}

add_task(async function test_inspect_shopping_tab_regexp_on_serp() {
  resetTelemetry();
  await loadSerpAndClickShoppingTab("searchTelemetryAd_shopping.html");
});

add_task(async function test_no_inspect_shopping_tab_regexp_on_serp() {
  resetTelemetry();
  SearchSERPTelemetry.overrideSearchTelemetryForTests(TEST_PROVIDER_INFO_2);
  await waitForIdle();
  await loadSerpAndClickShoppingTab("searchTelemetryAd_shopping.html");
});
