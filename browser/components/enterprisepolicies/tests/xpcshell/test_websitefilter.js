/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const { WebsiteFilter } = ChromeUtils.importESModule(
  "resource:///modules/policies/WebsiteFilter.sys.mjs"
);

add_task(async function setup() {
  await setupPolicyEngineWithJson({
    policies: {
      WebsiteFilter: {
        Block: ["*://accounts.firefox.com/*"],
      },
    },
  });
});

add_task(async function test_host_normalization() {
  ok(
    !WebsiteFilter.isAllowed("https://accounts.firefox.com/"),
    "Bare host should be blocked"
  );
  ok(
    !WebsiteFilter.isAllowed("https://accounts.firefox.com./"),
    "Trailing-dot host should be blocked"
  );
  ok(
    !WebsiteFilter.isAllowed("https://accounts.firefox.com.../"),
    "Multiple trailing dots should be blocked"
  );
  ok(
    !WebsiteFilter.isAllowed("https://accounts.firefox.com%2e/"),
    "Percent-encoded trailing dot should be blocked"
  );
  ok(
    !WebsiteFilter.isAllowed("https://accounts.firefox.com。/"),
    "Ideographic full-stop (folds to a trailing dot) should be blocked"
  );
  ok(
    WebsiteFilter.isAllowed("https://example.org./"),
    "Unrelated trailing-dot host should not be blocked"
  );
  ok(
    !WebsiteFilter.isAllowed("not a parseable url"),
    "Unparseable URL should be blocked"
  );
});
