/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the langpack-shadow code paths in AboutNewTabResourceMapping.
 * When a train-hop newtab XPI is in use, AboutNewTabResourceMapping
 * registers a shadow L10nFileSource inside each active langpack's
 * metasource so that the (locale, langpack) bundle the Fluent solver
 * produces can resolve train-hop strings from the XPI's newtab.ftl. See
 * Bug 2046945.
 *
 * These tests exercise the shadow registration/unregistration paths
 * directly, without bringing up a real train-hop XPI or langpack add-on —
 * the bundle-resolution side of the fix is exercised by the L10nRegistry
 * solver tests, and a separate browser test covers the full
 * about:newtab end-to-end behavior.
 */

"use strict";

/* import-globals-from ../../../../extensions/newtab/test/xpcshell/head.js */

const { AboutNewTabResourceMapping } = ChromeUtils.importESModule(
  "resource:///modules/AboutNewTabResourceMapping.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const TOPIC_LANGPACK_STARTUP = "webextension-langpack-startup";
const TOPIC_LANGPACK_SHUTDOWN = "webextension-langpack-shutdown";

const FAKE_LANGPACK_ID = "langpack-test-browser";
const SHADOW_SOURCE_NAME = `newtab-${FAKE_LANGPACK_ID}`;

/**
 * The shadow-source code paths in AboutNewTabResourceMapping are normally
 * initialized by registerFluentSources, which only runs when a train-hop
 * XPI is active. The xpcshell tests run against the built-in newtab, so we
 * populate the state directly and register the observers ourselves.
 */
add_setup(function setUpResourceMappingForShadowTests() {
  AboutNewTabResourceMapping._supportedLocales = new Set(["en-US"]);
  AboutNewTabResourceMapping._langpackShadowSources = new Set();
  Services.obs.addObserver(AboutNewTabResourceMapping, TOPIC_LANGPACK_STARTUP);
  Services.obs.addObserver(AboutNewTabResourceMapping, TOPIC_LANGPACK_SHUTDOWN);

  registerCleanupFunction(() => {
    Services.obs.removeObserver(
      AboutNewTabResourceMapping,
      TOPIC_LANGPACK_STARTUP
    );
    Services.obs.removeObserver(
      AboutNewTabResourceMapping,
      TOPIC_LANGPACK_SHUTDOWN
    );
    for (const id of AboutNewTabResourceMapping._langpackShadowSources) {
      L10nRegistry.getInstance().removeSources([`newtab-${id}`]);
    }
    AboutNewTabResourceMapping._langpackShadowSources = null;
    AboutNewTabResourceMapping._supportedLocales = null;
  });
});

/**
 * _registerLangpackShadow should add a source named `newtab-${langpackId}`
 * into the L10nRegistry, track it in _langpackShadowSources, and be a no-op
 * on a second call with the same id.
 */
add_task(async function test_registerLangpackShadow_adds_source() {
  const registry = L10nRegistry.getInstance();

  Assert.ok(
    !registry.hasSource(SHADOW_SOURCE_NAME),
    "Shadow source is not registered before _registerLangpackShadow"
  );
  Assert.ok(
    !AboutNewTabResourceMapping._langpackShadowSources.has(FAKE_LANGPACK_ID),
    "Internal tracking does not yet include the langpack id"
  );

  AboutNewTabResourceMapping._registerLangpackShadow(FAKE_LANGPACK_ID);

  Assert.ok(
    registry.hasSource(SHADOW_SOURCE_NAME),
    "Shadow source is registered in the L10nRegistry"
  );
  Assert.ok(
    AboutNewTabResourceMapping._langpackShadowSources.has(FAKE_LANGPACK_ID),
    "Internal tracking now includes the langpack id"
  );

  // Idempotency.
  AboutNewTabResourceMapping._registerLangpackShadow(FAKE_LANGPACK_ID);
  Assert.equal(
    AboutNewTabResourceMapping._langpackShadowSources.size,
    1,
    "Re-registering the same langpack id does not create duplicates"
  );

  // Clean up so the next test starts from a clean slate.
  AboutNewTabResourceMapping._unregisterLangpackShadow(FAKE_LANGPACK_ID);
});

/**
 * _unregisterLangpackShadow should remove the source from the L10nRegistry,
 * untrack it from _langpackShadowSources, and be a no-op on a second call.
 */
add_task(async function test_unregisterLangpackShadow_removes_source() {
  const registry = L10nRegistry.getInstance();

  AboutNewTabResourceMapping._registerLangpackShadow(FAKE_LANGPACK_ID);
  Assert.ok(
    registry.hasSource(SHADOW_SOURCE_NAME),
    "Sanity: shadow source registered"
  );

  AboutNewTabResourceMapping._unregisterLangpackShadow(FAKE_LANGPACK_ID);

  Assert.ok(
    !registry.hasSource(SHADOW_SOURCE_NAME),
    "Shadow source is removed from the L10nRegistry"
  );
  Assert.ok(
    !AboutNewTabResourceMapping._langpackShadowSources.has(FAKE_LANGPACK_ID),
    "Internal tracking no longer includes the langpack id"
  );

  // Idempotency.
  AboutNewTabResourceMapping._unregisterLangpackShadow(FAKE_LANGPACK_ID);
  Assert.equal(
    AboutNewTabResourceMapping._langpackShadowSources.size,
    0,
    "Re-unregistering the same langpack id is a no-op"
  );
});

/**
 * Firing webextension-langpack-startup with a Langpack-shaped subject
 * should cause AboutNewTabResourceMapping.observe to register a shadow
 * for the langpack's metasource id.
 */
add_task(async function test_startup_observer_registers_shadow() {
  const registry = L10nRegistry.getInstance();

  Assert.ok(
    !registry.hasSource(SHADOW_SOURCE_NAME),
    "Shadow source is not registered before the observer notification"
  );

  Services.obs.notifyObservers(
    {
      wrappedJSObject: {
        langpack: { langpackId: FAKE_LANGPACK_ID },
      },
    },
    TOPIC_LANGPACK_STARTUP
  );

  Assert.ok(
    registry.hasSource(SHADOW_SOURCE_NAME),
    "Shadow source registered after webextension-langpack-startup"
  );
  Assert.ok(
    AboutNewTabResourceMapping._langpackShadowSources.has(FAKE_LANGPACK_ID),
    "Internal tracking includes the langpack id after startup notification"
  );

  AboutNewTabResourceMapping._unregisterLangpackShadow(FAKE_LANGPACK_ID);
});

/**
 * Firing webextension-langpack-shutdown with a Langpack-shaped subject
 * should cause AboutNewTabResourceMapping.observe to remove the previously
 * registered shadow.
 */
add_task(async function test_shutdown_observer_removes_shadow() {
  const registry = L10nRegistry.getInstance();

  AboutNewTabResourceMapping._registerLangpackShadow(FAKE_LANGPACK_ID);
  Assert.ok(
    registry.hasSource(SHADOW_SOURCE_NAME),
    "Sanity: shadow registered"
  );

  Services.obs.notifyObservers(
    {
      wrappedJSObject: {
        langpack: { langpackId: FAKE_LANGPACK_ID },
      },
    },
    TOPIC_LANGPACK_SHUTDOWN
  );

  Assert.ok(
    !registry.hasSource(SHADOW_SOURCE_NAME),
    "Shadow source removed after webextension-langpack-shutdown"
  );
  Assert.ok(
    !AboutNewTabResourceMapping._langpackShadowSources.has(FAKE_LANGPACK_ID),
    "Internal tracking removes the langpack id after shutdown notification"
  );
});

/**
 * Re-entrancy guard test. observe() handlers call L10nRegistry methods,
 * which in production can synchronously fire intl:app-locales-changed
 * (and intl:l10n-sources-changed) again — without the guard, those
 * broadcasts re-enter observe and can proliferate catastrophically on
 * installations with downloaded langpacks. See Bug 2049845.
 */
add_task(async function test_observe_reentrancy_guard() {
  const sandbox = sinon.createSandbox();
  try {
    // Simulate the production cascade: an L10nRegistry mutation inside
    // the handler fires intl:app-locales-changed synchronously. If the
    // guard works, this inner notification's observe() call is a no-op
    // and the stub is called exactly once. Without the guard this
    // would recurse and overflow the stack.
    const updateFluentStub = sandbox
      .stub(AboutNewTabResourceMapping, "_updateFluentSourcesRegistration")
      .callsFake(() => {
        Services.obs.notifyObservers(null, "intl:app-locales-changed");
      });
    sandbox.stub(AboutNewTabResourceMapping, "_updateLangpackShadows");

    AboutNewTabResourceMapping.observe(null, "intl:app-locales-changed", null);

    Assert.equal(
      updateFluentStub.callCount,
      1,
      "Re-entrant observe() call during the handler is coalesced away"
    );
    Assert.equal(
      AboutNewTabResourceMapping._inObserveHandler,
      false,
      "_inObserveHandler is reset after the outer call returns"
    );
  } finally {
    sandbox.restore();
  }
});
