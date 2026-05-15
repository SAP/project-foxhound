/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Unit tests for SecurityUtils.sys.mjs
 *
 * Tests URL normalization, eTLD validation, and ledger management:
 * - normalizeUrl() - URL validation and normalization
 * - areSameSite() - eTLD+1 validation
 * - TabLedger - per-tab URL storage with TTL
 * - SessionLedger - multi-tab ledger management
 *
 * Focus: Critical paths and edge cases that affect security
 */
const { normalizeUrl, TabLedger, SessionLedger } = ChromeUtils.importESModule(
  "chrome://global/content/ml/security/SecurityUtils.sys.mjs"
);

/**
 * Test: valid HTTP URLs normalize successfully.
 *
 * Reason:
 * HTTP URLs are valid input for the security layer. The normalizer
 * must accept them and return a normalized form for consistent
 * ledger comparison.
 */
add_task(async function test_normalizeUrl_valid_http() {
  const result = normalizeUrl("http://example.com/page");

  Assert.ok(result.success, "Should succeed for valid HTTP URL");
  Assert.ok(result.url, "Should return normalized URL");
  Assert.ok(result.url.startsWith("http://"), "Should preserve http scheme");
});

/**
 * Test: valid HTTPS URLs normalize successfully.
 *
 * Reason:
 * HTTPS URLs are the primary input for the security layer. The normalizer
 * must accept them and preserve the scheme in the output.
 */
add_task(async function test_normalizeUrl_valid_https() {
  const result = normalizeUrl("https://example.com/page");

  Assert.ok(result.success, "Should succeed for valid HTTPS URL");
  Assert.ok(result.url, "Should return normalized URL");
  Assert.ok(result.url.startsWith("https://"), "Should preserve https scheme");
});

/**
 * Test: URLs with query parameters normalize successfully.
 *
 * Reason:
 * Query parameters are part of resource identity. The normalizer must
 * preserve them so that URLs like `page?id=1` and `page?id=2` are
 * treated as distinct resources.
 */
add_task(async function test_normalizeUrl_with_query_params() {
  const result = normalizeUrl("https://example.com/page?foo=bar&baz=qux");

  Assert.ok(result.success, "Should succeed for URL with query params");
  Assert.ok(result.url.includes("?"), "Should preserve query parameters");
});

/**
 * Test: empty string fails normalization.
 *
 * Reason:
 * Empty strings are invalid URLs. The normalizer must reject them
 * with an error rather than returning an empty or malformed result.
 */
add_task(async function test_normalizeUrl_empty_string() {
  const result = normalizeUrl("");

  Assert.ok(!result.success, "Should fail for empty string");
  Assert.ok(result.error, "Should return error");
});

/**
 * Test: whitespace-only string fails normalization.
 *
 * Reason:
 * Whitespace-only strings are invalid URLs. The normalizer must
 * reject them rather than treating whitespace as a valid resource.
 */
add_task(async function test_normalizeUrl_whitespace() {
  const result = normalizeUrl("   ");

  Assert.ok(!result.success, "Should fail for whitespace-only string");
  Assert.ok(result.error, "Should return error");
});

/**
 * Test: invalid URL format fails normalization.
 *
 * Reason:
 * Malformed URLs cannot be validated against the ledger. The normalizer
 * must reject them so the security layer can deny the request (fail-closed).
 */
add_task(async function test_normalizeUrl_invalid_format() {
  const result = normalizeUrl("not-a-valid-url");

  Assert.ok(!result.success, "Should fail for invalid URL format");
  Assert.ok(result.error, "Should return error");
});

/**
 * Test: non-http/https schemes fail normalization.
 *
 * Reason:
 * Only http/https URLs are valid for web content fetching. Schemes like
 * ftp://, file://, and javascript: must be rejected to prevent attacks
 * using unexpected protocol handlers.
 */
add_task(async function test_normalizeUrl_non_http_scheme() {
  const schemes = ["ftp://example.com", "file:///path", "javascript:alert(1)"];

  for (const url of schemes) {
    const result = normalizeUrl(url);
    Assert.ok(!result.success, `Should fail for scheme: ${url}`);
    Assert.ok(result.error, "Should return error");
  }
});

/**
 * Test: null/undefined fail normalization gracefully.
 *
 * Reason:
 * Defensive programming: the normalizer must handle null/undefined
 * without throwing, returning a failure result instead.
 */
add_task(async function test_normalizeUrl_null_undefined() {
  const resultNull = normalizeUrl(null);
  const resultUndefined = normalizeUrl(undefined);

  Assert.ok(!resultNull.success, "Should fail for null");
  Assert.ok(!resultUndefined.success, "Should fail for undefined");
});

/**
 * Test: fragments are removed during normalization.
 *
 * Reason:
 * Fragments (#section) identify positions within a page, not different
 * resources. Stripping them ensures `page` and `page#section` are treated
 * as the same resource for security purposes.
 */
add_task(async function test_normalizeUrl_strips_fragments() {
  const result = normalizeUrl("https://example.com/page#section");

  Assert.ok(result.success, "Should succeed");
  Assert.ok(!result.url.includes("#"), "Should strip fragment");
});

/**
 * Test: tracking parameters are removed during normalization.
 *
 * Reason:
 * Tracking parameters (utm_source, etc.) don't change the resource.
 * Stripping them prevents false denials when the same page is accessed
 * with different tracking parameters.
 */
add_task(async function test_normalizeUrl_strips_tracking() {
  const result = normalizeUrl(
    "https://example.com/page?utm_source=test&foo=bar"
  );

  Assert.ok(result.success, "Should succeed");
  Assert.ok(!result.url.includes("utm_"), "Should strip utm parameters");
  Assert.ok(
    result.url.includes("foo=bar"),
    "Should preserve non-tracking params"
  );
});

/**
 * Test: relative URLs work with baseUrl.
 *
 * Reason:
 * Page content may contain relative URLs. The normalizer must resolve
 * them against a base URL to produce absolute URLs for ledger comparison.
 */
add_task(async function test_normalizeUrl_relative_with_base() {
  const result = normalizeUrl("/page", "https://example.com");

  Assert.ok(result.success, "Should succeed with baseUrl");
  Assert.ok(
    result.url.includes("example.com/page"),
    "Should resolve relative URL"
  );
});

/**
 * Test: TabLedger can be created.
 *
 * Reason:
 * TabLedger is the per-tab URL storage. It must initialize correctly
 * with a tab ID and start empty.
 */
add_task(async function test_TabLedger_creation() {
  const ledger = new TabLedger("tab-123");

  Assert.ok(ledger, "Should create ledger");
  Assert.equal(ledger.tabId, "tab-123", "Should store tab ID");
  Assert.equal(ledger.size(), 0, "Should start empty");
});

/**
 * Test: seed() adds multiple URLs to ledger.
 *
 * Reason:
 * When a page loads, multiple URLs (page URL, linked resources) are
 * seeded at once. seed() must add all valid URLs to the ledger.
 */
add_task(async function test_TabLedger_seed() {
  const ledger = new TabLedger("tab-123");
  const urls = ["https://example.com", "https://example.com/page"];

  ledger.seed(urls);

  Assert.equal(
    ledger.lookup("https://example.com"),
    "https://example.com/",
    "Should return normalized URL"
  );
  Assert.equal(
    ledger.lookup("https://example.com/page"),
    "https://example.com/page",
    "Should return normalized URL"
  );
  Assert.equal(ledger.size(), 2, "Should have correct size");
});

/**
 * Test: add() adds individual URLs.
 *
 * Reason:
 * Single URLs may be added incrementally (e.g., dynamic content).
 * add() must work for individual URL additions.
 */
add_task(async function test_TabLedger_add() {
  const ledger = new TabLedger("tab-123");

  ledger.add("https://example.com");

  Assert.equal(
    ledger.lookup("https://example.com"),
    "https://example.com/",
    "Should return normalized URL"
  );
  Assert.equal(ledger.size(), 1, "Should have size 1");
});

/**
 * Test: has() returns false for URLs not in ledger.
 *
 * Reason:
 * The core security check: has() must return false for unseen URLs
 * so the policy can deny access to untrusted resources.
 */
add_task(async function test_TabLedger_has_missing() {
  const ledger = new TabLedger("tab-123");
  ledger.add("https://example.com");

  Assert.equal(
    ledger.lookup("https://evil.com"),
    null,
    "Should return null for missing URL"
  );
});

/**
 * Test: clear() empties the ledger.
 *
 * Reason:
 * When a tab navigates to a new page, the old URLs are no longer
 * valid. clear() must remove all URLs from the ledger.
 */
add_task(async function test_TabLedger_clear() {
  const ledger = new TabLedger("tab-123");
  ledger.seed(["https://example.com", "https://example.com/page"]);

  ledger.clear();

  Assert.equal(ledger.size(), 0, "Should be empty after clear");
  Assert.equal(
    ledger.lookup("https://example.com"),
    null,
    "Should return null after clear"
  );
});

/**
 * Test: ledger enforces size limit.
 *
 * Reason:
 * Unbounded ledger growth could cause memory issues. The size limit
 * prevents malicious pages from bloating the ledger with many URLs.
 */
add_task(async function test_TabLedger_size_limit() {
  const maxUrls = 1000;
  const ledger = new TabLedger("tab-123");

  // Try to add more than max
  for (let i = 0; i < maxUrls + 2; i++) {
    ledger.add(`https://example.com/page${i}`);
  }

  Assert.lessOrEqual(ledger.size(), maxUrls, "Should not exceed max size");
});

/**
 * Test: invalid URLs are rejected gracefully.
 *
 * Reason:
 * Malformed URLs (empty strings, null, non-URLs) should be silently
 * ignored rather than added to the ledger or causing exceptions.
 */
add_task(async function test_TabLedger_invalid_urls() {
  const ledger = new TabLedger("tab-123");

  ledger.add("not-a-url");
  ledger.add("");
  ledger.add(null);

  Assert.equal(ledger.size(), 0, "Should not add invalid URLs");
});

/**
 * Test: SessionLedger can be created.
 *
 * Reason:
 * SessionLedger manages per-tab ledgers for a session. It must
 * initialize with a session ID and start with no tabs.
 */
add_task(async function test_SessionLedger_creation() {
  const session = new SessionLedger("session-123");

  Assert.ok(session, "Should create session ledger");
  Assert.equal(session.sessionId, "session-123", "Should store session ID");
  Assert.equal(session.tabCount(), 0, "Should start with no tabs");
});

/**
 * Test: forTab() creates and retrieves tab ledgers.
 *
 * Reason:
 * forTab() is the primary interface for accessing tab ledgers. It must
 * create a new ledger on first access and return the same instance
 * on subsequent calls for the same tab.
 */
add_task(async function test_SessionLedger_forTab() {
  const session = new SessionLedger("session-123");

  const ledger1 = session.forTab("tab-1");
  const ledger2 = session.forTab("tab-1"); // Same tab

  Assert.ok(ledger1, "Should create ledger for tab-1");
  Assert.equal(ledger1, ledger2, "Should return same ledger for same tab");
  Assert.equal(session.tabCount(), 1, "Should have 1 tab");
});

/**
 * Test: different tabs get different ledgers.
 *
 * Reason:
 * Tab isolation: each tab must have its own ledger. URLs from one tab
 * should not be automatically trusted in another tab.
 */
add_task(async function test_SessionLedger_multiple_tabs() {
  const session = new SessionLedger("session-123");

  const ledger1 = session.forTab("tab-1");
  const ledger2 = session.forTab("tab-2");

  Assert.notEqual(
    ledger1,
    ledger2,
    "Different tabs should have different ledgers"
  );
  Assert.equal(session.tabCount(), 2, "Should have 2 tabs");
});

/**
 * Test: merge() combines URLs from multiple tabs.
 *
 * Reason:
 * The @mentions feature requires merging ledgers from multiple tabs.
 * merge() must return a combined set of URLs from all specified tabs.
 */
add_task(async function test_SessionLedger_merge() {
  const session = new SessionLedger("session-123");

  const ledger1 = session.forTab("tab-1");
  const ledger2 = session.forTab("tab-2");

  ledger1.add("https://example.com/page1");
  ledger2.add("https://example.com/page2");

  const merged = session.merge(["tab-1", "tab-2"]);

  Assert.equal(
    merged.lookup("https://example.com/page1"),
    "https://example.com/page1",
    "Should return normalized URL from tab-1"
  );
  Assert.equal(
    merged.lookup("https://example.com/page2"),
    "https://example.com/page2",
    "Should return normalized URL from tab-2"
  );
  Assert.equal(merged.size(), 2, "Should have 2 URLs");
});

/**
 * Test: removeTab() removes a tab's ledger.
 *
 * Reason:
 * When a tab is closed, its ledger should be removed to free memory.
 * Accessing the same tab ID later should create a fresh empty ledger.
 */
add_task(async function test_SessionLedger_removeTab() {
  const session = new SessionLedger("session-123");

  session.forTab("tab-1").add("https://example.com");
  session.forTab("tab-2").add("https://example.com");

  session.removeTab("tab-1");

  Assert.equal(session.tabCount(), 1, "Should have 1 tab after removal");

  // Getting the tab again should create a new empty ledger
  const newLedger = session.forTab("tab-1");
  Assert.equal(
    newLedger.size(),
    0,
    "New ledger for removed tab should be empty"
  );
});

/**
 * Test: clearAll() clears all tab ledgers.
 *
 * Reason:
 * Session reset or cleanup may require removing all ledgers at once.
 * clearAll() must remove all tabs and their associated ledgers.
 */
add_task(async function test_SessionLedger_clearAll() {
  const session = new SessionLedger("session-123");

  session.forTab("tab-1").add("https://example.com");
  session.forTab("tab-2").add("https://example.com");

  session.clearAll();

  Assert.equal(session.tabCount(), 0, "Should have no tabs after clearAll");
});

/**
 * Test: ledgers normalize URLs consistently.
 *
 * Reason:
 * URLs must be normalized both when added and when checked. A URL
 * added with a fragment should match a check without the fragment
 * (and vice versa) after normalization.
 */
add_task(async function test_ledger_normalizes_urls() {
  const ledger = new TabLedger("tab-123");

  // Add URL with fragment
  ledger.add("https://example.com/page#section");

  // Check without fragment (should still match after normalization)
  Assert.equal(
    ledger.lookup("https://example.com/page"),
    "https://example.com/page",
    "Should return normalized URL without fragment"
  );
});
