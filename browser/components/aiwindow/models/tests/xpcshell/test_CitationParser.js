/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const { extractMarkdownLinks, validateCitedUrls } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/CitationParser.sys.mjs"
);

// extractMarkdownLinks tests

add_task(function test_extractMarkdownLinks_basic() {
  const response =
    "Check out [GitHub](https://github.com/) and [MDN](https://developer.mozilla.org/).";
  const links = extractMarkdownLinks(response);

  Assert.equal(links.length, 2, "Should find two links");
  Assert.equal(links[0].text, "GitHub", "First link text");
  Assert.equal(links[0].url, "https://github.com/", "First link URL");
  Assert.equal(links[1].text, "MDN", "Second link text");
  Assert.equal(
    links[1].url,
    "https://developer.mozilla.org/",
    "Second link URL"
  );
});

add_task(function test_extractMarkdownLinks_empty() {
  const links = extractMarkdownLinks("");
  Assert.equal(links.length, 0, "Should return empty array for empty input");
});

add_task(function test_extractMarkdownLinks_null() {
  const links = extractMarkdownLinks(null);
  Assert.equal(links.length, 0, "Should return empty array for null input");
});

add_task(function test_extractMarkdownLinks_no_links() {
  const response = "This is plain text without any links.";
  const links = extractMarkdownLinks(response);
  Assert.equal(links.length, 0, "Should find no links in plain text");
});

add_task(function test_extractMarkdownLinks_skips_anchor_links() {
  const response = "See [section](#heading) and [site](https://example.com/).";
  const links = extractMarkdownLinks(response);

  Assert.equal(links.length, 1, "Should skip anchor links");
  Assert.equal(links[0].url, "https://example.com/", "Should include HTTP URL");
});

add_task(function test_extractMarkdownLinks_balanced_parentheses() {
  const response =
    "See [Wikipedia](https://en.wikipedia.org/wiki/Mars_(planet)) for details.";
  const links = extractMarkdownLinks(response);

  Assert.equal(links.length, 1, "Should find one link");
  Assert.equal(
    links[0].url,
    "https://en.wikipedia.org/wiki/Mars_(planet)",
    "Should handle balanced parentheses in URL"
  );
});

add_task(function test_extractMarkdownLinks_strips_title() {
  const response =
    'Visit [Site](https://example.com/ "Example Title") for info.';
  const links = extractMarkdownLinks(response);

  Assert.equal(links.length, 1, "Should find one link");
  Assert.equal(
    links[0].url,
    "https://example.com/",
    "Should strip optional title from URL"
  );
});

add_task(function test_extractMarkdownLinks_skips_fenced_code() {
  const response =
    "Text here.\n```\n[fake](https://fake.com/)\n```\n[real](https://real.com/)";
  const links = extractMarkdownLinks(response);

  Assert.equal(links.length, 1, "Should skip links in fenced code");
  Assert.equal(links[0].url, "https://real.com/", "Should find real link");
});

add_task(function test_extractMarkdownLinks_skips_inline_code() {
  const response =
    "Use `[fake](https://fake.com/)` syntax. See [real](https://real.com/).";
  const links = extractMarkdownLinks(response);

  Assert.equal(links.length, 1, "Should skip links in inline code");
  Assert.equal(links[0].url, "https://real.com/", "Should find real link");
});

add_task(function test_extractMarkdownLinks_skips_multi_backtick_code() {
  const response =
    "Use ``[fake](https://fake.com/)`` syntax. See [real](https://real.com/).";
  const links = extractMarkdownLinks(response);

  Assert.equal(links.length, 1, "Should skip links in multi-backtick code");
  Assert.equal(links[0].url, "https://real.com/", "Should find real link");
});

add_task(function test_extractMarkdownLinks_skips_images() {
  const response =
    "Image: ![alt](https://img.com/pic.png) Link: [site](https://site.com/)";
  const links = extractMarkdownLinks(response);

  Assert.equal(links.length, 1, "Should skip image links");
  Assert.equal(links[0].url, "https://site.com/", "Should find regular link");
});

add_task(function test_extractMarkdownLinks_with_position() {
  const response = "Text [Link](https://example.com/) more text.";
  const links = extractMarkdownLinks(response);

  Assert.equal(links.length, 1, "Should find one link");
  Assert.equal(links[0].position, 5, "Should record correct position");
});

// validateCitedUrls tests

add_task(function test_validateCitedUrls_all_valid() {
  const citedUrls = ["https://a.com/", "https://b.com/"];
  const allowedUrls = ["https://a.com/", "https://b.com/", "https://c.com/"];

  const result = validateCitedUrls(citedUrls, allowedUrls);

  Assert.deepEqual(result.valid, citedUrls, "All URLs should be valid");
  Assert.deepEqual(result.invalid, [], "No URLs should be invalid");
  Assert.equal(result.validationRate, 1.0, "Rate should be 100%");
});

add_task(function test_validateCitedUrls_some_invalid() {
  const citedUrls = ["https://a.com/", "https://b.com/", "https://fake.com/"];
  const allowedUrls = ["https://a.com/", "https://b.com/"];

  const result = validateCitedUrls(citedUrls, allowedUrls);

  Assert.deepEqual(
    result.valid,
    ["https://a.com/", "https://b.com/"],
    "Valid URLs"
  );
  Assert.deepEqual(result.invalid, ["https://fake.com/"], "Invalid URL");
  Assert.less(
    Math.abs(result.validationRate - 0.667),
    0.01,
    "Rate should be ~66.7%"
  );
});

add_task(function test_validateCitedUrls_all_invalid() {
  const citedUrls = ["https://fake1.com/", "https://fake2.com/"];
  const allowedUrls = ["https://real.com/"];

  const result = validateCitedUrls(citedUrls, allowedUrls);

  Assert.deepEqual(result.valid, [], "No valid URLs");
  Assert.deepEqual(result.invalid, citedUrls, "All URLs invalid");
  Assert.equal(result.validationRate, 0, "Rate should be 0%");
});

add_task(function test_validateCitedUrls_empty_cited() {
  const result = validateCitedUrls([], ["https://example.com/"]);

  Assert.deepEqual(result.valid, [], "Empty valid array");
  Assert.deepEqual(result.invalid, [], "Empty invalid array");
  Assert.equal(result.validationRate, 1.0, "Empty input has 100% rate");
});

add_task(function test_validateCitedUrls_null_cited() {
  const result = validateCitedUrls(null, ["https://example.com/"]);

  Assert.deepEqual(result.valid, [], "Empty valid array");
  Assert.deepEqual(result.invalid, [], "Empty invalid array");
  Assert.equal(result.validationRate, 1.0, "Null input has 100% rate");
});

add_task(function test_validateCitedUrls_null_allowed() {
  const citedUrls = ["https://a.com/", "https://b.com/"];
  const result = validateCitedUrls(citedUrls, null);

  Assert.deepEqual(result.valid, [], "No valid URLs");
  Assert.deepEqual(result.invalid, citedUrls, "All URLs invalid");
  Assert.equal(result.validationRate, 0, "Rate should be 0%");
});

add_task(function test_validateCitedUrls_empty_allowed() {
  const citedUrls = ["https://a.com/"];
  const result = validateCitedUrls(citedUrls, []);

  Assert.deepEqual(result.valid, [], "No valid URLs");
  Assert.deepEqual(result.invalid, citedUrls, "All URLs invalid");
  Assert.equal(result.validationRate, 0, "Rate should be 0%");
});

// URL normalization tests

add_task(function test_validateCitedUrls_normalizes_trailing_slash() {
  const citedUrls = ["https://example.com"];
  const allowedUrls = ["https://example.com/"];

  const result = validateCitedUrls(citedUrls, allowedUrls);

  Assert.deepEqual(
    result.valid,
    citedUrls,
    "Should match without trailing slash"
  );
  Assert.equal(result.validationRate, 1.0, "Rate should be 100%");
});

add_task(function test_validateCitedUrls_normalizes_host_case() {
  const citedUrls = ["https://EXAMPLE.COM/page"];
  const allowedUrls = ["https://example.com/page"];

  const result = validateCitedUrls(citedUrls, allowedUrls);

  Assert.deepEqual(
    result.valid,
    citedUrls,
    "Should match case-insensitive host"
  );
  Assert.equal(result.validationRate, 1.0, "Rate should be 100%");
});

add_task(function test_validateCitedUrls_normalizes_default_port() {
  const citedUrls = ["https://example.com:443/page"];
  const allowedUrls = ["https://example.com/page"];

  const result = validateCitedUrls(citedUrls, allowedUrls);

  Assert.deepEqual(
    result.valid,
    citedUrls,
    "Should match with default port removed"
  );
  Assert.equal(result.validationRate, 1.0, "Rate should be 100%");
});
