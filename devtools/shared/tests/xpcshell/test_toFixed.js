/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const {
  toFixed,
} = require("resource://devtools/shared/inspector/font-utils.js");

add_task(async () => {
  info("Check whether toFixed rounds properly");

  /** @type {[[number, number], number][]} */
  const tests = [
    [[1.009, 3], 1.009],
    [[0.9999, 3], 1],
    [[0.29, 2], 0.29],
    [[1.91, 1], 1.9],
  ];

  for (const [[input, decimals], expected] of tests) {
    equal(
      toFixed(input, decimals),
      expected,
      "toFixed doesn't return expected value"
    );
  }
});
