/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* Test that MozParam condition="pref" values used in search URLs are from the
 * default branch, and that their special characters are URL encoded. */

"use strict";

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

const defaultBranch = Services.prefs.getDefaultBranch(
  SearchUtils.BROWSER_SEARCH_PREF
);
const baseURL = "https://www.google.com/search?q=foo";
const baseURLSearchConfigV2 = "https://www.google.com/search?";

add_setup(async function () {
  // The test engines used in this test need to be recognized as 'default'
  // engines, or their MozParams will be ignored.
  await SearchTestUtils.useTestEngines();
});

add_task(async function test_pref_initial_value() {
  defaultBranch.setCharPref("param.code", "good&id=unique");

  // Preference params are only allowed to be modified on the user branch
  // on nightly builds. For non-nightly builds, check that modifying on the
  // normal branch doesn't work.
  if (!AppConstants.NIGHTLY_BUILD) {
    Services.prefs.setCharPref(
      SearchUtils.BROWSER_SEARCH_PREF + "param.code",
      "bad"
    );
  }

  await AddonTestUtils.promiseStartupManager();
  await Services.search.init();

  const engine = Services.search.getEngineByName("engine-pref");
  Assert.equal(
    engine.getSubmission("foo").uri.spec,
    SearchUtils.newSearchConfigEnabled
      ? baseURLSearchConfigV2 + "code=good%26id%3Dunique&q=foo"
      : baseURL + "&code=good%26id%3Dunique",
    "Should have got the submission URL with the correct code"
  );

  // Now clear the user-set preference. Having a user set preference means
  // we don't get updates from the pref service of changes on the default
  // branch. Normally, this won't be an issue, since we don't expect users
  // to be playing with these prefs, and worst-case, they'll just get the
  // actual change on restart.
  Services.prefs.clearUserPref(SearchUtils.BROWSER_SEARCH_PREF + "param.code");
});

add_task(async function test_pref_updated() {
  // Update the pref without re-init nor restart.
  defaultBranch.setCharPref("param.code", "supergood&id=unique123456");

  const engine = Services.search.getEngineByName("engine-pref");
  Assert.equal(
    engine.getSubmission("foo").uri.spec,
    SearchUtils.newSearchConfigEnabled
      ? baseURLSearchConfigV2 + "code=supergood%26id%3Dunique123456&q=foo"
      : baseURL + "&code=supergood%26id%3Dunique123456",
    "Should have got the submission URL with the updated code"
  );
});

add_task(async function test_pref_cleared() {
  // Update the pref without re-init nor restart.
  // Note you can't delete a preference from the default branch.
  defaultBranch.setCharPref("param.code", "");

  let engine = Services.search.getEngineByName("engine-pref");
  Assert.equal(
    engine.getSubmission("foo").uri.spec,
    baseURL,
    "Should have just the base URL after the pref was cleared"
  );
});
