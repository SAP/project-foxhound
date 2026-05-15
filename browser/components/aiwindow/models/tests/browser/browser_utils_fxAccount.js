/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { openAIEngine } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Utils.sys.mjs"
);

const { OAUTH_CLIENT_ID, SCOPE_PROFILE_UID, SCOPE_SMART_WINDOW } =
  ChromeUtils.importESModule("resource://gre/modules/FxAccountsCommon.sys.mjs");

const { getFxAccountsSingleton } = ChromeUtils.importESModule(
  "resource://gre/modules/FxAccounts.sys.mjs"
);

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

add_task(async function test_getFxAccountToken_passes_correct_scope() {
  const fakeToken = "fake-oauth-token";
  const fxAccounts = getFxAccountsSingleton();

  const getOAuthTokenStub = sinon
    .stub(fxAccounts, "getOAuthToken")
    .resolves(fakeToken);

  try {
    const token = await openAIEngine.getFxAccountToken();

    Assert.ok(
      getOAuthTokenStub.calledOnce,
      "getOAuthToken should be called once"
    );

    const callArgs = getOAuthTokenStub.getCall(0).args[0];
    Assert.ok(callArgs, "getOAuthToken should be called with arguments");
    Assert.deepEqual(
      callArgs.scope,
      [SCOPE_SMART_WINDOW, SCOPE_PROFILE_UID],
      "getOAuthToken should be called with correct scope array"
    );
    Assert.equal(
      callArgs.client_id,
      OAUTH_CLIENT_ID,
      "getOAuthToken should be called with correct client_id"
    );
    Assert.equal(
      token,
      fakeToken,
      "getFxAccountToken should return the token from getOAuthToken"
    );
  } finally {
    getOAuthTokenStub.restore();
  }
});

add_task(async function test_getFxAccountToken_returns_null_on_error() {
  const fxAccounts = getFxAccountsSingleton();

  const getOAuthTokenStub = sinon
    .stub(fxAccounts, "getOAuthToken")
    .rejects(new Error("FxA authentication failed"));

  try {
    const token = await openAIEngine.getFxAccountToken();

    Assert.ok(
      getOAuthTokenStub.calledOnce,
      "getOAuthToken should be called once"
    );
    Assert.equal(
      token,
      null,
      "getFxAccountToken should return null when getOAuthToken throws an error"
    );
  } finally {
    getOAuthTokenStub.restore();
  }
});

// Success run with no errors should return response from engine.run.
add_task(async function test_runWithAuth_success_no_errors() {
  const engine = await openAIEngine.build("chat");
  const testContent = { messages: [{ role: "user", content: "test" }] };
  const expectedResponse = { success: true, data: "response" };

  const runStub = sinon
    .stub(engine.engineInstance, "run")
    .resolves(expectedResponse);

  try {
    const response = await engine._runWithAuth(testContent);

    Assert.ok(runStub.calledOnce, "engine.run should be called once");
    Assert.deepEqual(
      runStub.getCall(0).args[0],
      testContent,
      "run should be called with correct content"
    );
    Assert.deepEqual(
      response,
      expectedResponse,
      "_runWithAuth should return response from engine.run"
    );
  } finally {
    runStub.restore();
  }
});

// Test token refresh works on 401 error with successful retry
add_task(async function test_runWithAuth_retry_on_401_error() {
  const engine = await openAIEngine.build("chat");
  const oldToken = "old-token";
  const newToken = "new-token";
  const testContent = {
    messages: [{ role: "user", content: "test" }],
    fxAccountToken: oldToken,
  };
  const expectedResponse = { success: true, data: "response" };

  const runStub = sinon.stub(engine.engineInstance, "run");
  runStub
    .onFirstCall()
    .rejects(new Error("Request failed with 401 status code"));
  runStub.onSecondCall().resolves(expectedResponse);

  const fxAccounts = getFxAccountsSingleton();
  const removeCachedTokenStub = sinon
    .stub(fxAccounts, "removeCachedOAuthToken")
    .resolves();
  const getFxAccountTokenStub = sinon
    .stub(openAIEngine, "getFxAccountToken")
    .resolves(newToken);

  try {
    const response = await engine._runWithAuth(testContent);

    Assert.ok(runStub.calledTwice, "engine.run should be called twice");
    Assert.ok(
      removeCachedTokenStub.calledOnce,
      "removeCachedOAuthToken should be called once"
    );
    Assert.deepEqual(
      removeCachedTokenStub.getCall(0).args[0],
      { token: oldToken },
      "removeCachedOAuthToken should be called with old token"
    );
    Assert.ok(
      getFxAccountTokenStub.calledOnce,
      "getFxAccountToken should be called once"
    );

    const secondCallArgs = runStub.getCall(1).args[0];
    Assert.equal(
      secondCallArgs.fxAccountToken,
      newToken,
      "Second call should use new token"
    );
    Assert.deepEqual(
      response,
      expectedResponse,
      "_runWithAuth should return response from retry"
    );
  } finally {
    runStub.restore();
    removeCachedTokenStub.restore();
    getFxAccountTokenStub.restore();
  }
});

// Test token revocation and throw error if 401 error on both attempts
add_task(async function test_runWithAuth_fails_after_retry_401() {
  const engine = await openAIEngine.build("chat");
  const oldToken = "old-token";
  const newToken = "new-token";
  const testContent = {
    messages: [{ role: "user", content: "test" }],
    fxAccountToken: oldToken,
  };

  const firstError = new Error("Request failed with 401 status code");
  const secondError = new Error("Request failed with 401 status code");
  const runStub = sinon.stub(engine.engineInstance, "run");
  runStub.onFirstCall().rejects(firstError);
  runStub.onSecondCall().rejects(secondError);

  const fxAccounts = getFxAccountsSingleton();
  const removeCachedTokenStub = sinon
    .stub(fxAccounts, "removeCachedOAuthToken")
    .resolves();
  const getFxAccountTokenStub = sinon
    .stub(openAIEngine, "getFxAccountToken")
    .resolves(newToken);

  try {
    await Assert.rejects(
      engine._runWithAuth(testContent),
      ex => ex === secondError,
      "_runWithAuth should throw the retry error"
    );

    Assert.ok(runStub.calledTwice, "engine.run should be called twice");
    Assert.ok(
      removeCachedTokenStub.calledTwice,
      "removeCachedOAuthToken should be called twice (for old and new tokens)"
    );
    Assert.deepEqual(
      removeCachedTokenStub.getCall(0).args[0],
      { token: oldToken },
      "First removeCachedOAuthToken call should be for old token"
    );
    Assert.deepEqual(
      removeCachedTokenStub.getCall(1).args[0],
      { token: newToken },
      "Second removeCachedOAuthToken call should be for new token"
    );
  } finally {
    runStub.restore();
    removeCachedTokenStub.restore();
    getFxAccountTokenStub.restore();
  }
});

// Test no retry for non-401 errors and error is thrown immediately
add_task(async function test_runWithAuth_throws_non_401_error() {
  const engine = await openAIEngine.build("chat");
  const testContent = { messages: [{ role: "user", content: "test" }] };
  const expectedError = new Error("Network error");

  const runStub = sinon
    .stub(engine.engineInstance, "run")
    .rejects(expectedError);
  const fxAccounts = getFxAccountsSingleton();
  const removeCachedTokenStub = sinon
    .stub(fxAccounts, "removeCachedOAuthToken")
    .resolves();

  try {
    await Assert.rejects(
      engine._runWithAuth(testContent),
      ex => ex === expectedError,
      "_runWithAuth should throw non-401 errors immediately"
    );

    Assert.ok(runStub.calledOnce, "engine.run should be called once");
    Assert.ok(
      removeCachedTokenStub.notCalled,
      "removeCachedOAuthToken should not be called for non-401 errors"
    );
  } finally {
    runStub.restore();
    removeCachedTokenStub.restore();
  }
});

// Test async generator streaming success with no errors
add_task(async function test_runWithGeneratorAuth_success_no_errors() {
  const engine = await openAIEngine.build("chat");
  const testOptions = { messages: [{ role: "user", content: "test" }] };
  const expectedChunks = [{ text: "Hello" }, { text: " world" }, { text: "!" }];

  async function* mockGenerator() {
    for (const chunk of expectedChunks) {
      yield chunk;
    }
  }

  const runWithGeneratorStub = sinon
    .stub(engine.engineInstance, "runWithGenerator")
    .returns(mockGenerator());

  try {
    const chunks = [];
    for await (const chunk of engine._runWithGeneratorAuth(testOptions)) {
      chunks.push(chunk);
    }

    Assert.ok(
      runWithGeneratorStub.calledOnce,
      "engine.runWithGenerator should be called once"
    );
    Assert.deepEqual(
      runWithGeneratorStub.getCall(0).args[0],
      testOptions,
      "runWithGenerator should be called with correct options"
    );
    Assert.deepEqual(
      chunks,
      expectedChunks,
      "_runWithGeneratorAuth should yield all chunks"
    );
  } finally {
    runWithGeneratorStub.restore();
  }
});

// Test generator token refresh works on 401 error with successful retry
add_task(async function test_runWithGeneratorAuth_retry_on_401_error() {
  const engine = await openAIEngine.build("chat");
  const oldToken = "old-token";
  const newToken = "new-token";
  const testOptions = {
    messages: [{ role: "user", content: "test" }],
    fxAccountToken: oldToken,
  };
  const expectedChunks = [{ text: "Hello" }, { text: " retry" }];

  // eslint-disable-next-line require-yield
  async function* mockFailingGenerator() {
    const error = new Error("Request failed");
    error.status = 401;
    throw error;
  }

  async function* mockSuccessGenerator() {
    for (const chunk of expectedChunks) {
      yield chunk;
    }
  }

  const runWithGeneratorStub = sinon.stub(
    engine.engineInstance,
    "runWithGenerator"
  );
  runWithGeneratorStub.onFirstCall().returns(mockFailingGenerator());
  runWithGeneratorStub.onSecondCall().returns(mockSuccessGenerator());

  const fxAccounts = getFxAccountsSingleton();
  const removeCachedTokenStub = sinon
    .stub(fxAccounts, "removeCachedOAuthToken")
    .resolves();
  const getFxAccountTokenStub = sinon
    .stub(openAIEngine, "getFxAccountToken")
    .resolves(newToken);

  try {
    const chunks = [];
    for await (const chunk of engine._runWithGeneratorAuth(testOptions)) {
      chunks.push(chunk);
    }

    Assert.ok(
      runWithGeneratorStub.calledTwice,
      "engine.runWithGenerator should be called twice"
    );
    Assert.ok(
      removeCachedTokenStub.calledOnce,
      "removeCachedOAuthToken should be called once"
    );
    Assert.deepEqual(
      removeCachedTokenStub.getCall(0).args[0],
      { token: oldToken },
      "removeCachedOAuthToken should be called with old token"
    );
    Assert.ok(
      getFxAccountTokenStub.calledOnce,
      "getFxAccountToken should be called once"
    );

    const secondCallArgs = runWithGeneratorStub.getCall(1).args[0];
    Assert.equal(
      secondCallArgs.fxAccountToken,
      newToken,
      "Second call should use new token"
    );
    Assert.deepEqual(
      chunks,
      expectedChunks,
      "_runWithGeneratorAuth should yield all chunks from retry"
    );
  } finally {
    runWithGeneratorStub.restore();
    removeCachedTokenStub.restore();
    getFxAccountTokenStub.restore();
  }
});

// Test generator token revocation and throw error if 401 error on both attempts
add_task(async function test_runWithGeneratorAuth_fails_after_retry_401() {
  const engine = await openAIEngine.build("chat");
  const oldToken = "old-token";
  const newToken = "new-token";
  const testOptions = {
    messages: [{ role: "user", content: "test" }],
    fxAccountToken: oldToken,
  };

  const firstError = new Error("Request failed");
  firstError.status = 401;
  const secondError = new Error("Request failed");
  secondError.status = 401;

  // eslint-disable-next-line require-yield
  async function* mockFailingGenerator1() {
    throw firstError;
  }

  // eslint-disable-next-line require-yield
  async function* mockFailingGenerator2() {
    throw secondError;
  }

  const runWithGeneratorStub = sinon.stub(
    engine.engineInstance,
    "runWithGenerator"
  );
  runWithGeneratorStub.onFirstCall().returns(mockFailingGenerator1());
  runWithGeneratorStub.onSecondCall().returns(mockFailingGenerator2());

  const fxAccounts = getFxAccountsSingleton();
  const removeCachedTokenStub = sinon
    .stub(fxAccounts, "removeCachedOAuthToken")
    .resolves();
  const getFxAccountTokenStub = sinon
    .stub(openAIEngine, "getFxAccountToken")
    .resolves(newToken);

  try {
    const generator = engine._runWithGeneratorAuth(testOptions);
    await Assert.rejects(
      (async () => {
        // eslint-disable-next-line no-unused-vars
        for await (const _chunk of generator) {
          // Should not yield any chunks
        }
      })(),
      ex => ex === secondError,
      "_runWithGeneratorAuth should throw the retry error"
    );

    Assert.ok(
      runWithGeneratorStub.calledTwice,
      "engine.runWithGenerator should be called twice"
    );
    Assert.ok(
      removeCachedTokenStub.calledTwice,
      "removeCachedOAuthToken should be called twice (for old and new tokens)"
    );
    Assert.deepEqual(
      removeCachedTokenStub.getCall(0).args[0],
      { token: oldToken },
      "First removeCachedOAuthToken call should be for old token"
    );
    Assert.deepEqual(
      removeCachedTokenStub.getCall(1).args[0],
      { token: newToken },
      "Second removeCachedOAuthToken call should be for new token"
    );
  } finally {
    runWithGeneratorStub.restore();
    removeCachedTokenStub.restore();
    getFxAccountTokenStub.restore();
  }
});

// Test generator no retry for non-401 errors and error is thrown immediately
add_task(async function test_runWithGeneratorAuth_throws_non_401_error() {
  const engine = await openAIEngine.build("chat");
  const testOptions = { messages: [{ role: "user", content: "test" }] };
  const expectedError = new Error("Network error");

  // eslint-disable-next-line require-yield
  async function* mockFailingGenerator() {
    throw expectedError;
  }

  const runWithGeneratorStub = sinon
    .stub(engine.engineInstance, "runWithGenerator")
    .returns(mockFailingGenerator());
  const fxAccounts = getFxAccountsSingleton();
  const removeCachedTokenStub = sinon
    .stub(fxAccounts, "removeCachedOAuthToken")
    .resolves();

  try {
    const generator = engine._runWithGeneratorAuth(testOptions);
    await Assert.rejects(
      (async () => {
        // eslint-disable-next-line no-unused-vars
        for await (const _chunk of generator) {
          // Should not yield any chunks
        }
      })(),
      ex => ex === expectedError,
      "_runWithGeneratorAuth should throw non-401 errors immediately"
    );

    Assert.ok(
      runWithGeneratorStub.calledOnce,
      "engine.runWithGenerator should be called once"
    );
    Assert.ok(
      removeCachedTokenStub.notCalled,
      "removeCachedOAuthToken should not be called for non-401 errors"
    );
  } finally {
    runWithGeneratorStub.restore();
    removeCachedTokenStub.restore();
  }
});
