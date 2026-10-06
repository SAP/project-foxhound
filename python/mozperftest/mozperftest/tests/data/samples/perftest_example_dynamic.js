// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
/* eslint-env node */
"use strict";

async function setUp(context) {
  context.log.info("setUp example!");
}

async function test(context, commands) {
  context.log.info("Test with setUp/tearDown example!");
  await commands.measure.start("https://www.sitespeed.io/");
  await commands.measure.start("https://www.mozilla.org/en-US/");
}

async function tearDown(context) {
  context.log.info("tearDown example!");
}

const [dynamicOwner, dynamicName] = ["Performance Testing Team", "Example"];
const dynamicDescription = "The description of the example test.";
const dynamicSupportedBrowsers = ["Fenix nightly", "Geckoview_example", "Fennec", "Firefox"];
const dynamicOptions = {
  mac: {perfherder_metrics: [{name:"speed",unit:"bps_mac"}], verbose: true},
  win: {perfherder_metrics: [{name:"speed",unit:"bps_win"}], verbose: true}
}

dynamicOptions.linux = {
  perfherder_metrics: [{ name: "speed", unit: "bps_lin" }],
  verbose: true
};

const perfMetadata = {
  setUp,
  tearDown,
  test,
  owner: dynamicOwner,
  name: dynamicName,
  description: dynamicDescription,
  longDescription: `
  This is a longer description of the test perhaps including information
  about how it should be run locally or links to relevant information.
  `,
  supportedBrowsers: dynamicSupportedBrowsers,
  supportedPlatforms: ["Android", "Desktop"],
  options: {
    default: {perfherder: true, verbose: false},
    ...dynamicOptions
  }
};

Assert.ok(dynamicName.includes("Example"));
