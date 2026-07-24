/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { MODEL_FEATURES, openAIEngine, renderPrompt } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
  );

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

/**
 * Constants for preference keys and test values
 */
const PREF_API_KEY = "browser.smartwindow.apiKey";
const PREF_ENDPOINT = "browser.smartwindow.endpoint";
const PREF_MODEL = "browser.smartwindow.model";
const PREF_EXTRA_HEADERS = "browser.smartwindow.extraHeaders";

const API_KEY = "fake-key";
const ENDPOINT = "https://api.fake-endpoint.com/v1";
const MODEL = "fake-model";
const EXTRA_HEADERS = '{"x-fastly-request": "fake-key"}';

/**
 * Cleans up preferences after testing
 */
registerCleanupFunction(() => {
  for (let pref of [PREF_API_KEY, PREF_ENDPOINT, PREF_MODEL]) {
    if (Services.prefs.prefHasUserValue(pref)) {
      Services.prefs.clearUserPref(pref);
    }
  }
});

/**
 * Tests the creation of an OpenAI engine instance
 */
add_task(async function test_createOpenAIEngine_with_chat_feature() {
  Services.prefs.setStringPref(PREF_API_KEY, API_KEY);
  Services.prefs.setStringPref(PREF_ENDPOINT, ENDPOINT);
  Services.prefs.setStringPref(PREF_MODEL, MODEL);
  Services.prefs.setStringPref(PREF_EXTRA_HEADERS, EXTRA_HEADERS);

  const sb = sinon.createSandbox();
  try {
    // Take engine to stub out actual engine creation
    const fakeEngine = {
      runWithGenerator() {
        throw new Error("not used");
      },
    };

    const stub = sb.stub(openAIEngine, "_createEngine").resolves(fakeEngine);
    const engine = await openAIEngine.build(MODEL_FEATURES.CHAT);
    Assert.strictEqual(
      engine.engineInstance,
      fakeEngine,
      "Should return engine from _createEngine"
    );
    Assert.ok(stub.calledOnce, "_createEngine should be called once");

    // Test preferences were read correctly
    const opts = stub.firstCall.args[0];
    Assert.equal(opts.apiKey, API_KEY, "apiKey should come from pref");
    Assert.equal(opts.backend, "openai", "backend should be openai");
    Assert.equal(opts.baseURL, ENDPOINT, "baseURL should come from pref");
    Assert.equal(
      opts.engineId,
      "smart-openai",
      "engineId should be smart-openai"
    );
    Assert.ok(opts.modelId, "modelId should be set");
    Assert.equal(opts.modelRevision, "main", "modelRevision should be main");
    Assert.equal(
      opts.taskName,
      "text-generation",
      "taskName should be text-generation"
    );
    Assert.equal(opts.serviceType, "ai", "serviceType should be ai");
    Assert.deepEqual(
      opts.extraHeaders,
      JSON.parse(EXTRA_HEADERS),
      "extraHeaders should come from pref"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Tests rendering a prompt from a file with placeholder string replacements
 */
add_task(async function test_renderPrompt() {
  // Render the test prompt with replacements
  const test_prompt = `
This is a test prompt.
{testToReplace1}

This is more content. {testToReplace2}

{testToReplace3} Here's the last line.`.trim();
  const promptContent = await renderPrompt(test_prompt, {
    testToReplace1: "replaced1",
    testToReplace2: "replaced2",
    testToReplace3: "replaced3",
  });

  Assert.equal(
    promptContent,
    "This is a test prompt.\nreplaced1\n\nThis is more content. replaced2\n\nreplaced3 Here's the last line.",
    "Should render the prompt correctly with provided replacement strings"
  );
});
