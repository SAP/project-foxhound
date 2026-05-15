/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_firefox_suggest_with_policy() {
  await setupPolicyEngineWithJson({
    policies: {
      FirefoxSuggest: {
        WebSuggestions: false,
        SponsoredSuggestions: true,
        OnlineEnabled: true,
        Locked: true,
      },
    },
  });

  await BrowserTestUtils.withNewTab(
    "about:preferences#search",
    async browser => {
      is(
        browser.contentDocument.getElementById("firefoxSuggestAll").checked,
        false,
        "All suggestions are turned off"
      );
      is(
        browser.contentDocument.getElementById("firefoxSuggestSponsored")
          .checked,
        true,
        "Sponsored suggestions is enabled"
      );
      is(
        browser.contentDocument.getElementById(
          "firefoxSuggestOnlineEnabledToggle"
        ).checked,
        true,
        "Suggest online checkbox is checked"
      );
      is(
        browser.contentDocument.getElementById("firefoxSuggestAll").disabled,
        true,
        "All suggestions checkbox is disabled"
      );
      is(
        browser.contentDocument.getElementById("firefoxSuggestSponsored")
          .disabled,
        true,
        "Sponsored suggestions is disabled"
      );
      is(
        browser.contentDocument.getElementById(
          "firefoxSuggestOnlineEnabledToggle"
        ).disabled,
        true,
        "Suggest online checkbox is disabled"
      );
    }
  );
});

// In 146 `ImproveSuggest` was deprecated and replaced with `OnlineEnabled`.
// They should behave the same, and when both are specified `OnlineEnabled`
// should be used.
add_task(async function test_firefox_suggest_online() {
  let tests = [
    // Only `OnlineEnabled` specified
    {
      OnlineEnabled: false,
      expectedEnabled: false,
    },
    {
      OnlineEnabled: true,
      expectedEnabled: true,
    },

    // Only `ImproveSuggest` (deprecated) specified
    {
      ImproveSuggest: false,
      expectedEnabled: false,
    },
    {
      ImproveSuggest: true,
      expectedEnabled: true,
    },

    // Both `OnlineEnabled` and `ImproveSuggest` specified: `OnlineEnabled`
    // should be used
    {
      OnlineEnabled: false,
      ImproveSuggest: false,
      expectedEnabled: false,
    },
    {
      OnlineEnabled: false,
      ImproveSuggest: true,
      expectedEnabled: false,
    },
    {
      OnlineEnabled: true,
      ImproveSuggest: false,
      expectedEnabled: true,
    },
    {
      OnlineEnabled: true,
      ImproveSuggest: true,
      expectedEnabled: true,
    },
  ];

  for (let { OnlineEnabled, ImproveSuggest, expectedEnabled } of tests) {
    await setupPolicyEngineWithJson({
      policies: {
        FirefoxSuggest: {
          OnlineEnabled,
          ImproveSuggest,
        },
      },
    });

    await BrowserTestUtils.withNewTab(
      "about:preferences#search",
      async browser => {
        is(
          browser.contentDocument.getElementById(
            "firefoxSuggestOnlineEnabledToggle"
          ).checked,
          expectedEnabled,
          "Suggest online checkbox is checked or not as expected"
        );
      }
    );
  }
});
