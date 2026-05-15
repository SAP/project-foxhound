/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Test cookie database schema 17
"use strict";

add_task(async function test_schema_17_migration() {
  // Set up a profile.
  let profile = do_get_profile();

  // Start the cookieservice, to force creation of a database.
  Services.cookies.sessionCookies;

  // Close the profile.
  await promise_close_profile();

  // Remove the cookie file in order to create another database file.
  do_get_cookie_file(profile).remove(false);

  // Create a schema 16 database.
  let schema16db = new CookieDatabaseConnection(
    do_get_cookie_file(profile),
    16
  );

  let nowInUSec = Date.now() * 1000;
  let futureInMSec = Date.now() + 60 * 60 * 24 * 1000;

  schema16db.insertCookie(
    new Cookie(
      "test1",
      "Some data",
      "foo.com",
      "/",
      futureInMSec,
      nowInUSec,
      nowInUSec,
      false,
      false,
      false,
      false,
      {},
      Ci.nsICookie.SAMESITE_NONE,
      Ci.nsICookie.SCHEME_UNSET
    )
  );

  schema16db.close();
  schema16db = null;

  // Reload profile.
  await promise_load_profile();

  // Assert inserted cookies are in the db and correctly handled by services.
  Assert.equal(Services.cookies.countCookiesFromHost("foo.com"), 1);

  // Check if the time was reset
  {
    const dbConnection = Services.storage.openDatabase(
      do_get_cookie_file(profile)
    );
    const stmt = dbConnection.createStatement(
      "SELECT updateTime FROM moz_cookies"
    );

    const results = [];
    while (stmt.executeStep()) {
      results.push(stmt.getInt64(0));
    }

    Assert.equal(results.length, 1);
    Assert.greater(results[0], 0);

    stmt.finalize();
    dbConnection.close();
  }

  // Cleanup
  Services.cookies.removeAll();
  do_close_profile();
});
