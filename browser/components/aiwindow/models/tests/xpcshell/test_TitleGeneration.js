/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { generateChatTitle } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/TitleGeneration.sys.mjs"
);

const { openAIEngine } = ChromeUtils.importESModule(
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

const API_KEY = "test-api-key";
const ENDPOINT = "https://api.test-endpoint.com/v1";
const MODEL = "test-model";

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
 * Test that generateChatTitle successfully generates a title
 */
add_task(async function test_generateChatTitle_success() {
  Services.prefs.setStringPref(PREF_API_KEY, API_KEY);
  Services.prefs.setStringPref(PREF_ENDPOINT, ENDPOINT);
  Services.prefs.setStringPref(PREF_MODEL, MODEL);

  const sb = sinon.createSandbox();
  try {
    // Mock the engine response
    const mockResponse = {
      finalOutput: "Weather Forecast Query",
    };

    const fakeEngineInstance = {
      run: sb.stub().resolves(mockResponse),
    };

    sb.stub(openAIEngine, "_createEngine").resolves(fakeEngineInstance);

    const message = "What's the weather like today?";
    const currentTab = {
      url: "https://weather.example.com",
      title: "Weather Forecast",
      description: "Get current weather conditions",
    };

    const title = await generateChatTitle(message, currentTab);

    Assert.equal(
      title,
      "Weather Forecast Query",
      "Should return the generated title from the LLM"
    );

    Assert.ok(
      fakeEngineInstance.run.calledOnce,
      "Engine run should be called once"
    );

    // Verify the messages structure passed to the engine
    const callArgs = fakeEngineInstance.run.firstCall.args[0];
    Assert.ok(callArgs.args, "Should pass args to the engine");
    Assert.ok(!callArgs.messages, "Should not pass messages at top level");
    Assert.equal(
      callArgs.args.length,
      2,
      "Should have system and user messages"
    );
    Assert.equal(
      callArgs.args[0].role,
      "system",
      "First message should be system"
    );
    Assert.equal(
      callArgs.args[1].role,
      "user",
      "Second message should be user"
    );
    Assert.equal(
      callArgs.args[1].content,
      message,
      "User message should contain the input message"
    );

    // Verify the system prompt contains the tab information
    const systemContent = callArgs.args[0].content;
    Assert.ok(
      systemContent.includes(currentTab.url),
      "System prompt should include tab URL"
    );
    Assert.ok(
      systemContent.includes(currentTab.title),
      "System prompt should include tab title"
    );
    Assert.ok(
      systemContent.includes(currentTab.description),
      "System prompt should include tab description"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Test that generateChatTitle handles missing tab information
 */
add_task(async function test_generateChatTitle_no_tab_info() {
  Services.prefs.setStringPref(PREF_API_KEY, API_KEY);
  Services.prefs.setStringPref(PREF_ENDPOINT, ENDPOINT);
  Services.prefs.setStringPref(PREF_MODEL, MODEL);

  const sb = sinon.createSandbox();
  try {
    const mockResponse = {
      finalOutput: "General Question",
    };

    const fakeEngineInstance = {
      run: sb.stub().resolves(mockResponse),
    };

    sb.stub(openAIEngine, "_createEngine").resolves(fakeEngineInstance);

    const message = "Tell me about AI";
    const currentTab = null;

    const title = await generateChatTitle(message, currentTab);

    Assert.equal(
      title,
      "General Question",
      "Should return the generated title even without tab info"
    );

    // Verify the system prompt handles null tab
    const callArgs = fakeEngineInstance.run.firstCall.args[0];
    Assert.ok(callArgs.args, "Should pass args even with null tab");
  } finally {
    sb.restore();
  }
});

/**
 * Test that generateChatTitle handles empty tab fields
 */
add_task(async function test_generateChatTitle_empty_tab_fields() {
  Services.prefs.setStringPref(PREF_API_KEY, API_KEY);
  Services.prefs.setStringPref(PREF_ENDPOINT, ENDPOINT);
  Services.prefs.setStringPref(PREF_MODEL, MODEL);

  const sb = sinon.createSandbox();
  try {
    const mockResponse = {
      finalOutput: "Untitled Chat",
    };

    const fakeEngineInstance = {
      run: sb.stub().resolves(mockResponse),
    };

    sb.stub(openAIEngine, "_createEngine").resolves(fakeEngineInstance);

    const message = "Hello";
    const currentTab = {
      url: "",
      title: "",
      description: "",
    };

    const title = await generateChatTitle(message, currentTab);

    Assert.equal(title, "Untitled Chat", "Should handle empty tab fields");

    // Verify the system prompt includes the empty tab object
    const callArgs = fakeEngineInstance.run.firstCall.args[0];
    Assert.ok(callArgs.args, "Should pass args even with empty tab fields");
  } finally {
    sb.restore();
  }
});

/**
 * Test that generateChatTitle handles engine errors gracefully
 */
add_task(async function test_generateChatTitle_engine_error() {
  Services.prefs.setStringPref(PREF_API_KEY, API_KEY);
  Services.prefs.setStringPref(PREF_ENDPOINT, ENDPOINT);
  Services.prefs.setStringPref(PREF_MODEL, MODEL);

  const sb = sinon.createSandbox();
  try {
    const fakeEngineInstance = {
      run: sb.stub().rejects(new Error("Engine failed")),
    };

    sb.stub(openAIEngine, "_createEngine").resolves(fakeEngineInstance);

    const message = "Test message for error handling";
    const currentTab = {
      url: "https://example.com",
      title: "Example",
      description: "Test",
    };

    const title = await generateChatTitle(message, currentTab);

    Assert.equal(
      title,
      "Test message for error...",
      "Should return first four words when engine fails"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Test that generateChatTitle handles malformed engine responses
 */
add_task(async function test_generateChatTitle_malformed_response() {
  Services.prefs.setStringPref(PREF_API_KEY, API_KEY);
  Services.prefs.setStringPref(PREF_ENDPOINT, ENDPOINT);
  Services.prefs.setStringPref(PREF_MODEL, MODEL);

  const sb = sinon.createSandbox();
  try {
    // Test with missing finalOutput
    const mockResponse1 = {};
    let fakeEngineInstance = {
      run: sb.stub().resolves(mockResponse1),
    };
    sb.stub(openAIEngine, "_createEngine").resolves(fakeEngineInstance);

    let title = await generateChatTitle("test message one two", null);
    Assert.equal(
      title,
      "test message one two...",
      "Should return first four words for missing finalOutput"
    );

    // Test with empty string finalOutput
    sb.restore();
    const sb2 = sinon.createSandbox();
    const mockResponse2 = { finalOutput: "" };
    fakeEngineInstance = {
      run: sb2.stub().resolves(mockResponse2),
    };
    sb2.stub(openAIEngine, "_createEngine").resolves(fakeEngineInstance);

    title = await generateChatTitle("another test message here", null);
    Assert.equal(
      title,
      "another test message here...",
      "Should return first four words for empty finalOutput"
    );

    // Test with null finalOutput
    sb2.restore();
    const sb3 = sinon.createSandbox();
    const mockResponse3 = { finalOutput: null };
    fakeEngineInstance = {
      run: sb3.stub().resolves(mockResponse3),
    };
    sb3.stub(openAIEngine, "_createEngine").resolves(fakeEngineInstance);

    title = await generateChatTitle("short test here", null);
    Assert.equal(
      title,
      "short test here...",
      "Should return first four words for null finalOutput"
    );

    sb3.restore();
  } finally {
    sb.restore();
  }
});

/**
 * Test that generateChatTitle trims whitespace from response
 */
add_task(async function test_generateChatTitle_trim_whitespace() {
  Services.prefs.setStringPref(PREF_API_KEY, API_KEY);
  Services.prefs.setStringPref(PREF_ENDPOINT, ENDPOINT);
  Services.prefs.setStringPref(PREF_MODEL, MODEL);

  const sb = sinon.createSandbox();
  try {
    const mockResponse = {
      finalOutput: "  Title With Spaces  \n\n",
    };

    const fakeEngineInstance = {
      run: sb.stub().resolves(mockResponse),
    };

    sb.stub(openAIEngine, "_createEngine").resolves(fakeEngineInstance);

    const title = await generateChatTitle("test", null);

    Assert.equal(
      title,
      "Title With Spaces",
      "Should trim whitespace from generated title"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Test default title generation with fewer than four words
 */
add_task(async function test_generateChatTitle_short_message() {
  Services.prefs.setStringPref(PREF_API_KEY, API_KEY);
  Services.prefs.setStringPref(PREF_ENDPOINT, ENDPOINT);
  Services.prefs.setStringPref(PREF_MODEL, MODEL);

  const sb = sinon.createSandbox();
  try {
    const fakeEngineInstance = {
      run: sb.stub().rejects(new Error("Engine failed")),
    };

    sb.stub(openAIEngine, "_createEngine").resolves(fakeEngineInstance);

    // Test with three words
    let title = await generateChatTitle("Hello there friend", null);
    Assert.equal(
      title,
      "Hello there friend...",
      "Should return three words with ellipsis"
    );

    // Test with one word
    title = await generateChatTitle("Hello", null);
    Assert.equal(title, "Hello...", "Should return one word with ellipsis");

    // Test with empty message
    title = await generateChatTitle("", null);
    Assert.equal(
      title,
      "New Chat",
      "Should return 'New Chat' for empty message"
    );

    // Test with whitespace only
    title = await generateChatTitle("   ", null);
    Assert.equal(
      title,
      "New Chat",
      "Should return 'New Chat' for whitespace-only message"
    );
  } finally {
    sb.restore();
  }
});

/**
 * Test default title generation with more than four words
 */
add_task(async function test_generateChatTitle_long_message() {
  Services.prefs.setStringPref(PREF_API_KEY, API_KEY);
  Services.prefs.setStringPref(PREF_ENDPOINT, ENDPOINT);
  Services.prefs.setStringPref(PREF_MODEL, MODEL);

  const sb = sinon.createSandbox();
  try {
    const fakeEngineInstance = {
      run: sb.stub().rejects(new Error("Engine failed")),
    };

    sb.stub(openAIEngine, "_createEngine").resolves(fakeEngineInstance);

    const message = "This is a very long message with many words";
    const title = await generateChatTitle(message, null);

    Assert.equal(
      title,
      "This is a very...",
      "Should return only first four words with ellipsis"
    );
  } finally {
    sb.restore();
  }
});
