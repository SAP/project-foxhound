/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const CONFIG = [
  {
    identifier: "get",
    base: {
      name: "Get Engine",
      urls: {
        suggestions: {
          base: "https://example.com",
          params: [
            {
              name: "custom_param",
              experimentConfig: "test_pref_param",
            },
            {
              name: "webExtension",
              value: "1",
            },
          ],
          searchTermParamName: "suggest",
        },
      },
    },
  },
];

add_setup(async function () {
  SearchTestUtils.setRemoteSettingsConfig(CONFIG);
  await Services.search.init();
});

add_task(async function test_custom_suggest_param() {
  let engine = Services.search.getEngineByName("Get Engine");
  Assert.notEqual(engine, null, "Should have found an engine");

  let submissionSuggest = engine.getSubmission(
    "bar",
    SearchUtils.URL_TYPE.SUGGEST_JSON
  );
  Assert.equal(
    submissionSuggest.uri.spec,
    "https://example.com/?webExtension=1&suggest=bar",
    "Suggest URLs should match"
  );

  let defaultBranch = Services.prefs.getDefaultBranch("browser.search.");
  defaultBranch.setCharPref("param.test_pref_param", "good");

  let nextSubmissionSuggest = engine.getSubmission(
    "bar",
    SearchUtils.URL_TYPE.SUGGEST_JSON
  );
  Assert.equal(
    nextSubmissionSuggest.uri.spec,
    "https://example.com/?custom_param=good&webExtension=1&suggest=bar",
    "Suggest URLs should include custom param"
  );
});
