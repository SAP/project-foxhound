/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var HandshakeTelemetryHelpers = {
  FLAVORS: ["", "_FIRST_TRY", "_CONSERVATIVE", "_ECH", "_ECH_GREASE"],

  _baseline: null,
  _fogInitialized: false,

  /**
   * Returns the Glean ssl_handshake.result_* metric for a given flavor.
   */
  resultMetric(flavor) {
    switch (flavor) {
      case "":
        return Glean.sslHandshake.result;
      case "_FIRST_TRY":
        return Glean.sslHandshake.resultFirstTry;
      case "_CONSERVATIVE":
        return Glean.sslHandshake.resultConservative;
      case "_ECH":
        return Glean.sslHandshake.resultEch;
      case "_ECH_GREASE":
        return Glean.sslHandshake.resultEchGrease;
      default:
        Assert.ok(false, `Unknown result flavor: ${flavor}`);
        return null;
    }
  },

  /**
   * Returns the Glean ssl.time_until_ready_* metric for a given flavor.
   */
  timingMetric(flavor) {
    switch (flavor) {
      case "":
        return Glean.ssl.timeUntilReady;
      case "_FIRST_TRY":
        return Glean.ssl.timeUntilReadyFirstTry;
      case "_CONSERVATIVE":
        return Glean.ssl.timeUntilReadyConservative;
      case "_ECH":
        return Glean.ssl.timeUntilReadyEch;
      case "_ECH_GREASE":
        return Glean.ssl.timeUntilReadyEchGrease;
      default:
        Assert.ok(false, `Unknown timing flavor: ${flavor}`);
        return null;
    }
  },

  /**
   * Computes the per-bucket difference between two distribution snapshots.
   * Returns a values object containing only non-zero deltas.
   */
  _deltaValues(current, baseline) {
    let result = {};
    let currentValues = current?.values ?? {};
    let baselineValues = baseline?.values ?? {};
    let allKeys = new Set([
      ...Object.keys(currentValues),
      ...Object.keys(baselineValues),
    ]);
    for (let k of allKeys) {
      let delta = (currentValues[k] ?? 0) - (baselineValues[k] ?? 0);
      if (delta !== 0) {
        result[k] = delta;
      }
    }
    return result;
  },

  /**
   * Returns a delta snapshot for a result metric since the last
   * resetHistograms() call. The returned object has a .values property
   * compatible with assertHistogramMap.
   */
  resultDelta(flavor) {
    let current = this.resultMetric(flavor).testGetValue();
    let baseline = this._baseline?.[`result${flavor}`];
    return { values: this._deltaValues(current, baseline) };
  },

  /**
   * Returns the delta sample count for a timing metric since the last
   * resetHistograms() call.
   */
  timingDeltaCount(flavor) {
    let current = this.timingMetric(flavor).testGetValue();
    let baseline = this._baseline?.[`timing${flavor}`];
    return (current?.count ?? 0) - (baseline?.count ?? 0);
  },

  /**
   * Assert that the distribution values match expected entries exactly.
   * All non-expected bucket entries must be zero.
   *
   * @param {object} snapshot A distribution snapshot with a .values property.
   * @param {Map} expectedEntries Map of bucket index (string) to expected count.
   */
  assertHistogramMap(snapshot, expectedEntries) {
    Assert.ok(
      !mozinfo.socketprocess_networking,
      "Metrics don't populate on network process"
    );
    let values = JSON.parse(JSON.stringify(snapshot));
    for (let [Tk, Tv] of expectedEntries.entries()) {
      let found = false;
      for (let [i, val] of Object.entries(values.values)) {
        if (i == Tk) {
          found = true;
          Assert.equal(val, Tv, `expected counts should match at index ${i}`);
          values.values[i] = 0; // Reset the value
        }
      }
      Assert.ok(found, `Should have found an entry at index ${Tk}`);
    }
    for (let k in values.values) {
      Assert.equal(
        values.values[k],
        0,
        `Should NOT have found an entry at index ${k} of value ${values.values[k]}`
      );
    }
  },

  /**
   * Snapshots current metric values as a baseline. Subsequent check methods
   * compare against this baseline, measuring only what changed.
   */
  resetHistograms() {
    if (!this._fogInitialized) {
      Services.fog.initializeFOG();
      this._fogInitialized = true;
    }
    info("Snapshotting TLS handshake metric baseline");
    this._baseline = {};
    for (let f of this.FLAVORS) {
      this._baseline[`result${f}`] = this.resultMetric(f).testGetValue();
      this._baseline[`timing${f}`] = this.timingMetric(f).testGetValue();
    }
  },

  /**
   * Checks that all TLS Handshake metrics of a particular flavor have
   * exactly resultCount new entries for the resultCode and no other new
   * entries since the last resetHistograms() call.
   *
   * @param {Array} flavors An array of strings corresponding to which types
   *                        of metrics should have entries. See
   *                        HandshakeTelemetryHelpers.FLAVORS.
   * @param {number} resultCode The expected result code, see sslerr.h. 0 is success, all others are errors.
   * @param {number} resultCount The number of handshake results expected.
   */
  checkEntry(flavors, resultCode, resultCount) {
    Assert.ok(
      !mozinfo.socketprocess_networking,
      "Metrics don't populate on network process"
    );
    for (let f of flavors) {
      let delta = this.resultDelta(f);
      info(
        `checkEntry: result${f} expecting ${resultCount}x code ${resultCode}, ` +
          `got delta: ${JSON.stringify(delta.values)}`
      );
      this.assertHistogramMap(
        delta,
        new Map([[String(resultCode), resultCount]])
      );
    }

    // Timing metrics should only contain values if we expected success.
    for (let f of flavors) {
      let deltaCount = this.timingDeltaCount(f);
      let expectedCount = resultCode === 0 ? resultCount : 0;
      info(
        `checkEntry: timing${f} expecting delta count=${expectedCount}, ` +
          `got delta count=${deltaCount}`
      );
      Assert.strictEqual(
        deltaCount,
        expectedCount,
        resultCode === 0
          ? "Timing entry count correct"
          : "No timing entries expected"
      );
    }
  },

  checkSuccess(flavors, resultCount = 1) {
    this.checkEntry(flavors, 0, resultCount);
  },

  checkEmpty(flavors) {
    for (let f of flavors) {
      let resultDelta = this.resultDelta(f);
      let resultDeltaCount = Object.values(resultDelta.values).reduce(
        (a, b) => a + b,
        0
      );
      info(
        `checkEmpty: result${f} expecting no new entries, ` +
          `got delta count=${resultDeltaCount}`
      );
      Assert.strictEqual(
        resultDeltaCount,
        0,
        `No new result entries expected for '${f}'. Delta: ${JSON.stringify(
          resultDelta.values
        )}`
      );
      let timingDeltaCount = this.timingDeltaCount(f);
      info(
        `checkEmpty: timing${f} expecting no new entries, ` +
          `got delta count=${timingDeltaCount}`
      );
      Assert.strictEqual(
        timingDeltaCount,
        0,
        `No new timing entries expected for '${f}'.`
      );
    }
  },
};
