/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests for UrlbarUtils.isOriginUrl().

"use strict";

add_task(function test_basic_origins() {
  const ORIGIN_URLS = [
    "https://example.com",
    "https://example.com/",
    "http://example.com",
    "http://example.com/",
    "http://www.example.com/",
    "https://www.example.com/",
    "https://example.com:8080",
    "https://example.com:8080/",
    "http://localhost",
    "http://localhost/",
    "http://localhost:3000/",
    "http://192.168.1.1/",
    "https://[::1]/",
    "https://[::1]:443/",
    "ftp://files.example.com/",
    // Group them as origins because they carry no information.
    "http://example.com/?",
    "https://example.com/#",
  ];

  for (let url of ORIGIN_URLS) {
    Assert.ok(
      UrlbarUtils.isOriginUrl(url),
      `${url} should be recognized as an origin URL`
    );
  }
});

add_task(function test_urls_with_paths() {
  const DEEP_URLS = [
    "https://example.com/foo",
    "https://example.com/foo/",
    "https://example.com/foo/bar",
    "https://example.com/foo/bar/",
    "https://example.com/foo/bar/baz.html",
    "http://example.com/a",
    "https://example.com:8080/path",
    "http://localhost:3000/api/v1",
  ];

  for (let url of DEEP_URLS) {
    Assert.ok(
      !UrlbarUtils.isOriginUrl(url),
      `${url} should NOT be recognized as an origin URL`
    );
  }
});

add_task(function test_urls_with_query_strings() {
  const QUERY_URLS = [
    "https://example.com?q=foo",
    "https://example.com/?q=foo",
    "https://example.com/?tracking=1&utm_source=bar",
    "https://example.com/?a=1",
  ];

  for (let url of QUERY_URLS) {
    Assert.ok(
      !UrlbarUtils.isOriginUrl(url),
      `${url} should NOT be an origin (has query string)`
    );
  }
});

add_task(function test_urls_with_fragments() {
  const FRAGMENT_URLS = [
    "https://example.com#section",
    "https://example.com/#section",
  ];

  for (let url of FRAGMENT_URLS) {
    Assert.ok(
      !UrlbarUtils.isOriginUrl(url),
      `${url} should NOT be an origin (has fragment)`
    );
  }
});

add_task(function test_urls_with_query_and_fragment() {
  const COMBINED_URLS = [
    "https://example.com/?q=foo#bar",
    "https://example.com?q=1#section",
  ];

  for (let url of COMBINED_URLS) {
    Assert.ok(
      !UrlbarUtils.isOriginUrl(url),
      `${url} should NOT be an origin (has both query and fragment)`
    );
  }
});

add_task(function test_deep_urls_with_query_and_fragment() {
  const DEEP_COMBINED_URLS = [
    "https://example.com/path?q=foo",
    "https://example.com/path#section",
    "https://example.com/path?q=foo#section",
  ];

  for (let url of DEEP_COMBINED_URLS) {
    Assert.ok(!UrlbarUtils.isOriginUrl(url), `${url} should NOT be an origin`);
  }
});

add_task(function test_invalid_input() {
  const INVALID_INPUTS = [
    "",
    "not a url",
    "example.com",
    "example",
    "://missing-scheme",
    "http://",
    "   ",
    "foo:bar:baz",
  ];

  for (let input of INVALID_INPUTS) {
    Assert.ok(
      !UrlbarUtils.isOriginUrl(input),
      `"${input}" should return false (unparseable)`
    );
  }
});

add_task(function test_special_schemes() {
  Assert.ok(
    !UrlbarUtils.isOriginUrl("about:blank"),
    "about: URLs should not be treated as origins"
  );

  Assert.ok(
    !UrlbarUtils.isOriginUrl("data:text/html,hello"),
    "data: URLs should not be treated as origins"
  );
  Assert.ok(
    !UrlbarUtils.isOriginUrl("javascript:void(0)"),
    "javascript: URLs should not be treated as origins"
  );
});

add_task(function test_edge_cases() {
  // Standard port should be normalized away by URL parser.
  Assert.ok(
    UrlbarUtils.isOriginUrl("https://example.com:443/"),
    "https with standard port 443 should be origin-only"
  );
  Assert.ok(
    UrlbarUtils.isOriginUrl("http://example.com:80/"),
    "http with standard port 80 should be origin-only"
  );

  // Non-standard port.
  Assert.ok(
    UrlbarUtils.isOriginUrl("http://example.com:9999/"),
    "Non-standard port should still be origin-only"
  );

  // Double slash path is NOT origin-only.
  Assert.ok(
    !UrlbarUtils.isOriginUrl("https://example.com//"),
    "Double trailing slash means pathname is '//' not '/'"
  );
});
