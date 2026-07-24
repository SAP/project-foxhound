/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

const { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);

const { AboutNewTabComponentRegistry } = ChromeUtils.importESModule(
  "moz-src:///browser/components/newtab/AboutNewTabComponents.sys.mjs"
);

const CATEGORY_NAME = "browser-newtab-external-component";

const originalCategoryEntries = [];

add_setup(() => {
  for (let { entry, value } of Services.catMan.enumerateCategory(
    CATEGORY_NAME
  )) {
    originalCategoryEntries.push({ entry, value });
  }
  Services.catMan.deleteCategory(CATEGORY_NAME);

  registerCleanupFunction(() => {
    Services.catMan.deleteCategory(CATEGORY_NAME);

    for (let { entry, value } of originalCategoryEntries) {
      Services.catMan.addCategoryEntry(
        CATEGORY_NAME,
        entry,
        value,
        false,
        true
      );
    }
  });
});

/**
 * Tests that the AboutNewTabComponentRegistry can be instantiated.
 */
add_task(async function test_registry_initializes() {
  let registry = new AboutNewTabComponentRegistry();
  Assert.ok(registry, "Registry should instantiate");
  registry.destroy();
});

/**
 * Tests that the registry loads component configurations from category entries
 * and fires an UPDATED_EVENT when components are registered.
 */
add_task(async function test_registry_loads_valid_configuration() {
  let updateEventFired = false;
  let registry = new AboutNewTabComponentRegistry();

  registry.on(AboutNewTabComponentRegistry.UPDATED_EVENT, () => {
    updateEventFired = true;
  });

  const testModuleURI = "resource://testing-common/TestRegistrant1.sys.mjs";

  Services.catMan.addCategoryEntry(
    CATEGORY_NAME,
    testModuleURI,
    "TestRegistrant1",
    false,
    true
  );

  await TestUtils.waitForCondition(
    () => updateEventFired,
    "Should fire updated event"
  );

  let components = Array.from(registry.values);
  Assert.equal(components.length, 1, "Should have one component registered");
  Assert.equal(components[0].type, "SEARCH", "Component type should be SEARCH");

  Services.catMan.deleteCategoryEntry(CATEGORY_NAME, testModuleURI, false);
  registry.destroy();
});

/**
 * Tests that the registry rejects duplicate component types and only
 * registers the first component when multiple registrants provide
 * components with the same type.
 */
add_task(async function test_registry_rejects_duplicate_types() {
  let registry = new AboutNewTabComponentRegistry();

  const testModuleURI =
    "resource://testing-common/TestRegistrantDuplicateTypes.sys.mjs";

  Services.catMan.addCategoryEntry(
    CATEGORY_NAME,
    testModuleURI,
    "TestRegistrantDuplicateTypes",
    false,
    true
  );

  await TestUtils.waitForTick();

  let components = Array.from(registry.values);
  Assert.equal(
    components.length,
    1,
    "Should only register one component when types conflict"
  );

  Services.catMan.deleteCategoryEntry(CATEGORY_NAME, testModuleURI, false);
  registry.destroy();
});

/**
 * Tests that the registry rejects component configurations that are missing
 * required fields like the type property.
 */
add_task(async function test_registry_rejects_invalid_configurations() {
  let registry = new AboutNewTabComponentRegistry();

  const testModuleURI =
    "resource://testing-common/TestRegistrantInvalidConfigs.sys.mjs";

  Services.catMan.addCategoryEntry(
    CATEGORY_NAME,
    testModuleURI,
    "TestRegistrantInvalidConfigs",
    false,
    true
  );

  await TestUtils.waitForTick();

  let components = Array.from(registry.values);
  Assert.equal(
    components.length,
    0,
    "Should reject configurations without valid type"
  );

  Services.catMan.deleteCategoryEntry(CATEGORY_NAME, testModuleURI, false);
  registry.destroy();
});

/**
 * Tests that the registry properly handles category entry removal by
 * unregistering components and firing an UPDATED_EVENT.
 */
add_task(async function test_registry_handles_category_removal() {
  let updateCount = 0;
  let registry = new AboutNewTabComponentRegistry();

  registry.on(AboutNewTabComponentRegistry.UPDATED_EVENT, () => {
    updateCount++;
  });

  const testModuleURI = "resource://testing-common/TestRegistrant1.sys.mjs";

  Services.catMan.addCategoryEntry(
    CATEGORY_NAME,
    testModuleURI,
    "TestRegistrant1",
    false,
    true
  );

  await TestUtils.waitForCondition(() => updateCount >= 1);

  const initialUpdateCount = updateCount;
  let components = Array.from(registry.values);
  Assert.equal(components.length, 1, "Should have component registered");

  Services.catMan.deleteCategoryEntry(CATEGORY_NAME, testModuleURI, false);

  await TestUtils.waitForCondition(() => updateCount > initialUpdateCount);

  components = Array.from(registry.values);
  Assert.equal(components.length, 0, "Should have no components after removal");

  registry.destroy();
});

/**
 * Tests that the registry responds to registrant updates by refreshing
 * its component list and firing update events.
 */
add_task(async function test_registry_handles_registrant_updates() {
  let registry = new AboutNewTabComponentRegistry();
  let updateCount = 0;

  registry.on(AboutNewTabComponentRegistry.UPDATED_EVENT, () => {
    updateCount++;
  });

  const testModuleURI = "resource://testing-common/TestRegistrant1.sys.mjs";

  Services.catMan.addCategoryEntry(
    CATEGORY_NAME,
    testModuleURI,
    "TestRegistrant1",
    false,
    true
  );

  await TestUtils.waitForCondition(() => updateCount >= 1);

  let components = Array.from(registry.values);
  Assert.equal(components.length, 1, "Should have initial component");
  Assert.equal(components[0].type, "SEARCH", "Initial type should be SEARCH");

  Services.catMan.deleteCategoryEntry(CATEGORY_NAME, testModuleURI, false);
  registry.destroy();
});

/**
 * Tests that calling destroy() on the registry properly cleans up all
 * registered components and internal state.
 */
add_task(async function test_registry_cleanup_on_destroy() {
  let registry = new AboutNewTabComponentRegistry();

  const testModuleURI = "resource://testing-common/TestRegistrant1.sys.mjs";

  Services.catMan.addCategoryEntry(
    CATEGORY_NAME,
    testModuleURI,
    "TestRegistrant1",
    false,
    true
  );

  await TestUtils.waitForTick();

  registry.destroy();

  let components = Array.from(registry.values);
  Assert.equal(components.length, 0, "Should have no components after destroy");

  Services.catMan.deleteCategoryEntry(CATEGORY_NAME, testModuleURI, false);
});

/**
 * Tests that the registry validates registrants are instances of
 * BaseAboutNewTabComponentRegistrant and rejects invalid registrants.
 */
add_task(async function test_registrant_subclass_validation() {
  let registry = new AboutNewTabComponentRegistry();

  const invalidModuleURI = "resource://testing-common/NotARegistrant.sys.mjs";

  Services.catMan.addCategoryEntry(
    CATEGORY_NAME,
    invalidModuleURI,
    "NotARegistrant",
    false,
    true
  );

  await TestUtils.waitForTick();

  let components = Array.from(registry.values);
  Assert.equal(
    components.length,
    0,
    "Should reject registrant that doesn't subclass BaseAboutNewTabComponentRegistrant"
  );

  Services.catMan.deleteCategoryEntry(CATEGORY_NAME, invalidModuleURI, false);
  registry.destroy();
});

/**
 * Tests that the registry can handle multiple registrants providing
 * different component types simultaneously.
 */
add_task(async function test_multiple_registrants() {
  let registry = new AboutNewTabComponentRegistry();

  const testModule1URI = "resource://testing-common/TestRegistrant1.sys.mjs";
  const testModule2URI = "resource://testing-common/TestRegistrant2.sys.mjs";

  Services.catMan.addCategoryEntry(
    CATEGORY_NAME,
    testModule1URI,
    "TestRegistrant1",
    false,
    true
  );

  Services.catMan.addCategoryEntry(
    CATEGORY_NAME,
    testModule2URI,
    "TestRegistrant2",
    false,
    true
  );

  await TestUtils.waitForTick();

  let components = Array.from(registry.values);
  Assert.equal(
    components.length,
    2,
    "Should register components from multiple registrants"
  );

  let types = components.map(c => c.type).sort();
  Assert.deepEqual(
    types,
    ["OTHER", "SEARCH"],
    "Should have both component types"
  );

  Services.catMan.deleteCategoryEntry(CATEGORY_NAME, testModule1URI, false);
  Services.catMan.deleteCategoryEntry(CATEGORY_NAME, testModule2URI, false);
  registry.destroy();
});
