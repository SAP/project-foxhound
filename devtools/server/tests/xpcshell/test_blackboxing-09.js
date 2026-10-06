/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const {
  SourcesManager,
} = require("resource://devtools/server/actors/utils/sources-manager.js");

/**
 * Test isBlackBoxed respects columns
 */

function run_test() {
  return (async function () {
    const range = {
      start: {
        line: 2,
        column: 4,
      },
      end: {
        line: 10,
        column: 20,
      },
    };

    const manager = new SourcesManager(null);
    const url = "http://example.com/test.js";
    manager.blackBox(url, range);

    function inRange(line, column) {
      return manager.isBlackBoxed(url, line, column);
    }

    Assert.ok(!inRange(1, 5), "line before range start is not blackboxed");
    Assert.ok(
      !inRange(2, 3),
      "column before range start column is not blackboxed"
    );

    Assert.ok(inRange(2, 4), "range start position is blackboxed");
    Assert.ok(inRange(3, 0), "mid-range line is blackboxed");
    Assert.ok(inRange(10, 0), "mid-range column on end line is blackboxed");
    Assert.ok(inRange(10, 20), "range end position is blackboxed");

    Assert.ok(!inRange(10, 21), "column past range end is not blackboxed");
    Assert.ok(!inRange(11, 5), "line past range end is not blackboxed");
  })();
}
