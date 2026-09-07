/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { loadCallContext, loadPrompt, FEATURE_PURPOSES, DEFAULT_PURPOSE } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/PromptLoader.sys.mjs"
  );
const { openAIEngine, MODEL_FEATURES, FEATURE_MAJOR_VERSIONS } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
  );

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const PREF_MODEL = "browser.smartwindow.model";
const PREF_MODEL_CHOICE = "browser.smartwindow.firstrun.modelChoice";
const PREF_CUSTOM_PROMPTS = "browser.smartwindow.customPrompts";

registerCleanupFunction(() => {
  for (const pref of [PREF_MODEL, PREF_MODEL_CHOICE, PREF_CUSTOM_PROMPTS]) {
    if (Services.prefs.prefHasUserValue(pref)) {
      Services.prefs.clearUserPref(pref);
    }
  }
});

add_task(async function test_loadCallContext_returns_expected_shape() {
  Services.prefs.clearUserPref(PREF_MODEL);
  Services.prefs.clearUserPref(PREF_MODEL_CHOICE);

  const sb = sinon.createSandbox();
  try {
    const fakeRecords = [
      {
        feature: MODEL_FEATURES.CHAT,
        version: `${FEATURE_MAJOR_VERSIONS[MODEL_FEATURES.CHAT]}.0`,
        model_choice_id: "",
        model: "gpt-oss-120b",
        is_default: true,
        parameters: { temperature: 0.8 },
        service_type: "ai",
        purpose: "chat",
      },
    ];
    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves(fakeRecords),
    });

    const ctx = await loadCallContext(MODEL_FEATURES.CHAT);

    Assert.equal(ctx.model, "gpt-oss-120b", "model should be set from record");
    Assert.deepEqual(
      ctx.parameters,
      { temperature: 0.8 },
      "parameters should be set from record"
    );
    Assert.equal(
      ctx.serviceType,
      "ai",
      "serviceType should be set from record"
    );
    Assert.equal(ctx.purpose, "chat", "purpose should be set from record");
  } finally {
    sb.restore();
  }
});

add_task(async function test_loadCallContext_falls_back_to_defaults() {
  Services.prefs.clearUserPref(PREF_MODEL);
  Services.prefs.clearUserPref(PREF_MODEL_CHOICE);

  const sb = sinon.createSandbox();
  try {
    const fakeRecords = [
      {
        feature: MODEL_FEATURES.TITLE_GENERATION,
        version: `${FEATURE_MAJOR_VERSIONS[MODEL_FEATURES.TITLE_GENERATION]}.0`,
        model: "some-model",
        is_default: true,
      },
    ];
    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves(fakeRecords),
    });

    const ctx = await loadCallContext(MODEL_FEATURES.TITLE_GENERATION);

    Assert.deepEqual(
      ctx.parameters,
      {},
      "parameters should default to empty object when absent"
    );
    Assert.equal(
      ctx.serviceType,
      "ai",
      "serviceType should default to 'ai' for non-memories feature"
    );
    Assert.equal(
      ctx.purpose,
      FEATURE_PURPOSES[MODEL_FEATURES.TITLE_GENERATION] ??
        FEATURE_PURPOSES[DEFAULT_PURPOSE],
      "purpose should default to FEATURE_PURPOSES lookup"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_loadCallContext_throws_on_missing_record() {
  Services.prefs.clearUserPref(PREF_MODEL);
  Services.prefs.clearUserPref(PREF_MODEL_CHOICE);

  const sb = sinon.createSandbox();
  try {
    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves([]),
    });

    await Assert.rejects(
      loadCallContext(MODEL_FEATURES.CHAT),
      /No Remote Settings records found for feature/,
      "Should reject with a clear error when no records exist"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_loadPrompt_returns_prompt_text() {
  Services.prefs.clearUserPref(PREF_MODEL);
  Services.prefs.clearUserPref(PREF_MODEL_CHOICE);
  Services.prefs.clearUserPref(PREF_CUSTOM_PROMPTS);

  const sb = sinon.createSandbox();
  try {
    const fakeRecords = [
      {
        feature: MODEL_FEATURES.CHAT,
        version: `${FEATURE_MAJOR_VERSIONS[MODEL_FEATURES.CHAT]}.0`,
        model_choice_id: "",
        model: "gpt-oss-120b",
        is_default: true,
        prompts: "You are a helpful assistant.",
      },
    ];
    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves(fakeRecords),
    });

    const result = await loadPrompt(MODEL_FEATURES.CHAT);

    Assert.deepEqual(
      result,
      {
        prompt: "You are a helpful assistant.",
        version: `${FEATURE_MAJOR_VERSIONS[MODEL_FEATURES.CHAT]}.0`,
      },
      "loadPrompt should return the prompts field from the record"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_loadPrompt_throws_on_missing_record() {
  Services.prefs.clearUserPref(PREF_MODEL);
  Services.prefs.clearUserPref(PREF_MODEL_CHOICE);
  Services.prefs.clearUserPref(PREF_CUSTOM_PROMPTS);

  const sb = sinon.createSandbox();
  try {
    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves([]),
    });

    await Assert.rejects(
      loadPrompt(MODEL_FEATURES.CHAT),
      /No Remote Settings records found for feature/,
      "loadPrompt should reject when no records exist"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_loadPrompt_honors_custom_prompt_pref() {
  Services.prefs.clearUserPref(PREF_MODEL);
  Services.prefs.clearUserPref(PREF_MODEL_CHOICE);

  const sb = sinon.createSandbox();
  try {
    const fakeRecords = [
      {
        feature: MODEL_FEATURES.CHAT,
        version: `${FEATURE_MAJOR_VERSIONS[MODEL_FEATURES.CHAT]}.0`,
        model_choice_id: "",
        model: "gpt-oss-120b",
        is_default: true,
        prompts: "Original prompt.",
      },
    ];
    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves(fakeRecords),
    });

    Services.prefs.setStringPref(
      PREF_CUSTOM_PROMPTS,
      JSON.stringify({ [MODEL_FEATURES.CHAT]: "OVERRIDE" })
    );

    const { prompt } = await loadPrompt(MODEL_FEATURES.CHAT);

    Assert.equal(
      prompt,
      "OVERRIDE",
      "loadPrompt should return the custom prompt pref override"
    );
  } finally {
    Services.prefs.clearUserPref(PREF_CUSTOM_PROMPTS);
    sb.restore();
  }
});

add_task(
  async function test_loadCallContext_remoteSettingsUnavailable_clientReason() {
    const sb = sinon.createSandbox();
    try {
      sb.stub(openAIEngine, "getRemoteClient").returns({
        get: sb.stub().resolves([]),
      });

      await Assert.rejects(
        loadCallContext(MODEL_FEATURES.CHAT),
        err => err.clientReason === "remoteSettingsUnavailable",
        "loadCallContext should reject with clientReason remoteSettingsUnavailable"
      );
    } finally {
      sb.restore();
    }
  }
);

add_task(
  async function test_loadCallContext_modelConfigUnavailable_clientReason() {
    const sb = sinon.createSandbox();
    try {
      // Records exist for the feature but not for the required major version,
      // so selectMainConfig returns null and modelConfigUnavailable is reported.
      const fakeRecords = [
        {
          feature: MODEL_FEATURES.CHAT,
          version: "999.0",
          model: "generic",
          is_default: true,
        },
      ];
      sb.stub(openAIEngine, "getRemoteClient").returns({
        get: sb.stub().resolves(fakeRecords),
      });

      await Assert.rejects(
        loadCallContext(MODEL_FEATURES.CHAT),
        err => err.clientReason === "modelConfigUnavailable",
        "loadCallContext should reject with clientReason modelConfigUnavailable"
      );
    } finally {
      sb.restore();
    }
  }
);

add_task(async function test_loadPrompt_promptLoadFailure_clientReason() {
  const sb = sinon.createSandbox();
  try {
    // Record exists with a matching major version but no `prompts` field.
    const fakeRecords = [
      {
        feature: MODEL_FEATURES.CHAT,
        version: `${FEATURE_MAJOR_VERSIONS[MODEL_FEATURES.CHAT]}.0`,
        model: "generic",
        is_default: true,
      },
    ];
    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves(fakeRecords),
    });

    await Assert.rejects(
      loadPrompt(MODEL_FEATURES.CHAT),
      err => err.clientReason === "promptLoadFailure",
      "loadPrompt should reject with clientReason promptLoadFailure"
    );
  } finally {
    sb.restore();
  }
});
