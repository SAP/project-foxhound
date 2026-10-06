/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { openAIEngine, MODEL_FEATURES, SERVICE_TYPES, PURPOSES } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
  );

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const PREF_API_KEY = "browser.smartwindow.apiKey";
const PREF_ENDPOINT = "browser.smartwindow.endpoint";
const PREF_CUSTOM_ENDPOINT = "browser.smartwindow.customEndpoint";
const PREF_MODEL = "browser.smartwindow.model";

const DEFAULT_ENDPOINT =
  "https://mlpa-prod-prod-mozilla.global.ssl.fastly.net/v1";

registerCleanupFunction(() => {
  for (const pref of [
    PREF_API_KEY,
    PREF_ENDPOINT,
    PREF_CUSTOM_ENDPOINT,
    PREF_MODEL,
  ]) {
    if (Services.prefs.prefHasUserValue(pref)) {
      Services.prefs.clearUserPref(pref);
    }
  }
});

add_task(async function test_build_with_object_form_no_rs_read() {
  Services.prefs.setStringPref(PREF_API_KEY, "fake-key");
  Services.prefs.setStringPref(
    PREF_ENDPOINT,
    "https://api.fake-endpoint.com/v1"
  );

  const sb = sinon.createSandbox();
  try {
    const fakeEngine = { runWithGenerator() {} };
    const getRemoteClientSpy = sb.spy(openAIEngine, "getRemoteClient");
    sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);

    const config = {
      model: "gpt-oss-120b",
      serviceType: SERVICE_TYPES.AI,
      purpose: PURPOSES.CHAT,
      flowId: "test-flow-id",
      feature: MODEL_FEATURES.CHAT,
    };

    const engine = await openAIEngine.build(config);

    Assert.strictEqual(
      engine.engineInstance,
      fakeEngine,
      "engineInstance should be set from _createEngine"
    );
    Assert.equal(
      engine.model,
      config.model,
      "model should match passed-in config"
    );
    Assert.equal(
      engine.feature,
      config.feature,
      "feature should match passed-in config"
    );
    Assert.equal(
      getRemoteClientSpy.callCount,
      0,
      "getRemoteClient must not be called on object-form build"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_build_custom_choice_uses_custom_endpoint() {
  Services.prefs.setStringPref(
    PREF_CUSTOM_ENDPOINT,
    "https://api.custom-endpoint.com/v1"
  );
  Services.prefs.setStringPref(PREF_API_KEY, "custom-key");
  // Set endpoint pref should not affect custom model routing
  Services.prefs.setStringPref(PREF_ENDPOINT, DEFAULT_ENDPOINT);

  const sb = sinon.createSandbox();
  try {
    const createEngineStub = sb
      .stub(openAIEngine, "_createEngine")
      .resolves({ runWithGenerator() {} });

    const { baseURL, apiKey } = openAIEngine.resolveEndpointConfig("0");
    const engine = await openAIEngine.build({
      model: "custom-model",
      serviceType: SERVICE_TYPES.AI,
      purpose: PURPOSES.CHAT,
      flowId: "test-flow-id",
      feature: MODEL_FEATURES.CHAT,
      baseURL,
      apiKey,
    });

    const args = createEngineStub.getCall(0).args[0];
    Assert.equal(
      args.baseURL,
      "https://api.custom-endpoint.com/v1",
      "custom choice routes to the saved custom endpoint"
    );
    Assert.equal(
      args.apiKey,
      "custom-key",
      "custom choice forwards the saved key"
    );
    Assert.ok(
      engine.isCustomEndpoint,
      "engine on a custom endpoint reports isCustomEndpoint"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_build_preset_choice_uses_mlpa_endpoint() {
  // Custom config saved, but a preset choice must ignore it entirely.
  Services.prefs.setStringPref(
    PREF_CUSTOM_ENDPOINT,
    "https://api.custom-endpoint.com/v1"
  );
  Services.prefs.setStringPref(PREF_API_KEY, "custom-key");
  Services.prefs.clearUserPref(PREF_ENDPOINT);

  const sb = sinon.createSandbox();
  try {
    const createEngineStub = sb
      .stub(openAIEngine, "_createEngine")
      .resolves({ runWithGenerator() {} });

    const { baseURL, apiKey } = openAIEngine.resolveEndpointConfig("1");
    const engine = await openAIEngine.build({
      model: "gemini-3.1-flash-lite",
      serviceType: SERVICE_TYPES.AI,
      purpose: PURPOSES.CHAT,
      flowId: "test-flow-id",
      feature: MODEL_FEATURES.CHAT,
      baseURL,
      apiKey,
    });

    const args = createEngineStub.getCall(0).args[0];
    Assert.equal(
      args.baseURL,
      DEFAULT_ENDPOINT,
      "preset choice routes to MLPA endpoint"
    );
    Assert.equal(args.apiKey, "", "preset choice sends no key");
    Assert.ok(
      !engine.isCustomEndpoint,
      "engine on the MLPA endpoint is not custom"
    );
  } finally {
    sb.restore();
  }
});

add_task(async function test_build_no_choice_uses_mozilla_endpoint() {
  // Callers that are not chat omit modelChoiceId and use the MLPA endpoint even
  // when a custom model is configured.
  Services.prefs.setStringPref(
    PREF_CUSTOM_ENDPOINT,
    "https://api.custom-endpoint.com/v1"
  );
  Services.prefs.setStringPref(PREF_API_KEY, "custom-key");
  Services.prefs.clearUserPref(PREF_ENDPOINT);

  const sb = sinon.createSandbox();
  try {
    const createEngineStub = sb
      .stub(openAIEngine, "_createEngine")
      .resolves({ runWithGenerator() {} });

    await openAIEngine.build({
      model: "some-model",
      serviceType: SERVICE_TYPES.AI,
      purpose: PURPOSES.TITLE_GENERATION,
      flowId: "test-flow-id",
      feature: MODEL_FEATURES.TITLE_GENERATION,
    });

    const args = createEngineStub.getCall(0).args[0];
    Assert.equal(
      args.baseURL,
      DEFAULT_ENDPOINT,
      "no choice id routes to MLPA endpoint"
    );
    Assert.equal(args.apiKey, "", "no choice id sends no key");
  } finally {
    sb.restore();
  }
});

add_task(async function test_resolve_custom_choice_empty_endpoint_throws() {
  Services.prefs.clearUserPref(PREF_CUSTOM_ENDPOINT);
  Services.prefs.clearUserPref(PREF_ENDPOINT);
  Services.prefs.setStringPref(PREF_API_KEY, "orphan-key");

  Assert.throws(
    () => openAIEngine.resolveEndpointConfig("0"),
    error =>
      error.message === "Custom model choice selected but not configured",
    "custom model choice with an empty custom endpoint throws"
  );
});
