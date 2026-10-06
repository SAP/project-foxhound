/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

do_get_profile();

const {
  FALLBACK_MODELS,
  getModelForChoice,
  getAllModelsData,
  getCachedModelsData,
  getCurrentModelName,
  _clearModelsDataCacheForTesting,
  openAIEngine,
  FEATURE_MAJOR_VERSIONS,
} = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
);

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

add_task(async function test_getModelForChoice_with_remote_settings_data() {
  _clearModelsDataCacheForTesting();
  const sb = sinon.createSandbox();
  try {
    const fakeRecords = [
      {
        feature: "chat",
        version: `${FEATURE_MAJOR_VERSIONS.chat}.19`,
        model: "qwen3-235b-a22b-instruct-2507-maas",
        model_choice_id: "2",
        owner_name: "Alibaba",
        is_default: true,
      },
      {
        feature: "chat",
        version: `${FEATURE_MAJOR_VERSIONS.chat}.13`,
        model: "gemini-3.1-flash-lite",
        model_choice_id: "1",
        owner_name: "Google",
      },
    ];

    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves(fakeRecords),
    });

    const result = await getModelForChoice("1");

    Assert.deepEqual(
      result,
      { model: "gemini-3.1-flash-lite", ownerName: "Google", labelId: "fast" },
      "Should return correct model data for choice 1"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_getModelForChoice_fallback_when_not_found() {
  const sb = sinon.createSandbox();
  try {
    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves([]),
    });

    const result = await getModelForChoice("1");

    Assert.deepEqual(
      result,
      { model: "gemini-3.1-flash-lite", ownerName: "Google", labelId: "fast" },
      "Should return fallback data for choice 1"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_getModelForChoice_custom_model() {
  const result = await getModelForChoice("0");

  Assert.deepEqual(
    result,
    { model: "custom-model", ownerName: "", labelId: "custom" },
    "Should return custom model data for choice 0"
  );
});

add_task(async function test_getAllModelsData_with_remote_settings() {
  _clearModelsDataCacheForTesting();
  const sb = sinon.createSandbox();
  try {
    const fakeRecords = [
      {
        feature: "chat",
        version: `${FEATURE_MAJOR_VERSIONS.chat}.19`,
        model: "qwen3-235b-a22b-instruct-2507-maas",
        model_choice_id: "2",
        owner_name: "Alibaba",
        is_default: true,
      },
      {
        feature: "chat",
        version: `${FEATURE_MAJOR_VERSIONS.chat}.13`,
        model: "gemini-3.1-flash-lite",
        model_choice_id: "1",
        owner_name: "Google",
      },
      {
        feature: "chat",
        version: `${FEATURE_MAJOR_VERSIONS.chat}.10`,
        model: "gpt-oss-120b",
        model_choice_id: "3",
        owner_name: "OpenAI",
      },
    ];

    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves(fakeRecords),
      on: sb.stub(),
    });

    const result = await getAllModelsData();
    Assert.deepEqual(
      result,
      {
        0: { model: "custom-model", ownerName: "", labelId: "custom" },
        1: {
          model: "gemini-3.1-flash-lite",
          ownerName: "Google",
          labelId: "fast",
        },
        2: {
          model: "qwen3-235b-a22b-instruct-2507-maas",
          ownerName: "Alibaba",
          labelId: "allpurpose",
        },
        3: {
          model: "gpt-oss-120b",
          ownerName: "OpenAI",
          labelId: "personal",
        },
      },
      "Should return all model choices with correct data"
    );
  } finally {
    sb.restore();
  }
});

add_task(function test_getCachedModelsData_returns_fallback_before_fetch() {
  _clearModelsDataCacheForTesting();
  const result = getCachedModelsData();
  Assert.deepEqual(
    result,
    FALLBACK_MODELS,
    "Should return FALLBACK_MODELS before getAllModelsData has been called"
  );
});

add_task(async function test_getCachedModelsData_returns_rs_data_after_fetch() {
  _clearModelsDataCacheForTesting();
  const sb = sinon.createSandbox();
  try {
    const fakeRecords = [
      {
        feature: "chat",
        version: `${FEATURE_MAJOR_VERSIONS.chat}.13`, // RS only loads the current major version for chat
        model: "gemini-rs-model",
        model_choice_id: "1",
        owner_name: "Google",
      },
    ];
    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves(fakeRecords),
      on: sb.stub(),
    });

    await getAllModelsData();

    const result = getCachedModelsData();
    Assert.equal(
      result["1"].model,
      "gemini-rs-model",
      "Should return RS-resolved data after getAllModelsData has been called"
    );
  } finally {
    sb.restore();
  }
});

add_task(
  async function test_getCurrentModelName_returns_correctly_before_and_after_cache() {
    Services.prefs.setStringPref(
      "browser.smartwindow.firstrun.modelChoice",
      "1"
    );
    _clearModelsDataCacheForTesting();
    const sb = sinon.createSandbox();

    try {
      const fakeRecords = [
        {
          feature: "chat",
          version: `${FEATURE_MAJOR_VERSIONS.chat}.13`, // RS only loads the current major version for chat
          model: "gemini-rs-model",
          model_choice_id: "1",
          owner_name: "Google",
        },
      ];
      sb.stub(openAIEngine, "getRemoteClient").returns({
        get: sb.stub().resolves(fakeRecords),
        on: sb.stub(),
      });

      Assert.equal(
        getCurrentModelName(),
        FALLBACK_MODELS[1].model,
        "Should return fallback model name for choice 1"
      );

      await getAllModelsData();

      Assert.equal(
        getCurrentModelName(),
        "gemini-rs-model",
        "Should return rs model name for choice 1 after cache initialized"
      );
    } finally {
      sb.restore();
      Services.prefs.clearUserPref("browser.smartwindow.firstrun.modelChoice");
    }
  }
);

add_task(function test_getCurrentModelName_returns_empty_when_no_choice() {
  Services.prefs.clearUserPref("browser.smartwindow.firstrun.modelChoice");
  Assert.equal(
    getCurrentModelName(),
    "",
    "Should return empty string when no model choice is set"
  );
});

add_task(async function test_getAllModelsData_with_fallbacks() {
  _clearModelsDataCacheForTesting();
  const sb = sinon.createSandbox();
  try {
    const fakeRecords = [
      {
        feature: "chat",
        version: `${FEATURE_MAJOR_VERSIONS.chat}.19`,
        model: "gemini-3.1-flash-lite",
        model_choice_id: "1",
        owner_name: "Google",
      },
    ];

    sb.stub(openAIEngine, "getRemoteClient").returns({
      get: sb.stub().resolves(fakeRecords),
      on: sb.stub(),
    });

    const result = await getAllModelsData();
    Assert.deepEqual(
      result,
      {
        0: { model: "custom-model", ownerName: "", labelId: "custom" },
        1: {
          model: "gemini-3.1-flash-lite",
          ownerName: "Google",
          labelId: "fast",
        },
        2: {
          model: "qwen3-235b-a22b-instruct-2507-maas",
          ownerName: "Alibaba",
          labelId: "allpurpose",
        },
        3: {
          model: "gpt-oss-120b",
          ownerName: "OpenAI",
          labelId: "personal",
        },
      },
      "Should return all model choices with correct data"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_cache_refreshes_on_sync() {
  _clearModelsDataCacheForTesting();
  openAIEngine._remoteClient = null;
  const sb = sinon.createSandbox();
  try {
    const initialRecords = [
      {
        feature: "chat",
        version: `${FEATURE_MAJOR_VERSIONS.chat}.1`,
        model: "initial-model",
        model_choice_id: "1",
        owner_name: "Google",
      },
    ];
    const updatedRecords = [
      {
        feature: "chat",
        version: `${FEATURE_MAJOR_VERSIONS.chat}.2`,
        model: "updated-model",
        model_choice_id: "1",
        owner_name: "Google",
      },
    ];

    const client = openAIEngine.getRemoteClient();
    const getStub = sb.stub(client, "get").resolves(initialRecords);

    await getAllModelsData();
    Assert.equal(
      getCachedModelsData()["1"].model,
      "initial-model",
      "cache has initial data"
    );

    getStub.resolves(updatedRecords);
    await client.emit("sync", { data: { current: updatedRecords } });

    Assert.equal(
      getCachedModelsData()["1"].model,
      "updated-model",
      "cache updated with new data after sync"
    );
  } finally {
    sb.restore();
    openAIEngine._remoteClient = null;
  }
});
