/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const openSearchEngineFiles = [
  "secure-and-securely-updated1.xml",
  "secure-and-securely-updated2.xml",
  "secure-and-securely-updated3.xml",
  // An insecure search form should not affect telemetry.
  "secure-and-securely-updated-insecure-form.xml",
  "secure-and-insecurely-updated1.xml",
  "secure-and-insecurely-updated2.xml",
  "insecure-and-securely-updated1.xml",
  "insecure-and-insecurely-updated1.xml",
  "insecure-and-insecurely-updated2.xml",
  "secure-and-no-update-url1.xml",
  "insecure-and-no-update-url1.xml",
  "secure-localhost.xml",
  "secure-onionv2.xml",
  "secure-onionv3.xml",
];

async function verifyTelemetry(probeNameFragment, engineCount, type) {
  Services.fog.testResetFOG();
  await SearchService.runBackgroundChecks();

  Assert.equal(
    Glean.browserSearchinit[probeNameFragment].testGetValue(),
    engineCount,
    `Count of ${type} engines should be ${engineCount}`
  );
}

add_setup(async function () {
  useHttpServer();

  await SearchService.init();

  for (let file of openSearchEngineFiles) {
    await SearchTestUtils.installOpenSearchEngine({
      url: `${gHttpURL}/opensearch/${file}`,
    });
  }
});

add_task(async function () {
  verifyTelemetry("secureOpensearchEngineCount", 10, "secure");
  verifyTelemetry("insecureOpensearchEngineCount", 4, "insecure");
  verifyTelemetry("secureOpensearchUpdateCount", 5, "securely updated");
  verifyTelemetry("insecureOpensearchUpdateCount", 4, "insecurely updated");
});
