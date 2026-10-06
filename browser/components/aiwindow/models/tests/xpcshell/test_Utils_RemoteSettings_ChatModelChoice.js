/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { openAIEngine, resolveChatModelChoice, FEATURE_MAJOR_VERSIONS } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
  );

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

add_task(async function test_resolveChatModelChoice_found() {
  const sb = sinon.createSandbox();
  try {
    // Mock Remote Settings data with model_choice_id
    const fakeRecords = [
      {
        feature: "chat",
        version: `${FEATURE_MAJOR_VERSIONS.chat}.1`,
        model: "qwen3-235b-a22b-instruct-2507-maas",
        model_choice_id: "2",
        owner_name: "Alibaba",
        is_default: true,
      },
      {
        feature: "chat",
        version: `${FEATURE_MAJOR_VERSIONS.chat}.1`,
        model: "gemini-2.5-flash-lite",
        model_choice_id: "1",
        owner_name: "Google",
      },
      // Non-chat feature should be filtered out
      {
        feature: "title-generation",
        version: "3.0",
        model: "some-model",
        model_choice_id: "1",
        owner_name: "",
      },
    ];

    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves(fakeRecords),
    });

    const result = await resolveChatModelChoice("1");

    Assert.ok(result, "Should resolve choice 1");
    Assert.equal(
      result.model,
      "gemini-2.5-flash-lite",
      "Should return correct server model ID"
    );

    Assert.equal(result.ownerName, "Google", "Should return owner name");
  } finally {
    sb.restore();
  }
});

add_task(async function test_resolveChatModelChoice_custom_model() {
  // Custom model (choice "0") doesn't need RS lookup
  const result = await resolveChatModelChoice("0");

  Assert.ok(result, "Should resolve custom model");
  Assert.equal(result.model, "custom-model", "Should return custom model ID");
  Assert.equal(result.ownerName, "", "Should return empty owner");
});

add_task(async function test_resolveChatModelChoice_version_filtering() {
  const sb = sinon.createSandbox();
  try {
    // Test that higher version records are filtered out
    const fakeRecords = [
      {
        feature: "chat",
        version: "3.0", // Should be filtered out with maxMajorVersion=2
        model: "future-model",
        model_choice_id: "1",
      },
      {
        feature: "chat",
        version: "2.5",
        model: "current-model",
        model_choice_id: "1",
      },
    ];

    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves(fakeRecords),
    });

    const result = await resolveChatModelChoice("1", 2);

    Assert.ok(result, "Should resolve choice 1");
    Assert.equal(
      result.model,
      "current-model",
      "Should use version 2.5 model, not 3.0"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_resolveChatModelChoice_not_found() {
  const sb = sinon.createSandbox();
  try {
    // No matching records
    const fakeRecords = [
      {
        feature: "chat",
        version: "${FEATURE_MAJOR_VERSIONS.chat}.0",
        model: "some-model",
        model_choice_id: "2", // Different choice ID
      },
    ];

    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves(fakeRecords),
    });

    const result = await resolveChatModelChoice("1");

    Assert.equal(result, null, "Should return null when choice ID not found");
  } finally {
    sb.restore();
  }
});
