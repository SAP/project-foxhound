/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

const { UserCharacteristicsPageService, MAX_CANVAS_RAW_DATA_BUDGET_BYTES } =
  ChromeUtils.importESModule(
    "resource://gre/modules/UserCharacteristicsPageService.sys.mjs"
  );

const { CANVAS_HASH_PROBABILITIES, getHashProbability } =
  ChromeUtils.importESModule("resource://gre/modules/CanvasHashData.sys.mjs");

// Get a known hash from the probabilities map for testing
const KNOWN_HASH = CANVAS_HASH_PROBABILITIES.keys().next().value;

// Helper function to create less-compressible data
// Uses a pattern that won't compress as well as pure "AAA..." repetition
function createLargeData(size) {
  let data = "";
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < size; i++) {
    // Use a pseudo-random but deterministic pattern
    data += chars.charAt((i * 7 + (i % 13)) % chars.length);
  }
  return data;
}

// Helper function to create test data with known hashes for all canvas types
function createAllKnownHashesData() {
  const data = new Map();
  const canvasTypes = [
    "canvasdata1",
    "canvasdata1Software",
    "canvasdata2",
    "canvasdata2Software",
    "canvasdata3",
    "canvasdata3Software",
    "canvasdata4",
    "canvasdata4Software",
    "canvasdata5",
    "canvasdata5Software",
    "canvasdata6",
    "canvasdata6Software",
    "canvasdata7",
    "canvasdata7Software",
    "canvasdata8",
    "canvasdata8Software",
    "canvasdata9",
    "canvasdata9Software",
    "canvasdata10",
    "canvasdata10Software",
    "canvasdata11Webgl",
    "canvasdata11WebglSoftware",
    "canvasdata12Fingerprintjs1",
    "canvasdata12Fingerprintjs1Software",
    "canvasdata13Fingerprintjs2",
    "canvasdata13Fingerprintjs2Software",
  ];

  for (const canvasType of canvasTypes) {
    data.set(canvasType, KNOWN_HASH);
    data.set(canvasType + "Raw", "A".repeat(100)); // Small raw data
  }

  return data;
}

// Test 1: Known hashes should be filtered probabilistically
add_task(async function test_all_known_hashes_removed() {
  info("Test 1: Submit all known hashes and verify probabilistic filtering");

  // Get the actual probability for the known hash (includes channel multiplier)
  const probability = getHashProbability(KNOWN_HASH);
  info(`Known hash ${KNOWN_HASH} has probability ${probability}`);

  // With the default channel (multiplier 1) the base probability for the first
  // hash is ~0.0075, giving expectedKept ~0.196 per iteration. 200 iterations
  // keep the failure probability below 0.1%.
  const iterations = 200;
  const totalEntries = 26; // Number of canvas types
  let totalKept = 0;

  for (let i = 0; i < iterations; i++) {
    const service = new UserCharacteristicsPageService();
    const testData = createAllKnownHashesData();
    const filtered = await service.filterAllCanvasRawData(testData);

    let rawCount = 0;
    for (const key of filtered.keys()) {
      if (key.endsWith("Raw")) {
        rawCount++;
      }
    }
    totalKept += rawCount;
  }

  const avgKept = totalKept / iterations;
  const expectedKept = totalEntries * probability;

  info(
    `After ${iterations} iterations: avg ${avgKept.toFixed(1)} raw entries kept (expected ~${expectedKept.toFixed(1)})`
  );

  // Allow 50% variance from expected value to account for randomness
  const minExpected = Math.max(0, expectedKept * 0.5);
  const maxExpected = Math.min(totalEntries, expectedKept * 1.5 + 3);

  Assert.greaterOrEqual(
    avgKept,
    minExpected,
    `Average kept (${avgKept.toFixed(1)}) should be >= ${minExpected.toFixed(1)}`
  );
  Assert.lessOrEqual(
    avgKept,
    maxExpected,
    `Average kept (${avgKept.toFixed(1)}) should be <= ${maxExpected.toFixed(1)}`
  );
});

// Test 2: One unknown hash under budget should be present
add_task(async function test_one_unknown_hash_under_budget() {
  info(
    "Test 2: Submit all known hashes except one unknown hash with raw data under budget, ensure it is present"
  );

  const service = new UserCharacteristicsPageService();
  const testData = createAllKnownHashesData();

  // Replace one hash with unknown hash
  const unknownHash = "9999999999999999999999999999999999999999";
  testData.set("canvasdata5", unknownHash);
  testData.set("canvasdata5Raw", "A".repeat(1000)); // Small, under budget

  // Run multiple times due to 1/10 sampling rate for unknown hashes
  // With 100 iterations at 10% rate, probability of 0 successes is 0.9^100 ≈ 0.003%
  let foundCount = 0;
  const iterations = 100;

  for (let i = 0; i < iterations; i++) {
    const filtered = await service.filterAllCanvasRawData(new Map(testData));

    if (filtered.has("canvasdata5Raw")) {
      foundCount++;
    }
  }

  info(
    `Unknown hash raw data found ${foundCount}/${iterations} times (expected ~${iterations / 10})`
  );

  // With 1/10 sampling, we expect roughly 10% to be kept
  // Allow for statistical variance
  Assert.greater(foundCount, 0, "Unknown hash should be sampled sometimes");
  Assert.lessOrEqual(
    foundCount,
    iterations / 2,
    "Unknown hash sampling rate should be reasonable"
  );
});

// Test 3: One unknown hash over budget should not be present
add_task(async function test_one_unknown_hash_over_budget() {
  info(
    "Test 3: Submit all known hashes except one unknown hash with raw data over budget, ensure it is not present"
  );

  // Disable compression so budget is calculated on uncompressed size
  // (otherwise "AAA..." compresses to almost nothing)
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "toolkit.telemetry.user_characteristics_ping.test_skip_compression",
        true,
      ],
    ],
  });

  const service = new UserCharacteristicsPageService();
  const testData = createAllKnownHashesData();

  // Replace one hash with unknown hash and make it exceed the budget
  const unknownHash = "8888888888888888888888888888888888888888";
  testData.set("canvasdata5", unknownHash);
  testData.set(
    "canvasdata5Raw",
    "A".repeat(MAX_CANVAS_RAW_DATA_BUDGET_BYTES * 2)
  ); // Way over budget

  const filtered = await service.filterAllCanvasRawData(testData);

  // Even if sampled, it should be removed due to budget
  Assert.ok(
    !filtered.has("canvasdata5Raw"),
    "Over-budget raw data should be removed"
  );
});

// Test 4: Budget exceeded - 01 software preferred over hardware
add_task(async function test_01_software_preferred() {
  info(
    "Test 4: When 01 hardware and software combined exceed budget, confirm 01 software is included instead of hardware"
  );

  // Disable probability filtering and compression for budget tests
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "toolkit.telemetry.user_characteristics_ping.ignore_canvas_probability",
        true,
      ],
      [
        "toolkit.telemetry.user_characteristics_ping.test_skip_compression",
        true,
      ],
    ],
  });

  const service = new UserCharacteristicsPageService();
  const testData = new Map();

  // Calculate size per entry: budget divided by 2 entries, plus 2 bytes to exceed budget
  const numRawEntries = 2;
  const sizePerEntry =
    Math.floor(MAX_CANVAS_RAW_DATA_BUDGET_BYTES / numRawEntries) + 2;

  const unknownHash1 = "1111111111111111111111111111111111111111";
  const unknownHash2 = "2222222222222222222222222222222222222222";

  testData.set("canvasdata1", unknownHash1);
  testData.set("canvasdata1Raw", "A".repeat(sizePerEntry));
  testData.set("canvasdata1Software", unknownHash2);
  testData.set("canvasdata1SoftwareRaw", "A".repeat(sizePerEntry));

  const filtered = await service.filterAllCanvasRawData(testData);

  // Software should be included, hardware should not
  Assert.ok(
    filtered.has("canvasdata1SoftwareRaw"),
    "01 software should be included (higher priority)"
  );
  Assert.ok(
    !filtered.has("canvasdata1Raw"),
    "01 hardware should be removed due to budget"
  );
});

// Test 5: Budget exceeded - 01 HW and SW included, 02 SW omitted
add_task(async function test_01_included_02_sw_omitted() {
  info(
    "Test 5: When 01 HW, 01 SW, and 02 SW exceed budget, confirm 01 HW and 01 SW are included, 02 SW is omitted"
  );

  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "toolkit.telemetry.user_characteristics_ping.ignore_canvas_probability",
        true,
      ],
      [
        "toolkit.telemetry.user_characteristics_ping.test_skip_compression",
        true,
      ],
    ],
  });

  const service = new UserCharacteristicsPageService();
  const testData = new Map();

  const numRawEntries = 3;
  const sizePerEntry =
    Math.floor(MAX_CANVAS_RAW_DATA_BUDGET_BYTES / numRawEntries) + 2;

  const unknownHash1 = "1111111111111111111111111111111111111111";
  const unknownHash2 = "2222222222222222222222222222222222222222";
  const unknownHash3 = "3333333333333333333333333333333333333333";

  testData.set("canvasdata1", unknownHash1);
  testData.set("canvasdata1Raw", "A".repeat(sizePerEntry));
  testData.set("canvasdata1Software", unknownHash2);
  testData.set("canvasdata1SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set("canvasdata2Software", unknownHash3);
  testData.set("canvasdata2SoftwareRaw", "A".repeat(sizePerEntry));

  const filtered = await service.filterAllCanvasRawData(testData);

  Assert.ok(
    filtered.has("canvasdata1SoftwareRaw"),
    "01 software should be included"
  );
  Assert.ok(filtered.has("canvasdata1Raw"), "01 hardware should be included");
  Assert.ok(
    !filtered.has("canvasdata2SoftwareRaw"),
    "02 software should be omitted due to budget"
  );
});

// Test 6: Budget exceeded - 02 HW omitted
add_task(async function test_01_and_02_sw_included_02_hw_omitted() {
  info(
    "Test 6: When 01 HW, 01 SW, 02 HW, and 02 SW exceed budget, confirm 02 HW is omitted"
  );

  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "toolkit.telemetry.user_characteristics_ping.ignore_canvas_probability",
        true,
      ],
      [
        "toolkit.telemetry.user_characteristics_ping.test_skip_compression",
        true,
      ],
    ],
  });

  const service = new UserCharacteristicsPageService();
  const testData = new Map();

  const numRawEntries = 4;
  const sizePerEntry =
    Math.floor(MAX_CANVAS_RAW_DATA_BUDGET_BYTES / numRawEntries) + 2;

  const unknownHash1 = "1111111111111111111111111111111111111111";
  const unknownHash2 = "2222222222222222222222222222222222222222";
  const unknownHash3 = "3333333333333333333333333333333333333333";
  const unknownHash4 = "4444444444444444444444444444444444444444";

  testData.set("canvasdata1", unknownHash1);
  testData.set("canvasdata1Raw", "A".repeat(sizePerEntry));
  testData.set("canvasdata1Software", unknownHash2);
  testData.set("canvasdata1SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set("canvasdata2Software", unknownHash3);
  testData.set("canvasdata2SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set("canvasdata2", unknownHash4);
  testData.set("canvasdata2Raw", "A".repeat(sizePerEntry));

  const filtered = await service.filterAllCanvasRawData(testData);

  Assert.ok(
    filtered.has("canvasdata1SoftwareRaw"),
    "01 software should be included"
  );
  Assert.ok(filtered.has("canvasdata1Raw"), "01 hardware should be included");
  Assert.ok(
    filtered.has("canvasdata2SoftwareRaw"),
    "02 software should be included"
  );
  Assert.ok(
    !filtered.has("canvasdata2Raw"),
    "02 hardware should be omitted due to budget"
  );
});

// Test 7a: Budget exceeded - 09 omitted
add_task(async function test_01_02_included_09_omitted() {
  info("Test 7a: When 01, 02, and 09 exceed budget, confirm 09 is omitted");

  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "toolkit.telemetry.user_characteristics_ping.ignore_canvas_probability",
        true,
      ],
      [
        "toolkit.telemetry.user_characteristics_ping.test_skip_compression",
        true,
      ],
    ],
  });

  const service = new UserCharacteristicsPageService();
  const testData = new Map();

  const numRawEntries = 5;
  const sizePerEntry =
    Math.floor(MAX_CANVAS_RAW_DATA_BUDGET_BYTES / numRawEntries) + 2;

  testData.set("canvasdata1", "1111111111111111111111111111111111111111");
  testData.set("canvasdata1Raw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata1Software",
    "2222222222222222222222222222222222222222"
  );
  testData.set("canvasdata1SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set("canvasdata2", "3333333333333333333333333333333333333333");
  testData.set("canvasdata2Raw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata2Software",
    "4444444444444444444444444444444444444444"
  );
  testData.set("canvasdata2SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata9Software",
    "5555555555555555555555555555555555555555"
  );
  testData.set("canvasdata9SoftwareRaw", "A".repeat(sizePerEntry));

  const filtered = await service.filterAllCanvasRawData(testData);

  Assert.ok(
    filtered.has("canvasdata1SoftwareRaw"),
    "01 software should be included"
  );
  Assert.ok(filtered.has("canvasdata1Raw"), "01 hardware should be included");
  Assert.ok(
    filtered.has("canvasdata2SoftwareRaw"),
    "02 software should be included"
  );
  Assert.ok(filtered.has("canvasdata2Raw"), "02 hardware should be included");
  Assert.ok(
    !filtered.has("canvasdata9SoftwareRaw"),
    "09 software should be omitted due to budget"
  );
});

// Test 7b: Budget exceeded - 10 omitted
add_task(async function test_01_02_included_10_omitted() {
  info("Test 7b: When 01, 02, and 10 exceed budget, confirm 10 is omitted");

  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "toolkit.telemetry.user_characteristics_ping.ignore_canvas_probability",
        true,
      ],
      [
        "toolkit.telemetry.user_characteristics_ping.test_skip_compression",
        true,
      ],
    ],
  });

  const service = new UserCharacteristicsPageService();
  const testData = new Map();

  const numRawEntries = 5;
  const sizePerEntry =
    Math.floor(MAX_CANVAS_RAW_DATA_BUDGET_BYTES / numRawEntries) + 2;

  testData.set("canvasdata1", "1111111111111111111111111111111111111111");
  testData.set("canvasdata1Raw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata1Software",
    "2222222222222222222222222222222222222222"
  );
  testData.set("canvasdata1SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set("canvasdata2", "3333333333333333333333333333333333333333");
  testData.set("canvasdata2Raw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata2Software",
    "4444444444444444444444444444444444444444"
  );
  testData.set("canvasdata2SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata10Software",
    "5555555555555555555555555555555555555555"
  );
  testData.set("canvasdata10SoftwareRaw", "A".repeat(sizePerEntry));

  const filtered = await service.filterAllCanvasRawData(testData);

  Assert.ok(
    filtered.has("canvasdata1SoftwareRaw"),
    "01 software should be included"
  );
  Assert.ok(filtered.has("canvasdata1Raw"), "01 hardware should be included");
  Assert.ok(
    filtered.has("canvasdata2SoftwareRaw"),
    "02 software should be included"
  );
  Assert.ok(filtered.has("canvasdata2Raw"), "02 hardware should be included");
  Assert.ok(
    !filtered.has("canvasdata10SoftwareRaw"),
    "10 software should be omitted due to budget"
  );
});

// Test 7c: Budget exceeded - 13 omitted (random priority)
add_task(async function test_01_02_09_10_included_13_omitted() {
  info(
    "Test 7c: When 01, 02, 09, 10, and 13 exceed budget, confirm 13 is omitted (random priority)"
  );

  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "toolkit.telemetry.user_characteristics_ping.ignore_canvas_probability",
        true,
      ],
      [
        "toolkit.telemetry.user_characteristics_ping.test_skip_compression",
        true,
      ],
    ],
  });

  const service = new UserCharacteristicsPageService();
  const testData = new Map();

  const numRawEntries = 9;
  const sizePerEntry =
    Math.floor(MAX_CANVAS_RAW_DATA_BUDGET_BYTES / numRawEntries) + 2;

  testData.set("canvasdata1", "1111111111111111111111111111111111111111");
  testData.set("canvasdata1Raw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata1Software",
    "2222222222222222222222222222222222222222"
  );
  testData.set("canvasdata1SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set("canvasdata2", "3333333333333333333333333333333333333333");
  testData.set("canvasdata2Raw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata2Software",
    "4444444444444444444444444444444444444444"
  );
  testData.set("canvasdata2SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set("canvasdata9", "5555555555555555555555555555555555555555");
  testData.set("canvasdata9Raw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata9Software",
    "6666666666666666666666666666666666666666"
  );
  testData.set("canvasdata9SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set("canvasdata10", "7777777777777777777777777777777777777777");
  testData.set("canvasdata10Raw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata10Software",
    "8888888888888888888888888888888888888888"
  );
  testData.set("canvasdata10SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata13Fingerprintjs2",
    "9999999999999999999999999999999999999999"
  );
  testData.set("canvasdata13Fingerprintjs2Raw", "A".repeat(sizePerEntry));

  const filtered = await service.filterAllCanvasRawData(testData);

  // 01, 02, 09, 10 should all be included (they have fixed priority)
  Assert.ok(
    filtered.has("canvasdata1SoftwareRaw"),
    "01 software should be included"
  );
  Assert.ok(filtered.has("canvasdata1Raw"), "01 hardware should be included");
  Assert.ok(
    filtered.has("canvasdata2SoftwareRaw"),
    "02 software should be included"
  );
  Assert.ok(filtered.has("canvasdata2Raw"), "02 hardware should be included");
  Assert.ok(
    filtered.has("canvasdata9SoftwareRaw"),
    "09 software should be included"
  );
  Assert.ok(filtered.has("canvasdata9Raw"), "09 hardware should be included");
  Assert.ok(
    filtered.has("canvasdata10SoftwareRaw"),
    "10 software should be included"
  );
  Assert.ok(filtered.has("canvasdata10Raw"), "10 hardware should be included");

  // 13 has random priority and should be omitted due to budget
  Assert.ok(
    !filtered.has("canvasdata13Fingerprintjs2Raw"),
    "13 should be omitted due to budget (random priority)"
  );
});

// Test 8: Budget exceeded - random canvas (14) omitted
add_task(async function test_01_02_09_10_13_included_14_omitted() {
  info(
    "Test 8: When 01, 02, 09, 10, 13, and 14 exceed budget, verify random priority selection"
  );

  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "toolkit.telemetry.user_characteristics_ping.ignore_canvas_probability",
        true,
      ],
      [
        "toolkit.telemetry.user_characteristics_ping.test_skip_compression",
        true,
      ],
    ],
  });

  const service = new UserCharacteristicsPageService();
  const testData = new Map();

  const numRawEntries = 10;
  const sizePerEntry =
    Math.floor(MAX_CANVAS_RAW_DATA_BUDGET_BYTES / numRawEntries) + 2;

  testData.set("canvasdata1", "1111111111111111111111111111111111111111");
  testData.set("canvasdata1Raw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata1Software",
    "2222222222222222222222222222222222222222"
  );
  testData.set("canvasdata1SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set("canvasdata2", "3333333333333333333333333333333333333333");
  testData.set("canvasdata2Raw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata2Software",
    "4444444444444444444444444444444444444444"
  );
  testData.set("canvasdata2SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set("canvasdata9", "5555555555555555555555555555555555555555");
  testData.set("canvasdata9Raw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata9Software",
    "6666666666666666666666666666666666666666"
  );
  testData.set("canvasdata9SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set("canvasdata10", "7777777777777777777777777777777777777777");
  testData.set("canvasdata10Raw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata10Software",
    "8888888888888888888888888888888888888888"
  );
  testData.set("canvasdata10SoftwareRaw", "A".repeat(sizePerEntry));
  testData.set(
    "canvasdata13Fingerprintjs2",
    "9999999999999999999999999999999999999999"
  );
  testData.set("canvasdata13Fingerprintjs2Raw", "A".repeat(sizePerEntry));
  testData.set("canvasdata3", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  testData.set("canvasdata3Raw", "A".repeat(sizePerEntry));

  const filtered = await service.filterAllCanvasRawData(testData);

  // Fixed priority canvases (01, 02, 09, 10) should all be included
  Assert.ok(
    filtered.has("canvasdata1SoftwareRaw"),
    "01 software should be included"
  );
  Assert.ok(filtered.has("canvasdata1Raw"), "01 hardware should be included");
  Assert.ok(
    filtered.has("canvasdata2SoftwareRaw"),
    "02 software should be included"
  );
  Assert.ok(filtered.has("canvasdata2Raw"), "02 hardware should be included");
  Assert.ok(
    filtered.has("canvasdata9SoftwareRaw"),
    "09 software should be included"
  );
  Assert.ok(filtered.has("canvasdata9Raw"), "09 hardware should be included");
  Assert.ok(
    filtered.has("canvasdata10SoftwareRaw"),
    "10 software should be included"
  );
  Assert.ok(filtered.has("canvasdata10Raw"), "10 hardware should be included");

  // Random priority canvases (13, 03) - at least one should be omitted due to budget
  const has13 = filtered.has("canvasdata13Fingerprintjs2Raw");
  const has03 = filtered.has("canvasdata3Raw");

  info(`canvasdata13Fingerprintjs2Raw: ${has13 ? "included" : "omitted"}`);
  info(`canvasdata3Raw: ${has03 ? "included" : "omitted"}`);

  // With budget constraints, at least one random-priority canvas should be omitted
  Assert.ok(
    !has13 || !has03,
    "At least one random-priority canvas should be omitted due to budget"
  );
});
