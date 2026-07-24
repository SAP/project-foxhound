/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = XPCOMUtils.declareLazy({
  BrowserSearchTelemetry:
    "moz-src:///browser/components/search/BrowserSearchTelemetry.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
  TestUtils: "resource://testing-common/TestUtils.sys.mjs",
});

/**
 * A class containing useful testing functions for Search UI based tests.
 */
export const SearchUITestUtils = new (class {
  /**
   * The test scope that the test is running in.
   *
   * @type {object}
   */
  #testScope = null;

  /**
   * Sets the scope for the test.
   *
   * @param {object} testScope
   *   The global scope for the test.
   */
  init(testScope) {
    this.#testScope = testScope;
  }

  /**
   * Asserts that the Search Access Point (SAP) telemetry is reported correctly.
   * It assumes that the reported telemetry is from a single source and no other
   * reports for the probes are expected.
   *
   * You may need to clear telemetry before running the test.
   *
   * @param {object} expected
   * @param {?string} expected.engineId
   *   The identifier of the simulated application provided search engine. If it
   *   is not an application provided engine, do not specify this value.
   * @param {?string} expected.engineName
   *   The name of the search engine.
   * @param {?boolean} expected.overriddenByThirdParty
   *   Set to true if the simulated application provided search engine is being
   *   overridden by another engine.
   * @param {?string} expected.partnerCode
   *   The expected partner code. Only applicable to simulated application
   *   provided engines.
   * @param {?boolean} expected.expectLegacyTelemetry
   *   Whether the `SEARCH_COUNTS` legacy histogram is expected to be updated.
   *   Pass false if the SAP telemetry is expected to be recorded only by Glean.
   * @param {keyof typeof lazy.BrowserSearchTelemetry.KNOWN_SEARCH_SOURCES} expected.source
   *   The source of the search (e.g. urlbar, contextmenu etc.).
   * @param {number} expected.count
   *   The expected count for the source.
   */
  async assertSAPTelemetry({
    engineId = null,
    engineName = "",
    overriddenByThirdParty = false,
    partnerCode = null,
    expectLegacyTelemetry = true,
    source,
    count,
  }) {
    await lazy.TestUtils.waitForCondition(() => {
      return Glean.sap.counts.testGetValue().length == count;
    }, "The correct number of events should have been reported for sap.counts");

    let expectedEvents = [];
    for (let i = 0; i < count; i++) {
      let expected = {
        provider_id: engineId ?? "other",
        provider_name: engineName,
        source,
        overridden_by_third_party: overriddenByThirdParty.toString(),
      };

      if (partnerCode) {
        expected.partner_code = partnerCode;
      }

      expectedEvents.push(expected);
    }

    let sapEvent = Glean.sap.counts.testGetValue();
    this.#testScope.Assert.deepEqual(
      sapEvent.map(e => e.extra),
      expectedEvents,
      "Should have the expected event telemetry data for sap.counts"
    );

    let legacySource = lazy.BrowserSearchTelemetry.KNOWN_SEARCH_SOURCES[source];
    let histogram = Services.telemetry.getKeyedHistogramById("SEARCH_COUNTS");

    let histogramKey = overriddenByThirdParty
      ? `${engineId}-addon.${legacySource}`
      : `${engineId ? "" : "other-"}${engineName}.${legacySource}`;

    let expectedSum;
    let expectedSnapshotKeys = [];
    if (expectLegacyTelemetry) {
      expectedSum = count;
      expectedSnapshotKeys = [histogramKey];
    }

    lazy.TelemetryTestUtils.assertKeyedHistogramSum(
      histogram,
      histogramKey,
      expectedSum
    );
    // Also ensure no other keys were set.
    let snapshot = histogram.snapshot();
    this.#testScope.Assert.deepEqual(
      Object.keys(snapshot),
      expectedSnapshotKeys,
      "Should have only the expected keys in the SEARCH_COUNTS histogram"
    );
  }
})();
