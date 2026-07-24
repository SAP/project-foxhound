/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { _ExperimentFeature: ExperimentFeature } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs"
);
const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);
const { PreferencesBackupResource } = ChromeUtils.importESModule(
  "resource:///modules/backup/PreferencesBackupResource.sys.mjs"
);

NimbusTestUtils.init(this);

const USER_TYPED_FEATURE = new ExperimentFeature("test-typed-prefs", {
  description: "Test feature that sets each type of pref",
  owner: "test@test.test",
  hasExposure: false,
  variables: {
    string: {
      type: "string",
      description: "test string variable",
      setPref: {
        branch: "user",
        pref: "nimbus-test.types.string",
      },
    },
    int: {
      type: "int",
      description: "test int variable",
      setPref: {
        branch: "user",
        pref: "nimbus-test.types.int",
      },
    },
    boolean: {
      type: "boolean",
      description: "test boolean variable",
      setPref: {
        branch: "user",
        pref: "nimbus-test.types.boolean",
      },
    },
    json: {
      type: "json",
      description: "test json variable",
      setPref: {
        branch: "user",
        pref: "nimbus-test.types.json",
      },
    },
  },
});

function getPrefsFromMap(prefs) {
  return prefs.map(([pref, value]) => {
    if (!Services.prefs.prefHasUserValue(pref)) {
      return [pref, undefined];
    }
    switch (typeof value) {
      case "boolean":
        return [pref, Services.prefs.getBoolPref(pref)];
      case "number":
        return [pref, Services.prefs.getIntPref(pref)];
      case "string":
        return [pref, Services.prefs.getStringPref(pref)];
      default:
        throw new Error("Unsupported pref type!");
    }
  });
}

function setPrefsFromMap(prefs) {
  for (let [pref, value] of prefs) {
    if (value === undefined) {
      Services.prefs.clearUserPref(pref);
      continue;
    }

    switch (typeof value) {
      case "boolean":
        Services.prefs.setBoolPref(pref, value);
        break;
      case "number":
        Services.prefs.setIntPref(pref, value);
        break;
      case "string":
        Services.prefs.setStringPref(pref, value);
        break;
      default:
        throw new Error("Unsupported pref type!");
    }
  }
}

const fakeNimbusTestPrefs = [
  ["nimbus-test.types.boolean", false],
  ["nimbus-test.types.int", 100],
  ["nimbus-test.types.string", "bar"],
  ["nimbus.all_prefs_with_nimbus._prefix_should_be_removed", "not serialized"],
];

// NB: Nimbus experiment setup is adapted from
// test_setPref_getOriginalPrefValuesForAllExperiments.
function initFakeNimbusExperimentPrefs() {
  const originalPrefs = getPrefsFromMap(fakeNimbusTestPrefs);
  setPrefsFromMap(fakeNimbusTestPrefs);
  return originalPrefs;
}

function uninitFakeNimbusExperimentPrefs(originalPrefs) {
  setPrefsFromMap(originalPrefs);
}

const jsonTestValue = {
  foo: "foo",
  bar: 12345,
  baz: true,
  qux: null,
  quux: ["corge"],
};

async function enrollFakeNimbusExperiment() {
  const featureCleanup = NimbusTestUtils.addTestFeatures(USER_TYPED_FEATURE);

  const { manager, cleanup } = await NimbusTestUtils.setupTest();

  const experimentCleanup = await NimbusTestUtils.enrollWithFeatureConfig(
    {
      featureId: USER_TYPED_FEATURE.featureId,
      value: {
        string: "hello, world",
        int: 12345,
        boolean: true,
        json: jsonTestValue,
      },
    },
    { manager }
  );

  return { featureCleanup, experimentCleanup, cleanup };
}

async function unenrollFakeNimbusExperiment({
  featureCleanup,
  experimentCleanup,
  cleanup,
}) {
  await experimentCleanup();
  featureCleanup();
  await cleanup();
}

function checkNimbusHasSetPrefs() {
  Assert.equal(
    Services.prefs.getPrefType("nimbus-test.types.string"),
    Services.prefs.PREF_STRING
  );
  Assert.equal(
    Services.prefs.getStringPref("nimbus-test.types.string"),
    "hello, world"
  );

  Assert.equal(
    Services.prefs.getPrefType("nimbus-test.types.int"),
    Services.prefs.PREF_INT
  );
  Assert.equal(Services.prefs.getIntPref("nimbus-test.types.int"), 12345);

  Assert.equal(
    Services.prefs.getPrefType("nimbus-test.types.boolean"),
    Services.prefs.PREF_BOOL
  );
  Assert.equal(Services.prefs.getBoolPref("nimbus-test.types.boolean"), true);

  Assert.equal(
    Services.prefs.getPrefType("nimbus-test.types.json"),
    Services.prefs.PREF_STRING
  );

  const parsedJson = JSON.parse(
    Services.prefs.getStringPref("nimbus-test.types.json")
  );

  Assert.deepEqual(jsonTestValue, parsedJson);
}

async function checkIgnoredBackupPrefs(backupPrefsFilePath) {
  let contents = (await IOUtils.readUTF8(backupPrefsFilePath))
    .split("\n")
    .map(line => line.trim());

  let checkPrefNotSerialized = pref => {
    Assert.ok(
      !contents.reduce((acc, line) => acc || line.includes(pref), false)
    );
  };

  checkPrefNotSerialized("browser.backup.");
}

async function checkBackupIgnoredNimbusPrefs(backupPrefsFilePath) {
  let contents = (await IOUtils.readUTF8(backupPrefsFilePath))
    .split("\n")
    .map(line => line.trim());

  Assert.ok(
    contents.includes('user_pref("nimbus-test.types.boolean", false);')
  );
  Assert.ok(contents.includes('user_pref("nimbus-test.types.int", 100);'));
  Assert.ok(contents.includes('user_pref("nimbus-test.types.string", "bar");'));

  let checkPrefNotSerialized = pref => {
    Assert.ok(
      !contents.reduce((acc, line) => acc || line.includes(pref), false)
    );
  };

  // nimbus-test.types.json had no prior value so it should not appear.
  checkPrefNotSerialized("nimbus-test.types.json");

  // nimbus metadata should not appear.
  checkPrefNotSerialized("app.normandy.user_id");
  checkPrefNotSerialized("toolkit.telemetry.cachedProfileGroupID");

  // Prefs that start with "nimbus." are assumed to be internal and should
  // not be included.
  checkPrefNotSerialized(
    "nimbus.all_prefs_with_nimbus._prefix_should_be_removed"
  );
}

async function performBackup() {
  let sandbox = sinon.createSandbox();

  let preferencesBackupResource = new PreferencesBackupResource();
  let sourcePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PreferencesBackupResource-source-test"
  );
  let stagingPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "PreferencesBackupResource-staging-test"
  );

  const simpleCopyFiles = [
    { path: "xulstore.json" },
    { path: "containers.json" },
    { path: "customKeys.json" },
    { path: "handlers.json" },
    { path: "search.json.mozlz4" },
    { path: "user.js" },
    { path: ["chrome", "userChrome.css"] },
    { path: ["chrome", "userContent.css"] },
    { path: ["chrome", "childFolder", "someOtherStylesheet.css"] },
  ];
  await createTestFiles(sourcePath, simpleCopyFiles);

  // Create our fake database files. We don't expect these to be copied to the
  // staging directory in this test due to our stubbing of the backup method, so
  // we don't include it in `simpleCopyFiles`.
  await createTestFiles(sourcePath, [
    { path: "permissions.sqlite" },
    { path: "content-prefs.sqlite" },
  ]);

  // We have no need to test that Sqlite.sys.mjs's backup method is working -
  // this is something that is tested in Sqlite's own tests. We can just make
  // sure that it's being called using sinon. Unfortunately, we cannot do the
  // same thing with IOUtils.copy, as its methods are not stubbable.
  let fakeConnection = {
    backup: sandbox.stub().resolves(true),
    close: sandbox.stub().resolves(true),
  };
  sandbox.stub(Sqlite, "openConnection").returns(fakeConnection);

  await preferencesBackupResource.backup(stagingPath, sourcePath);

  return { sandbox, stagingPath, sourcePath };
}

/**
 * Test that the backup method correctly serializes preference values that are
 * manipulated by Nimbus experiments.  Nimbus-set prefs should ignore the
 * Nimbus-set values.
 */
add_task(async function test_prefs_backup_does_not_backup_nimbus_prefs() {
  // Pre-set some nimbus-test.* prefs so they have originalValues that
  // should be backed up instead of the values Nimbus will set when we enroll
  // in the experiment.
  const originalPrefs = initFakeNimbusExperimentPrefs();
  const cleanup = await enrollFakeNimbusExperiment();
  checkNimbusHasSetPrefs();
  const { sandbox, stagingPath, sourcePath } = await performBackup();
  await checkBackupIgnoredNimbusPrefs(PathUtils.join(stagingPath, "prefs.js"));
  await checkIgnoredBackupPrefs(PathUtils.join(stagingPath, "prefs.js"));
  await maybeRemovePath(stagingPath);
  await maybeRemovePath(sourcePath);
  sandbox.restore();
  await unenrollFakeNimbusExperiment(cleanup);
  uninitFakeNimbusExperimentPrefs(originalPrefs);
});
