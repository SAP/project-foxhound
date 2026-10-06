/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/*
  Tests that when network.cookie.valueless_cookie=true (the default), legacy
  nameless cookies (name="", value!="") that were stored on disk under the old
  behavior are discarded on load rather than surfacing with an unreachable key.
*/

const { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);

const USEC_PER_MSEC = 1000;
const ONE_DAY_IN_USEC = 60 * 60 * 24 * USEC_PER_MSEC * 1000;

function initDBWithNamelessCookie(conn, now) {
  conn.schemaVersion = 7;
  conn.executeSimpleSQL(
    "CREATE TABLE moz_cookies (" +
      "id INTEGER PRIMARY KEY, " +
      "baseDomain TEXT, " +
      "originAttributes TEXT NOT NULL DEFAULT '', " +
      "name TEXT, " +
      "value TEXT, " +
      "host TEXT, " +
      "path TEXT, " +
      "expiry INTEGER, " +
      "lastAccessed INTEGER, " +
      "creationTime INTEGER, " +
      "isSecure INTEGER, " +
      "isHttpOnly INTEGER, " +
      "appId INTEGER DEFAULT 0, " +
      "inBrowserElement INTEGER DEFAULT 0, " +
      "CONSTRAINT moz_uniqueid UNIQUE (name, host, path, originAttributes)" +
      ")"
  );
  conn.executeSimpleSQL(
    "CREATE INDEX moz_basedomain ON moz_cookies (baseDomain, originAttributes)"
  );
  conn.executeSimpleSQL("PRAGMA synchronous = OFF");
  conn.executeSimpleSQL("PRAGMA journal_mode = WAL");
  conn.executeSimpleSQL("PRAGMA wal_autocheckpoint = 16");

  // A legacy nameless cookie: name="", value="nameless" (created by old
  // behavior where `Set-Cookie: foo` produced name="" value="foo").
  conn.executeSimpleSQL(
    `INSERT INTO moz_cookies(baseDomain, host, name, value, path, expiry, lastAccessed, creationTime, isSecure, isHttpOnly)
    VALUES ('example.com', 'example.com', '', 'nameless', '/',
    ${now + ONE_DAY_IN_USEC}, ${now}, ${now - ONE_DAY_IN_USEC}, 0, 0)`
  );

  // A normal cookie with a name, which must always be retained.
  conn.executeSimpleSQL(
    `INSERT INTO moz_cookies(baseDomain, host, name, value, path, expiry, lastAccessed, creationTime, isSecure, isHttpOnly)
    VALUES ('example.com', 'example.com', 'regular', 'cookie', '/',
    ${now + ONE_DAY_IN_USEC}, ${now}, ${now - ONE_DAY_IN_USEC}, 0, 0)`
  );
}

add_task(async function test_nameless_cookie_discarded_when_pref_enabled() {
  let now = Date.now() * USEC_PER_MSEC;
  Services.prefs.setBoolPref("network.cookie.valueless_cookie", true);
  Services.prefs.setIntPref("network.cookie.cookieBehavior", 0);
  Services.prefs.setBoolPref(
    "network.cookieJarSettings.unblocked_for_testing",
    true
  );
  do_get_profile();

  let dbFile = Services.dirsvc.get("ProfD", Ci.nsIFile);
  dbFile.append("cookies.sqlite");
  let conn = Services.storage.openDatabase(dbFile);
  initDBWithNamelessCookie(conn, now);
  conn.close();

  // Arm the observer before triggering init so we don't miss the notification.
  let dbReadPromise = TestUtils.topicObserved("cookie-db-read");

  // Trigger cookie service initialization by accessing cookies.
  let { cookies } = Services.cookies;

  let exampleCookies = cookies.filter(c => c.host === "example.com");
  Assert.equal(
    exampleCookies.length,
    1,
    "Only one cookie should be loaded (nameless one discarded)"
  );
  Assert.equal(
    exampleCookies[0].name,
    "regular",
    "The remaining cookie has a name"
  );
  Assert.equal(
    exampleCookies[0].value,
    "cookie",
    "The remaining cookie has the right value"
  );

  // Wait for InitDBConn to complete; RemoveCookieFromDB is dispatched inside it.
  await dbReadPromise;

  // RemoveCookieFromDB uses an async statement, so poll until the row is gone.
  await TestUtils.waitForCondition(() => {
    let checkConn = Services.storage.openDatabase(dbFile);
    try {
      let stmt = checkConn.createStatement(
        "SELECT COUNT(*) FROM moz_cookies WHERE name = '' AND host = 'example.com'"
      );
      try {
        stmt.executeStep();
        return stmt.getInt32(0) === 0;
      } finally {
        stmt.finalize();
      }
    } finally {
      checkConn.close();
    }
  }, "Nameless cookie should be removed from the SQLite database");
});
