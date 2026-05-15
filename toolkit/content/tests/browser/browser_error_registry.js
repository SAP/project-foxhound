/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests for the error registry foundation.
 * These tests verify that the error registry provides correct configurations
 * for network and certificate errors.
 */

const REGISTRY_URL = "chrome://global/content/errors/error-registry.mjs";
const LOOKUP_URL = "chrome://global/content/errors/error-lookup.mjs";

add_task(async function test_registry_exports() {
  const registry = ChromeUtils.importESModule(REGISTRY_URL);

  Assert.strictEqual(
    typeof registry.getErrorConfig,
    "function",
    "getErrorConfig should be exported"
  );
  Assert.strictEqual(
    typeof registry.registerError,
    "function",
    "registerError should be exported"
  );
  Assert.strictEqual(
    typeof registry.isErrorSupported,
    "function",
    "isErrorSupported should be exported"
  );
});

add_task(async function test_lookup_exports() {
  const lookup = ChromeUtils.importESModule(LOOKUP_URL);

  Assert.strictEqual(
    typeof lookup.errorHasNoUserFix,
    "function",
    "errorHasNoUserFix should be exported"
  );
  Assert.strictEqual(
    typeof lookup.getResolvedErrorConfig,
    "function",
    "getResolvedErrorConfig should be exported"
  );
  Assert.strictEqual(
    typeof lookup.isFeltPrivacySupported,
    "function",
    "isFeltPrivacySupported should be exported"
  );
});

add_task(async function test_unknown_error_returns_default() {
  const { getErrorConfig } = ChromeUtils.importESModule(REGISTRY_URL);

  const config = getErrorConfig("UNKNOWN_ERROR_12345");

  Assert.equal(config?.errorCode, null, "Unknown error should return null");
});

add_task(async function test_register_and_get_error() {
  const { registerError, getErrorConfig, _testOnlyClearRegistry } =
    ChromeUtils.importESModule(REGISTRY_URL);

  _testOnlyClearRegistry();

  const testConfig = {
    id: "TEST_ERROR_123",
    errorCode: "TEST_ERROR_123",
    category: "cert",
    pageTitleL10nId: "test-page-title",
    bodyTitleL10nId: "test-body-title",
    buttons: {
      showTryAgain: false,
      showGoBack: true,
    },
    hasNoUserFix: true,
  };

  registerError(testConfig);

  const retrieved = getErrorConfig("TEST_ERROR_123");
  Assert.equal(retrieved.errorCode, "TEST_ERROR_123");
  Assert.equal(retrieved.category, "cert");
  Assert.equal(retrieved.pageTitleL10nId, "test-page-title");
  Assert.equal(retrieved.hasNoUserFix, true);

  _testOnlyClearRegistry();
});

add_task(async function test_is_error_supported() {
  const { registerError, isErrorSupported, _testOnlyClearRegistry } =
    ChromeUtils.importESModule(REGISTRY_URL);

  _testOnlyClearRegistry();

  Assert.ok(
    !isErrorSupported("TEST_ERROR_456"),
    "Unregistered error should not be supported"
  );

  registerError({
    id: "TEST_ERROR_456",
    errorCode: "TEST_ERROR_456",
    category: "net",
    pageTitleL10nId: "test-title",
    bodyTitleL10nId: "test-body",
    buttons: {},
  });

  Assert.ok(
    isErrorSupported("TEST_ERROR_456"),
    "Registered error should be supported"
  );

  _testOnlyClearRegistry();
});

add_task(async function test_error_has_no_user_fix() {
  const { registerError, _testOnlyClearRegistry } =
    ChromeUtils.importESModule(REGISTRY_URL);
  const { errorHasNoUserFix } = ChromeUtils.importESModule(LOOKUP_URL);

  _testOnlyClearRegistry();

  registerError({
    id: "NO_FIX_ERROR",
    errorCode: "NO_FIX_ERROR",
    category: "cert",
    pageTitleL10nId: "test-title",
    bodyTitleL10nId: "test-body",
    buttons: {},
    hasNoUserFix: true,
  });

  registerError({
    id: "HAS_FIX_ERROR",
    errorCode: "HAS_FIX_ERROR",
    category: "cert",
    pageTitleL10nId: "test-title",
    bodyTitleL10nId: "test-body",
    buttons: {},
    hasNoUserFix: false,
  });

  Assert.ok(
    errorHasNoUserFix("NO_FIX_ERROR"),
    "Error with hasNoUserFix=true should return true"
  );
  Assert.ok(
    !errorHasNoUserFix("HAS_FIX_ERROR"),
    "Error with hasNoUserFix=false should return false"
  );
  Assert.ok(
    !errorHasNoUserFix("UNKNOWN_ERROR"),
    "Unknown error should return false (default)"
  );

  _testOnlyClearRegistry();
});

add_task(async function test_resolve_l10n_args() {
  const { resolveL10nArgs } = ChromeUtils.importESModule(LOOKUP_URL);

  const config = {
    dataL10nId: "test-l10n-id",
    dataL10nArgs: { hostname: null, otherArg: "static" },
  };

  const context = { hostname: "example.com" };
  const resolved = resolveL10nArgs(config, context);

  Assert.equal(resolved.dataL10nId, "test-l10n-id");
  Assert.equal(resolved.dataL10nArgs.hostname, "example.com");
  Assert.equal(resolved.dataL10nArgs.otherArg, "static");
});

add_task(async function test_resolve_l10n_args_null_input() {
  const { resolveL10nArgs } = ChromeUtils.importESModule(LOOKUP_URL);

  const resolved = resolveL10nArgs(null, { hostname: "example.com" });
  Assert.equal(resolved, null, "Null config should return null");
});

add_task(async function test_get_resolved_error_config() {
  const { registerError, _testOnlyClearRegistry } =
    ChromeUtils.importESModule(REGISTRY_URL);
  const { getResolvedErrorConfig } = ChromeUtils.importESModule(LOOKUP_URL);

  _testOnlyClearRegistry();

  registerError({
    id: "RESOLVE_TEST_ERROR",
    errorCode: "RESOLVE_TEST_ERROR",
    category: "cert",
    pageTitleL10nId: "test-title",
    bodyTitleL10nId: "test-body",
    introContent: {
      dataL10nId: "test-intro",
      dataL10nArgs: { hostname: null },
    },
    shortDescription: {
      dataL10nId: "test-short-desc",
      dataL10nArgs: { hostname: null },
    },
    buttons: {},
    hasNoUserFix: false,
  });

  const context = { hostname: "test.example.com" };
  const resolved = getResolvedErrorConfig("RESOLVE_TEST_ERROR", context);

  Assert.equal(resolved.errorCode, "RESOLVE_TEST_ERROR");
  Assert.equal(resolved.introContent.dataL10nArgs.hostname, "test.example.com");
  Assert.equal(
    resolved.shortDescription.dataL10nArgs.hostname,
    "test.example.com"
  );

  _testOnlyClearRegistry();
});

add_task(async function test_get_errors_by_category() {
  const { registerErrors, getErrorsByCategory, _testOnlyClearRegistry } =
    ChromeUtils.importESModule(REGISTRY_URL);

  _testOnlyClearRegistry();

  registerErrors([
    {
      id: "CERT_ERROR_1",
      errorCode: "CERT_ERROR_1",
      category: "cert",
      pageTitleL10nId: "t1",
      bodyTitleL10nId: "b1",
      buttons: {},
    },
    {
      id: "CERT_ERROR_2",
      errorCode: "CERT_ERROR_2",
      category: "cert",
      pageTitleL10nId: "t2",
      bodyTitleL10nId: "b2",
      buttons: {},
    },
    {
      id: "NET_ERROR_1",
      errorCode: "NET_ERROR_1",
      category: "net",
      pageTitleL10nId: "t3",
      bodyTitleL10nId: "b3",
      buttons: {},
    },
  ]);

  const certErrors = getErrorsByCategory("cert");
  const netErrors = getErrorsByCategory("net");

  Assert.equal(certErrors.length, 2, "Should have 2 cert errors");
  Assert.equal(netErrors.length, 1, "Should have 1 net error");

  _testOnlyClearRegistry();
});

add_task(async function test_is_felt_privacy_supported() {
  const { registerError, _testOnlyClearRegistry } =
    ChromeUtils.importESModule(REGISTRY_URL);
  const { isFeltPrivacySupported } = ChromeUtils.importESModule(LOOKUP_URL);

  _testOnlyClearRegistry();

  registerError({
    id: "FP_SUPPORTED_ERROR",
    errorCode: "FP_SUPPORTED_ERROR",
    category: "cert",
    pageTitleL10nId: "test-title",
    bodyTitleL10nId: "test-body",
    introContent: { id: "fp-intro" },
    buttons: {},
  });

  registerError({
    id: "fp-another-supported-error",
    category: "net",
    pageTitleL10nId: "test-title",
    bodyTitleL10nId: "test-body",
    buttons: {},
  });

  Assert.ok(
    isFeltPrivacySupported("FP_SUPPORTED_ERROR"),
    "Registered error should support Felt Privacy"
  );
  Assert.ok(
    isFeltPrivacySupported("fp-another-supported-error"),
    "All registered errors should support Felt Privacy"
  );
  Assert.ok(
    !isFeltPrivacySupported("NONEXISTENT_ERROR"),
    "Unregistered error should not support Felt Privacy"
  );

  _testOnlyClearRegistry();
});
