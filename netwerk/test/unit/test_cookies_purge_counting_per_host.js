/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

add_setup(function test_setup() {
  // FOG needs a profile directory to put its data in.
  do_get_profile();

  // FOG needs to be initialized in order for data to flow.
  Services.fog.initializeFOG();
});

add_task(async function test_purge_counting_per_host() {
  let profile = do_get_profile();
  let dbFile = do_get_cookie_file(profile);
  Assert.ok(!dbFile.exists());

  let schema12db = new CookieDatabaseConnection(dbFile, 12);

  let now = Date.now() * 1000; // date in microseconds
  let pastExpiry = Math.round(now / 1e6 - 1000);
  let futureExpiry = Math.round(now / 1e6 + 1000);

  let host = "cookie-host1.com";

  let manyCookies = 180;
  let cookieMax = 150;
  let cookiesPurged = manyCookies - cookieMax;

  // add many expired cookies for a single host
  for (let i = 0; i < manyCookies; i++) {
    let cookie = new Cookie(
      "cookie-name" + i,
      "cookie-value" + i,
      host,
      "/", // path
      pastExpiry,
      now, // last accessed
      now, // creation time
      false,
      false,
      false
    );
    schema12db.insertCookie(cookie);
  }

  // check that the cookies were added to the db
  Assert.equal(do_count_cookies_in_db(schema12db.db), manyCookies);
  Assert.equal(
    do_count_cookies_in_db(schema12db.db, "cookie-host1.com"),
    manyCookies
  );

  // startup the cookie service and check the cookie count
  let validCookies = Services.cookies.countCookiesFromHost(host); // includes expired cookies
  Assert.equal(validCookies, manyCookies);

  // add a cookie - this will trigger the purge
  Services.cookies.add(
    host,
    "/", // path
    "cookie-name-x",
    "cookie-value-x",
    false, // secure
    true, // http-only
    true, // isSession
    futureExpiry,
    {}, // OA
    Ci.nsICookie.SAMESITE_NONE, // SameSite
    Ci.nsICookie.SCHEME_HTTPS
  );

  // check that we purge down to the cookieMax (plus the cookie added)
  validCookies = Services.cookies.countCookiesFromHost(host);
  Assert.equal(validCookies, cookieMax + 1);

  // check that the telemetry fired
  let cpem = await Glean.networking.cookiePurgeEntryMax.testGetValue();
  Assert.equal(cpem.sum, cookiesPurged, "Purge the expected number of cookies");

  schema12db.close();
});
