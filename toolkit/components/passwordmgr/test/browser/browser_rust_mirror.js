/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 *
 * Tests the AS RustLogins write-only mirror
 */
("use strict");

const { LoginManagerRustStorage } = ChromeUtils.importESModule(
  "resource://gre/modules/storage-rust.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);
const { LoginCSVImport } = ChromeUtils.importESModule(
  "resource://gre/modules/LoginCSVImport.sys.mjs"
);

add_setup(async function () {
  registerCleanupFunction(async function () {
    SpecialPowers.clearUserPref("signon.rustMirror.migrationNeeded");
    SpecialPowers.clearUserPref("signon.rustMirror.poisoned");
  });
});

/**
 * Tests addLogin gets synced to Rust Storage
 */
add_task(async function test_mirror_addLogin() {
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });

  const loginInfo = LoginTestUtils.testData.formLogin({
    username: "username",
    password: "password",
  });
  const addLoginFinishedPromise = TestUtils.topicObserved(
    "rust-mirror.event.addLogin.finished"
  );
  await Services.logins.addLoginAsync(loginInfo);
  await addLoginFinishedPromise;

  // note LoginManagerRustStorage is a singleton and already initialized when
  // Services.logins gets initialized.
  const rustStorage = new LoginManagerRustStorage();
  const storedLoginInfos = await Services.logins.getAllLogins();
  const rustStoredLoginInfos = await rustStorage.getAllLogins();
  LoginTestUtils.assertLoginListsEqual(storedLoginInfos, rustStoredLoginInfos);

  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/**
 * Tests modifyLogin gets synced to Rust Storage
 */
add_task(async function test_mirror_modifyLogin() {
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });

  const loginInfo = LoginTestUtils.testData.formLogin({
    username: "username",
    password: "password",
  });
  const addLoginFinishedPromise = TestUtils.topicObserved(
    "rust-mirror.event.addLogin.finished"
  );
  await Services.logins.addLoginAsync(loginInfo);
  await addLoginFinishedPromise;

  const [storedLoginInfo] = await Services.logins.getAllLogins();

  const modifiedLoginInfo = LoginTestUtils.testData.formLogin({
    username: "username",
    password: "password",
    usernameField: "new_form_field_username",
    passwordField: "new_form_field_password",
  });
  const modifyLoginFinishedPromise = TestUtils.topicObserved(
    "rust-mirror.event.modifyLogin.finished"
  );
  await Services.logins.modifyLoginAsync(storedLoginInfo, modifiedLoginInfo);
  await modifyLoginFinishedPromise;

  const rustStorage = new LoginManagerRustStorage();
  const [storedModifiedLoginInfo] = await Services.logins.getAllLogins();
  const [rustStoredModifiedLoginInfo] = await rustStorage.searchLoginsAsync({
    guid: storedLoginInfo.guid,
  });
  LoginTestUtils.assertLoginListsEqual(
    [storedModifiedLoginInfo],
    [rustStoredModifiedLoginInfo]
  );

  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/**
 * Tests removeLogin gets synced to Rust Storage
 */
add_task(async function test_mirror_removeLogin() {
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });

  const loginInfo = LoginTestUtils.testData.formLogin({
    username: "username",
    password: "password",
  });
  const addLoginFinishedPromise = TestUtils.topicObserved(
    "rust-mirror.event.addLogin.finished"
  );
  await Services.logins.addLoginAsync(loginInfo);
  await addLoginFinishedPromise;

  const [storedLoginInfo] = await Services.logins.getAllLogins();
  const removeLoginFinishedPromise = TestUtils.topicObserved(
    "rust-mirror.event.removeLogin.finished"
  );
  await Services.logins.removeLoginAsync(storedLoginInfo);
  await removeLoginFinishedPromise;

  const rustStorage = new LoginManagerRustStorage();
  const allLogins = await rustStorage.getAllLogins();
  Assert.equal(allLogins.length, 0);

  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/**
 * Tests CSV import: addition gets synced to Rust Storage
 */
add_task(async function test_mirror_csv_import_add() {
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });

  let csvFile = await LoginTestUtils.file.setupCsvFileWithLines([
    "url,username,password,httpRealm,formActionOrigin,guid,timeCreated,timeLastUsed,timePasswordChanged",
    `https://example.com,joe@example.com,qwerty,My realm,,{5ec0d12f-e194-4279-ae1b-d7d281bb46f0},1589617814635,1589710449871,1589617846802`,
  ]);
  const importLoginsFinishedPromise = TestUtils.topicObserved(
    "rust-mirror.event.importLogins.finished"
  );
  await LoginCSVImport.importFromCSV(csvFile.path);
  // wait for the mirror to complete
  await importLoginsFinishedPromise;

  const rustStorage = new LoginManagerRustStorage();
  const storedLoginInfos = await Services.logins.getAllLogins();
  const rustStoredLoginInfos = await rustStorage.getAllLogins();
  LoginTestUtils.assertLoginListsEqual(storedLoginInfos, rustStoredLoginInfos);

  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/**
 * Tests CSV import: modification gets synced to Rust Storage
 */
add_task(async function test_mirror_csv_import_modify() {
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });

  // create a login
  const loginInfo = LoginTestUtils.testData.formLogin({
    origin: "https://example.com",
    username: "username",
    password: "password",
  });
  const addLoginFinishedPromise = TestUtils.topicObserved(
    "rust-mirror.event.addLogin.finished"
  );
  const login = await Services.logins.addLoginAsync(loginInfo);
  await addLoginFinishedPromise;

  // and import it, so we update
  let csvFile = await LoginTestUtils.file.setupCsvFileWithLines([
    "url,username,password,httpRealm,formActionOrigin,guid,timeCreated,timeLastUsed,timePasswordChanged",
    `https://example.com,username,qwerty,My realm,,${login.guid},1589617814635,1589710449871,1589617846802`,
  ]);
  const importLoginsFinishedPromise = TestUtils.topicObserved(
    "rust-mirror.event.importLogins.finished"
  );
  await LoginCSVImport.importFromCSV(csvFile.path);
  // wait for the mirror to complete
  await importLoginsFinishedPromise;

  const rustStorage = new LoginManagerRustStorage();
  const [storedLoginInfo] = await Services.logins.getAllLogins();
  const [rustStoredLoginInfo] = await rustStorage.getAllLogins();
  Assert.equal(
    storedLoginInfo.password,
    rustStoredLoginInfo.password,
    "password has been updated via csv import"
  );

  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/**
 * Verifies that the migration is triggered by according pref change
 */
add_task(async function test_migration_is_triggered_by_pref_change() {
  // enable rust mirror, triggering migration
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", false]],
  });

  Assert.equal(
    Services.prefs.getBoolPref("signon.rustMirror.migrationNeeded", false),
    true,
    "migrationNeeded is set to true"
  );

  const prefChangePromise = TestUtils.waitForPrefChange(
    "signon.rustMirror.migrationNeeded"
  );

  // enable rust mirror, triggering migration
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });

  await prefChangePromise;
  Assert.equal(
    Services.prefs.getBoolPref("signon.rustMirror.migrationNeeded", false),
    false,
    "migrationNeeded is set to false"
  );

  await SpecialPowers.flushPrefEnv();
});

/**
 * Verifies that the migration is idempotent by ensuring that running
 * it multiple times does not create duplicate logins in the Rust store.
 */
add_task(async function test_migration_is_idempotent() {
  // ensure mirror is on
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });

  const login = LoginTestUtils.testData.formLogin({
    username: "test-user",
    password: "secure-password",
  });
  const addLoginFinishedPromise = TestUtils.topicObserved(
    "rust-mirror.event.addLogin.finished"
  );
  await Services.logins.addLoginAsync(login);
  await addLoginFinishedPromise;

  const rustStorage = new LoginManagerRustStorage();
  let rustLogins = await rustStorage.getAllLogins();
  Assert.equal(
    rustLogins.length,
    1,
    "Rust store contains login after first migration"
  );

  // trigger again
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", false]],
  });
  const migrationFinishedPromise = TestUtils.topicObserved(
    "rust-mirror.migration.finished"
  );
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });
  await migrationFinishedPromise;

  rustLogins = await rustStorage.getAllLogins();
  Assert.equal(rustLogins.length, 1, "No duplicate after second migration");

  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/**
 * Verify that the migration:
 *  - continues when some rows fail (partial failure),
 *  - still migrates valid logins,
 */
add_task(async function test_migration_partial_failure() {
  // ensure mirror is off
  await SpecialPowers.pushPrefEnv({
    set: [
      ["signon.rustMirror.enabled", false],
      ["signon.rustMirror.poisoned", false],
    ],
  });

  const rustStorage = new LoginManagerRustStorage();
  // Save the first (valid) login into Rust for real, then simulate results
  sinon
    .stub(LoginManagerRustStorage.prototype, "addLoginsAsync")
    .callsFake(async (logins, _cont) => {
      await rustStorage.addWithMeta(logins[0]);
      return [
        { login: {}, error: null }, // row 0 success
        { login: null, error: { message: "row failed" } }, // row 1 failure
      ];
    });

  const login_ok = LoginTestUtils.testData.formLogin({
    username: "test-user-ok",
    password: "secure-password",
  });
  await Services.logins.addLoginAsync(login_ok);
  const login_bad = LoginTestUtils.testData.formLogin({
    username: "test-user-bad",
    password: "secure-password",
  });
  await Services.logins.addLoginAsync(login_bad);

  // trigger again
  const migrationFinishedPromise = TestUtils.topicObserved(
    "rust-mirror.migration.finished"
  );
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });
  await migrationFinishedPromise;

  const rustLogins = await rustStorage.getAllLogins();
  Assert.equal(rustLogins.length, 1, "only valid login migrated");

  Assert.equal(
    Services.prefs.getBoolPref("signon.rustMirror.poisoned", false),
    true,
    "poisoned pref is set to true on partial migration failure"
  );

  sinon.restore();
  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/**
 * Verify that when the bulk add operation rejects (hard failure),
 * the migration itself rejects.
 */
add_task(async function test_migration_rejects_when_bulk_add_rejects() {
  // turn mirror off
  await SpecialPowers.pushPrefEnv({
    set: [
      ["signon.rustMirror.enabled", false],
      ["signon.rustMirror.poisoned", false],
    ],
  });

  const rustStorage = new LoginManagerRustStorage();
  // force the bulk add to fail
  sinon.stub(rustStorage, "addLoginsAsync").rejects(new Error("bulk failed"));

  const login = LoginTestUtils.testData.formLogin({
    username: "test-user",
    password: "secure-password",
  });
  await Services.logins.addLoginAsync(login);

  // trigger again
  const migrationFinishedPromise = TestUtils.topicObserved(
    "rust-mirror.migration.finished"
  );
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });
  await migrationFinishedPromise;

  const rustLogins = await rustStorage.getAllLogins();
  Assert.equal(rustLogins.length, 0, "zero logins migrated");

  const newPrefValue = Services.prefs.getBoolPref(
    "signon.rustMirror.migrationNeeded",
    false
  );
  Assert.equal(newPrefValue, true, "pref has not been reset");

  Assert.equal(
    Services.prefs.getBoolPref("signon.rustMirror.poisoned", false),
    true,
    "poisoned pref is set to true on hard migration failure"
  );

  sinon.restore();
  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/**
 * Tests that rust_migration_failure events are recorded
 * when a migration run encounters entry errors.
 */
add_task(async function test_rust_migration_failure_event() {
  // ensure mirror is off first
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", false]],
  });

  Services.fog.testResetFOG();

  const rustStorage = new LoginManagerRustStorage();

  // Stub addLoginsAsync to simulate a failure for one entry
  sinon
    .stub(rustStorage, "addLoginsAsync")
    .callsFake(async (_logins, _cont) => {
      return [
        { login: {}, error: null }, // success
        { login: null, error: { message: "simulated migration failure" } }, // failure
      ];
    });

  // Add two logins to JSON so migration has something to work on
  const login_ok = LoginTestUtils.testData.formLogin({
    username: "ok-user",
    password: "secure-password",
  });
  await Services.logins.addLoginAsync(login_ok);

  const login_bad = LoginTestUtils.testData.formLogin({
    username: "bad-user",
    password: "secure-password",
  });
  await Services.logins.addLoginAsync(login_bad);

  const waitForGleanEvent = BrowserTestUtils.waitForCondition(
    () => Glean.pwmgr.rustWriteFailure.testGetValue()?.length == 1,
    "event has been emitted"
  );

  // Trigger migration
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });

  await waitForGleanEvent;

  const [evt] = Glean.pwmgr.rustWriteFailure.testGetValue();
  Assert.ok(evt.extra?.run_id, "event has a run_id");
  Assert.equal(
    evt.extra?.error_message,
    "simulated migration failure",
    "event has the expected error message"
  );

  sinon.restore();
  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/**
 * Ensures that migrating a large number of logins (100) from the JSON store to
 * the Rust store completes within a reasonable time frame (under 1 second).
 */
add_task(async function test_migration_time_under_threshold() {
  // ensure mirror is off
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", false]],
  });

  const numberOfLogins = 100;

  const logins = Array.from({ length: numberOfLogins }, (_, i) =>
    LoginTestUtils.testData.formLogin({
      origin: `https://www${i}.example.com`,
      username: `user${i}`,
    })
  );
  await Services.logins.addLogins(logins);
  await LoginTestUtils.reloadData();

  const rustStorage = new LoginManagerRustStorage();

  const start = Date.now();
  // using the migrationNeeded pref change as an indicator that the migration did run
  const prefChangePromise = TestUtils.waitForPrefChange(
    "signon.rustMirror.migrationNeeded"
  );
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });
  await prefChangePromise;

  const duration = Date.now() - start;
  Assert.less(duration, 2000, "Migration should complete under 2s");
  Assert.equal(rustStorage.countLogins("", "", ""), numberOfLogins);

  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/*
 * Tests that an error is logged when adding an invalid login to the Rust store.
 * The Rust store is stricter than the JSON store and rejects some formats,
 * such as single-dot origins.
 */
add_task(async function test_rust_mirror_addLogin_failure() {
  // ensure mirror is on, and reset poisoned flag
  await SpecialPowers.pushPrefEnv({
    set: [
      ["signon.rustMirror.enabled", true],
      ["signon.rustMirror.poisoned", false],
    ],
  });
  Services.fog.testResetFOG();
  const waitForGleanEvent = BrowserTestUtils.waitForCondition(
    () => Glean.pwmgr.rustMirrorStatus.testGetValue()?.length == 1,
    "rust_mirror_status event has been emitted"
  );

  // This login will be accepted by JSON but rejected by Rust
  const badLogin = LoginTestUtils.testData.formLogin({
    origin: ".",
    passwordField: ".",
  });

  await Services.logins.addLoginAsync(badLogin);
  const allLoginsJson = await Services.logins.getAllLogins();
  Assert.equal(
    allLoginsJson.length,
    1,
    "single dot origin login saved to JSON"
  );

  await waitForGleanEvent;

  const rustStorage = new LoginManagerRustStorage();
  const allLogins = await rustStorage.getAllLogins();
  Assert.equal(
    allLogins.length,
    0,
    "single dot origin login not saved to Rust"
  );

  const [evt] = Glean.pwmgr.rustMirrorStatus.testGetValue();
  Assert.equal(
    evt.extra?.operation,
    "add",
    "rust_mirror_status event has operation"
  );
  Assert.equal(
    evt.extra?.status,
    "failure",
    "rust_mirror_status event has status=failure"
  );

  const [evt1] = Glean.pwmgr.rustWriteFailure.testGetValue();
  Assert.equal(
    evt1.extra?.error_message,
    "Login has illegal origin: relative URL without a base",
    "event has error_message"
  );
  Assert.equal(
    evt1.extra?.poisoned,
    "false",
    "rust_write_failure event is not poisoned"
  );

  // produce another failure
  const waitForSecondGleanEvent = BrowserTestUtils.waitForCondition(
    () => Glean.pwmgr.rustMirrorStatus.testGetValue()?.length == 2,
    "two events have been emitted"
  );
  const badLogin2 = LoginTestUtils.testData.formLogin({
    username: "another-bad-login",
    origin: ".",
    passwordField: ".",
  });
  await Services.logins.addLoginAsync(badLogin2);

  await waitForSecondGleanEvent;

  // eslint-disable-next-line no-unused-vars
  const [_, evt3] = Glean.pwmgr.rustWriteFailure.testGetValue();
  Assert.equal(
    evt3.extra?.poisoned,
    "true",
    "rust_write_failure event is poisoned now"
  );

  LoginTestUtils.clearData();
  await SpecialPowers.flushPrefEnv();
});

/*
 * Tests that we store non-ASCII origins get punycoded.
 */
add_task(async function test_punycode_origin_metric() {
  // ensure mirror is on
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });

  Services.fog.testResetFOG();

  const punicodeOrigin = "https://münich.example.com";
  const login = LoginTestUtils.testData.formLogin({
    origin: punicodeOrigin,
    formActionOrigin: "https://example.com",
    username: "user1",
    password: "pass1",
  });

  const waitForGleanEvent = BrowserTestUtils.waitForCondition(
    () => Glean.pwmgr.rustMirrorStatus.testGetValue()?.length == 1,
    "event has been emitted"
  );

  await Services.logins.addLoginAsync(login);

  await waitForGleanEvent;

  const rustStorage = new LoginManagerRustStorage();

  const allLogins = await rustStorage.getAllLogins();
  Assert.equal(allLogins.length, 1, "punicode origin login saved to Rust");
  const [rustLogin] = allLogins;
  Assert.equal(
    rustLogin.origin,
    "https://xn--mnich-kva.example.com",
    "origin has been punicoded on the Rust side"
  );

  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/*
 * Tests that we store non-ASCII formorigins get punycoded.
 */
add_task(async function test_punycode_formActionOrigin_metric() {
  // ensure mirror is on
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });

  Services.fog.testResetFOG();

  const punicodeOrigin = "https://münich.example.com";
  const login = LoginTestUtils.testData.formLogin({
    formActionOrigin: punicodeOrigin,
    origin: "https://example.com",
    username: "user1",
    password: "pass1",
  });

  const waitForGleanEvent = BrowserTestUtils.waitForCondition(
    () => Glean.pwmgr.rustMirrorStatus.testGetValue()?.length == 1,
    "event has been emitted"
  );

  await Services.logins.addLoginAsync(login);

  await waitForGleanEvent;

  const rustStorage = new LoginManagerRustStorage();
  const allLogins = await rustStorage.getAllLogins();
  Assert.equal(allLogins.length, 1, "punicode origin login saved to Rust");
  const [rustLogin] = allLogins;
  Assert.equal(
    rustLogin.formActionOrigin,
    "https://xn--mnich-kva.example.com",
    "origin has been punicoded on the Rust side"
  );

  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/*
 * Tests that we collect telemetry about several origin errors
 */
const originsToTest = {
  "//example.com": "MissingProtocol",
  "//example.com/path": "MissingProtocol",
  "example.com": "MissingProtocol",
  "example.com/path": "MissingProtocol",
  "hptts//example.com": "ProtocolTypo",
  "htp//example.com": "ProtocolTypo",
  "htpps//example.com": "ProtocolTypo",
  "http//example.com": "ProtocolTypo",
  "http//example.com/path": "ProtocolTypo",
  https: "ProtocolNameOnly",
  "https//example.com": "ProtocolTypo",
  "https//example.com:abc": "MissingProtocol",
  "https:": "ProtocolFragmentOnly",
  "https:// example.com": "UnknownError",
  "https://": "ProtocolOnly",
  "https:///": "UnknownError",
  "https://exa mple.com": "UnknownError",
  "htttp//example.com": "ProtocolTypo",
  "www.example.com": "MissingProtocol",
};
for (const origin in originsToTest) {
  add_task(async function () {
    // ensure mirror is on
    await SpecialPowers.pushPrefEnv({
      set: [["signon.rustMirror.enabled", true]],
    });

    Services.fog.testResetFOG();

    const login = LoginTestUtils.testData.formLogin({
      origin,
      formActionOrigin: "https://example.com",
      username: "user1",
      password: "pass1",
    });

    const waitForGleanEvent = BrowserTestUtils.waitForCondition(
      () => Glean.pwmgr.rustMirrorStatus.testGetValue()?.length == 1,
      "event has been emitted"
    );
    await Services.logins.addLoginAsync(login);
    await waitForGleanEvent;

    const [evt] = Glean.pwmgr.rustWriteFailure.testGetValue();
    Assert.equal(evt.extra?.origin_error, originsToTest[origin]);

    LoginTestUtils.clearData();
    await SpecialPowers.flushPrefEnv();
  });
}

/*
 * Tests that we collect telemetry if the username contains line breaks.
 */
add_task(async function test_username_linebreak_metric() {
  // ensure mirror is on
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });

  Services.fog.testResetFOG();

  const login = LoginTestUtils.testData.formLogin({
    origin: "https://example.com",
    formActionOrigin: "https://example.com",
    username: "user\nname",
    password: "pass1",
  });

  const waitForGleanEvent = BrowserTestUtils.waitForCondition(
    () => Glean.pwmgr.rustMirrorStatus.testGetValue()?.length == 1,
    "event has been emitted"
  );
  await Services.logins.addLoginAsync(login);
  await waitForGleanEvent;
  const rustStorage = new LoginManagerRustStorage();
  const allLogins = await rustStorage.getAllLogins();
  Assert.equal(
    allLogins.length,
    1,
    "line break username origin login saved to Rust"
  );

  LoginTestUtils.clearData();
  await rustStorage.removeAllLoginsAsync();
  await SpecialPowers.flushPrefEnv();
});

/*
 * Tests that an error is logged when adding an invalid login to the Rust store,
 * and that time_created and time_last_used telemetry is recorded on failure.
 */
add_task(async function test_rust_mirror_addLogin_failure_with_time_metrics() {
  // ensure mirror is on, and reset poisoned flag
  await SpecialPowers.pushPrefEnv({
    set: [
      ["signon.rustMirror.enabled", true],
      ["signon.rustMirror.poisoned", false],
    ],
  });
  Services.fog.testResetFOG();

  const waitForGleanEvent = BrowserTestUtils.waitForCondition(
    () => Glean.pwmgr.rustMirrorStatus.testGetValue()?.length == 1,
    "rust_mirror_status event has been emitted"
  );

  // This login will be accepted by JSON but rejected by Rust
  const badLogin = LoginTestUtils.testData.formLogin({
    origin: ".",
    passwordField: ".",
  });

  await Services.logins.addLoginAsync(badLogin);
  const allLoginsJson = await Services.logins.getAllLogins();
  Assert.equal(
    allLoginsJson.length,
    1,
    "single dot origin login saved to JSON"
  );

  await waitForGleanEvent;

  const rustStorage = new LoginManagerRustStorage();
  const allLogins = await rustStorage.getAllLogins();
  Assert.equal(
    allLogins.length,
    0,
    "single dot origin login not saved to Rust"
  );

  const [statusEvt] = Glean.pwmgr.rustMirrorStatus.testGetValue();
  Assert.equal(
    statusEvt.extra?.operation,
    "add",
    "rust_mirror_status event has operation"
  );
  Assert.equal(
    statusEvt.extra?.status,
    "failure",
    "rust_mirror_status event has status=failure"
  );

  const [failureEvt] = Glean.pwmgr.rustWriteFailure.testGetValue();

  Assert.notEqual(
    failureEvt.extra?.time_created,
    null,
    "time_created is recorded on rust write failure"
  );
  Assert.notEqual(
    failureEvt.extra?.time_last_used,
    null,
    "time_last_used is recorded on rust write failure"
  );

  const created = new Date(Number(failureEvt.extra.time_created));

  Assert.equal(
    created.getUTCDate(),
    1,
    "time_created is bucketed to month (UTC)"
  );

  LoginTestUtils.clearData();
  await SpecialPowers.flushPrefEnv();
});

/*
 * Tests that we record has_ftp_origin telemetry when adding a login with an
 * FTP origin fails in the Rust mirror.
 */
add_task(async function test_rust_mirror_addLogin_failure_has_ftp_origin() {
  // ensure mirror is on, and reset poisoned flag
  await SpecialPowers.pushPrefEnv({
    set: [
      ["signon.rustMirror.enabled", true],
      ["signon.rustMirror.poisoned", false],
    ],
  });

  Services.fog.testResetFOG();

  const waitForGleanEvent = BrowserTestUtils.waitForCondition(
    () => Glean.pwmgr.rustMirrorStatus.testGetValue()?.length == 1,
    "rust_mirror_status event has been emitted"
  );

  // This login will be accepted by JSON but rejected by Rust,
  // and contains an FTP origin.
  const badLogin = LoginTestUtils.testData.formLogin({
    origin: "ftp.",
    passwordField: ".",
  });

  await Services.logins.addLoginAsync(badLogin);
  await waitForGleanEvent;

  // Sanity check: login exists in JSON storage
  const allLoginsJson = await Services.logins.getAllLogins();
  Assert.equal(
    allLoginsJson.length,
    1,
    "FTP origin login saved to JSON storage"
  );

  // Sanity check: login was not saved to Rust storage
  const rustStorage = new LoginManagerRustStorage();
  const allLoginsRust = await rustStorage.getAllLogins();
  Assert.equal(
    allLoginsRust.length,
    0,
    "FTP origin login not saved to Rust storage"
  );

  // Check rust mirror status telemetry
  const [statusEvt] = Glean.pwmgr.rustMirrorStatus.testGetValue();
  Assert.equal(
    statusEvt.extra?.operation,
    "add",
    "rust_mirror_status event has operation=add"
  );
  Assert.equal(
    statusEvt.extra?.status,
    "failure",
    "rust_mirror_status event has status=failure"
  );

  // Check rust write failure telemetry
  const [failureEvt] = Glean.pwmgr.rustWriteFailure.testGetValue();

  Assert.equal(
    failureEvt.extra?.has_ftp_origin,
    "true",
    "has_ftp_origin is recorded for FTP origin failures"
  );

  LoginTestUtils.clearData();
  await SpecialPowers.flushPrefEnv();
});

/**
 * Tests that a rust_migration_performance event is recorded after migration,
 * containing both duration and total number of migrated logins.
 */
add_task(async function test_migration_performance_probe() {
  // ensure mirror is off
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", false]],
  });
  Services.fog.testResetFOG();

  const login = LoginTestUtils.testData.formLogin({
    username: "perf-user",
    password: "perf-password",
  });
  await Services.logins.addLoginAsync(login);

  // using the migrationNeeded pref change as an indicator that the migration did run
  const prefChangePromise = TestUtils.waitForPrefChange(
    "signon.rustMirror.migrationNeeded"
  );
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rustMirror.enabled", true]],
  });
  await prefChangePromise;

  const [evt] = Glean.pwmgr.rustMigrationStatus.testGetValue();
  Assert.ok(evt, "rustMigrationStatus event should have been emitted");
  Assert.equal(
    evt.extra?.number_of_logins_to_migrate,
    1,
    "event should record number of logins to migrate"
  );
  Assert.equal(
    evt.extra?.number_of_logins_migrated,
    1,
    "event should record number of logins migrated"
  );
  Assert.equal(
    evt.extra?.had_errors,
    "false",
    "event should record a boolean indicating migration errors"
  );
  Assert.greaterOrEqual(
    parseInt(evt.extra?.duration_ms, 10),
    0,
    "event should record non-negative duration in ms"
  );

  sinon.restore();
  LoginTestUtils.clearData();
  await SpecialPowers.flushPrefEnv();
});
