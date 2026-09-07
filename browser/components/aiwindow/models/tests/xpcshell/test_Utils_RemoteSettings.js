/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { openAIEngine, parseVersion, FEATURE_MAJOR_VERSIONS } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
  );

add_task(async function test_feature_major_versions_in_dump() {
  const client = openAIEngine.getRemoteClient();
  const records = await client.get();
  for (const [feature, majorVersion] of Object.entries(
    FEATURE_MAJOR_VERSIONS
  )) {
    const found = records.some(r => {
      const parsed = parseVersion(r.version);
      return r.feature === feature && parsed?.major === majorVersion;
    });
    Assert.ok(
      found,
      `WARNING - UPDATE THE DUMP: no records for feature "${feature}" at major version ${majorVersion} in ` +
        `services/settings/dumps/main/ai-window-prompts.json. ` +
        `Either update the dump or revert FEATURE_MAJOR_VERSIONS["${feature}"].`
    );
  }
});

add_task(async function test_parseVersion_with_v_prefix() {
  const result = parseVersion("v1.0");
  Assert.ok(result, "Should parse version with v prefix");
  Assert.equal(result.major, 1, "Major version should be 1");
  Assert.equal(result.minor, 0, "Minor version should be 0");
  Assert.equal(result.original, "v1.0", "Original should be preserved");
});

add_task(async function test_parseVersion_without_v_prefix() {
  const result = parseVersion("1.0");
  Assert.ok(result, "Should parse version without v prefix");
  Assert.equal(result.major, 1, "Major version should be 1");
  Assert.equal(result.minor, 0, "Minor version should be 0");
  Assert.equal(result.original, "1.0", "Original should be preserved");
});

add_task(async function test_parseVersion_with_higher_numbers() {
  const result = parseVersion("2.15");
  Assert.ok(result, "Should parse version with higher numbers");
  Assert.equal(result.major, 2, "Major version should be 2");
  Assert.equal(result.minor, 15, "Minor version should be 15");
  Assert.equal(result.original, "2.15", "Original should be preserved");
});

add_task(async function test_parseVersion_invalid_format() {
  Assert.equal(
    parseVersion("v1"),
    null,
    "Should return null for version without minor"
  );
  Assert.equal(parseVersion("1"), null, "Should return null for single number");
  Assert.equal(
    parseVersion("v1.0.0"),
    null,
    "Should return null for three part version"
  );
  Assert.equal(
    parseVersion("invalid"),
    null,
    "Should return null for non-numeric version"
  );
});

add_task(async function test_parseVersion_edge_cases() {
  Assert.equal(parseVersion(""), null, "Should return null for empty string");
  Assert.equal(parseVersion(null), null, "Should return null for null");
  Assert.equal(
    parseVersion(undefined),
    null,
    "Should return null for undefined"
  );
  Assert.equal(
    parseVersion("v1.0extra"),
    null,
    "Should return null for version with extra text after"
  );
});
