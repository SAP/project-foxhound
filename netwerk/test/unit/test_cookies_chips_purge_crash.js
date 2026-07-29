/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

add_setup(function test_setup() {
  Services.prefs.setIntPref(
    "network.cookie.cookieBehavior",
    Ci.nsICookieService.BEHAVIOR_PARTITION_FOREIGN
  );
  Services.prefs.setBoolPref(
    "network.cookieJarSettings.unblocked_for_testing",
    true
  );
  Services.prefs.setBoolPref(
    "network.cookie.cookieBehavior.optInPartitioning",
    true
  );
  Services.prefs.setBoolPref("network.cookie.CHIPS.enabled", true);
  Services.prefs.setBoolPref(
    "network.cookie.chips.partitionLimitEnabled",
    true
  );
  Services.prefs.setBoolPref(
    "network.cookie.chips.partitionLimitDryRun",
    false
  );
  Services.prefs.setIntPref(
    "network.cookie.chips.partitionLimitByteCapacity",
    24
  );
});

registerCleanupFunction(() => {
  Services.prefs.clearUserPref("network.cookie.cookieBehavior");
  Services.prefs.clearUserPref(
    "network.cookie.cookieBehavior.optInPartitioning"
  );
  Services.prefs.clearUserPref(
    "network.cookieJarSettings.unblocked_for_testing"
  );
  Services.prefs.clearUserPref("network.cookie.CHIPS.enabled");
  Services.prefs.clearUserPref("network.cookie.chips.partitionLimitEnabled");
  Services.prefs.clearUserPref("network.cookie.chips.partitionLimitDryRun");
  Services.prefs.clearUserPref(
    "network.cookie.chips.partitionLimitByteCapacity"
  );
  Services.cookies.removeAll();
});

function addChipsCookie(
  name,
  value,
  host,
  expiry,
  lastAccessed,
  creationTime,
  db
) {
  let cookie = new Cookie(
    name,
    value,
    host,
    "/", // path
    expiry,
    lastAccessed,
    creationTime,
    false, // session
    true, // secure
    false, // http-only
    false, // in browser element
    { partitionKey: "(https,example.com)" },
    Ci.nsICookie.SAMESITE_UNSET,
    Ci.nsICookie.SCHEME_UNSET,
    true // isPartitioned
  );
  db.insertCookie(cookie);
}

add_task(async function test_purge_crash() {
  let profile = do_get_profile();
  let dbFile = do_get_cookie_file(profile);
  Assert.ok(!dbFile.exists());

  let schemaDb = new CookieDatabaseConnection(dbFile, 15);
  let now = Date.now() * 1000; // date in microseconds
  let past = Math.round(now / 1e3 - 1000);
  let future = Math.round(now / 1e3 + 1000) + 20000;
  let host = "example.com";

  // add three cookies such that their order in the CookieEntry list is NOT
  // sorted by age
  // we set up a few cookies to get close to the chips limit, without going over
  // if we front-load the list with enough recently used cookies
  // we can trigger a crash in the CHIPS purging (before our fix in Bug 1971595)
  addChipsCookie("c4", "4", host, future, past + 4000, past, schemaDb);
  addChipsCookie("c5", "5", host, future, past + 4000, past, schemaDb);
  addChipsCookie("c6", "6", host, future, past + 4000, past, schemaDb);
  addChipsCookie("c7", "7", host, future, past + 4000, past, schemaDb);
  addChipsCookie("c8", "8", host, future, past + 4000, past, schemaDb);
  addChipsCookie("c1", "1", host, future, past, past, schemaDb);
  addChipsCookie("c2", "2", host, future, past + 3000, past, schemaDb);
  addChipsCookie("c3", "3", host, future, past + 2000, past, schemaDb);

  // check that the cookies were added to the db
  Assert.equal(do_count_cookies_in_db(schemaDb.db), 8); // total
  Assert.equal(
    do_count_cookies_in_db(schemaDb.db, "example.com"), // per host+OA
    8
  );

  const PATH_EMPTY = "/";
  const FIRST_PARTY = "example.com";
  const URL_DOCUMENT_FIRSTPARTY = "https://" + FIRST_PARTY + PATH_EMPTY;

  function createPartitionKey(url) {
    let uri = NetUtil.newURI(url);
    return `(${uri.scheme},${uri.host})`;
  }
  function createOriginAttributes(partitionKey) {
    return JSON.stringify({
      firstPartyDomain: "",
      geckoViewSessionContextId: "",
      inIsolatedMozBrowser: false,
      partitionKey,
      privateBrowsingId: 0,
      userContextId: 0,
    });
  }
  const partitionedOAs = createOriginAttributes(
    createPartitionKey(URL_DOCUMENT_FIRSTPARTY)
  );

  // validate the db is as expected
  // startup the cookie service and check the cookie count
  // this shouldn't update the lastAccessed values (which determines cookie age)
  let partitioned = Services.cookies.getCookiesWithOriginAttributes(
    partitionedOAs,
    FIRST_PARTY
  );
  // a printed list at this point is expected: c4, c5, ..., c8, c1, ...
  Assert.equal(partitioned.length, 8);

  // add a CHIPS cookie - triggers a CHIPS purge
  // use enough Bytes to trigger the purging of many cookies added before
  // this is where the crash occurs
  const cv = Services.cookies.add(
    host,
    "/", // path
    "cxxxxx", // name
    "yyyyyy", // value
    true, // secure
    false, // http-only
    true, // isSession
    future,
    { partitionKey: "(https,example.com)" },
    Ci.nsICookie.SAMESITE_UNSET, // SameSite
    Ci.nsICookie.SCHEME_HTTPS,
    true // partitioned
  );
  Assert.equal(cv.result, Ci.nsICookieValidation.eOK, "Valid cookie");

  // check post-purge cookie count
  let postPurgeCookies = Services.cookies.getCookiesWithOriginAttributes(
    partitionedOAs,
    FIRST_PARTY
  );
  Assert.equal(postPurgeCookies.length, 5);
  schemaDb.close();
});
