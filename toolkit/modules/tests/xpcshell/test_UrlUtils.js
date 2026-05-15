/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { UrlUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/UrlUtils.sys.mjs"
);

add_task(function test_looksLikeUrl() {
  const tests = [
    // ===== START: SECTION_DONT_REQUIRE_PATH ==================================
    // Does not look like a url.
    { url: "", isUrl: false },
    { url: " ", isUrl: false },
    { url: "\t", isUrl: false },
    { url: "\n\n", isUrl: false },
    { url: "cheese/1", isUrl: false },
    { url: "cheese", isUrl: false },
    { url: "hello@this", isUrl: false },
    { url: "hello/", isUrl: false },
    { url: "google.com", isUrl: false },
    { url: "google.com/", isUrl: false },
    { url: "connect.mozilla.org", isUrl: false },
    { url: "hello@example.com", isUrl: false },

    // Looks like a url.
    { url: "hello:this", isUrl: true },
    { url: "cheese/hello", isUrl: true },
    { url: "hello/%", isUrl: true },
    { url: "hello/?", isUrl: true },
    { url: "hello/#", isUrl: true },
    { url: "google.com/hello", isUrl: true },
    { url: "192.168.0.1", isUrl: true },
    { url: "192.168.0.1/hello", isUrl: true },
    { url: "192.168.0.1:4000", isUrl: true },
    { url: "192.168.0.1:4000/hello", isUrl: true },
    { url: "hello:password@google.com", isUrl: true },

    // Is a url because of protocol.
    { url: "https://google.com", isUrl: true },
    { url: "https://google.com/", isUrl: true },
    { url: "https://google.com/hello", isUrl: true },
    { url: "https://192.168.0.1", isUrl: true },
    { url: "https://192.168.0.1/hello", isUrl: true },
    { url: "https://cheese/hello", isUrl: true },
    // ===== END: SECTION_DONT_REQUIRE_PATH ====================================

    // ===== START: SECTION_REQUIRE_PATH =======================================

    // Does not look like a url.
    { url: "", isUrl: false, options: { requirePath: true } },
    { url: " ", isUrl: false, options: { requirePath: true } },
    { url: "\t", isUrl: false, options: { requirePath: true } },
    { url: "\n\n", isUrl: false, options: { requirePath: true } },
    { url: "cheese/1", isUrl: false, options: { requirePath: true } },
    { url: "cheese", isUrl: false, options: { requirePath: true } },
    { url: "hello@this", isUrl: false, options: { requirePath: true } },
    { url: "hello/", isUrl: false, options: { requirePath: true } },
    { url: "google.com", isUrl: false, options: { requirePath: true } },
    { url: "google.com/", isUrl: false, options: { requirePath: true } },
    {
      url: "connect.mozilla.org",
      isUrl: false,
      options: { requirePath: true },
    },
    { url: "192.168.0.1", isUrl: false, options: { requirePath: true } },
    { url: "192.168.0.1:4000", isUrl: false, options: { requirePath: true } },

    // Emails are explicitly NOT counted as urls since we want to deal with
    // them separately.
    { url: "hello@example.com", isUrl: false, options: { requirePath: true } },

    // Looks like a url.
    { url: "cheese/hello", isUrl: true, options: { requirePath: true } },
    { url: "hello:this", isUrl: true, options: { requirePath: true } },
    { url: "hello/%", isUrl: true, options: { requirePath: true } },
    { url: "hello/?", isUrl: true, options: { requirePath: true } },
    { url: "hello/#", isUrl: true, options: { requirePath: true } },
    { url: "google.com/hello", isUrl: true, options: { requirePath: true } },
    { url: "192.168.0.1/hello", isUrl: true, options: { requirePath: true } },
    {
      url: "192.168.0.1:4000/hello",
      isUrl: true,
      options: { requirePath: true },
    },
    {
      url: "hello:password@google.com",
      isUrl: true,
      options: { requirePath: true },
    },

    // Is a url because of protocol.
    { url: "https://google.com", isUrl: true, options: { requirePath: true } },
    { url: "https://google.com/", isUrl: true, options: { requirePath: true } },
    { url: "https://192.168.0.1", isUrl: true, options: { requirePath: true } },
    {
      url: "https://google.com/hello",
      isUrl: true,
      options: { requirePath: true },
    },
    {
      url: "https://192.168.0.1/hello",
      isUrl: true,
      options: { requirePath: true },
    },
    {
      url: "https://cheese/hello",
      isUrl: true,
      options: { requirePath: true },
    },

    // ===== END: SECTION_REQUIRE_PATH =========================================
  ];

  for (let test of tests) {
    const { url, options, isUrl } = test;

    info(`Testing '${url}' with options '${JSON.stringify(options)}'`);

    Assert.strictEqual(
      UrlUtils.looksLikeUrl(url, options),
      isUrl,
      `'${url}' with options '${JSON.stringify(options)}' should${
        isUrl ? "" : "n't"
      } be a url`
    );
  }
});

add_task(function test_looksLikeOrigin() {
  const tests = [
    // Test normal use
    { origin: "", expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE },
    { origin: " ", expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE },

    {
      origin: ":pass@host",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.USERINFO_OR_PORT,
    },
    {
      origin: "user:@host",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.USERINFO_OR_PORT,
    },
    {
      origin: "user:pass@host",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.USERINFO_OR_PORT,
    },
    { origin: ":1000", expected: UrlUtils.LOOKS_LIKE_ORIGIN.USERINFO_OR_PORT },

    { origin: "cheese", expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE },
    { origin: "mozilla.org", expected: UrlUtils.LOOKS_LIKE_ORIGIN.OTHER },
    {
      origin: "connect.mozilla.org",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.OTHER,
    },
    { origin: "192.168.0.1", expected: UrlUtils.LOOKS_LIKE_ORIGIN.IP },

    { origin: "cheese:4000", expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE },
    { origin: "mozilla.org:4000", expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE },
    {
      origin: "connect.mozilla.org:4000",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },
    { origin: "192.168.0.1:4000", expected: UrlUtils.LOOKS_LIKE_ORIGIN.IP },

    // Ignore known domains only applies to one word origins.
    {
      origin: "cheese",
      options: { ignoreKnownDomains: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.OTHER,
    },
    {
      origin: "cheese:4000",
      options: { ignoreKnownDomains: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },
    {
      origin: "user:pass@cheese",
      options: { ignoreKnownDomains: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.USERINFO_OR_PORT,
    },

    // Test origin cannot be an ip.
    {
      origin: "mozilla.org",
      options: { noIp: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.OTHER,
    },
    {
      origin: "connect.mozilla.org",
      options: { noIp: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.OTHER,
    },
    {
      origin: "192.168.0.1",
      options: { noIp: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },
    {
      origin: "192.168.0.1:4000",
      options: { noIp: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },
    {
      origin: "user:pass@192.168.0.1:4000",
      options: { noIp: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },

    // Test ignore port
    {
      origin: ":pass@host",
      options: { noPort: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.USERINFO_OR_PORT,
    },
    {
      origin: "user:@host",
      options: { noPort: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.USERINFO_OR_PORT,
    },
    {
      origin: "user:pass@host",
      options: { noPort: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.USERINFO_OR_PORT,
    },
    {
      origin: ":1000",
      options: { noPort: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },
    {
      origin: "cheese:4000",
      options: { noPort: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },
    {
      origin: "mozilla.org:4000",
      options: { noPort: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },
    {
      origin: "connect.mozilla.org:4000",
      options: { noPort: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },
    {
      origin: "192.168.0.1:4000",
      options: { noPort: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },
    {
      origin: "user:pass@192.168.0.1:4000",
      options: { noPort: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },

    // Tests merged in from test_tokenizer.js
    {
      origin: "",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },

    {
      origin: "user@example.com",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },

    {
      origin: "user:pass@example.com",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.USERINFO_OR_PORT,
    },

    {
      origin: "example.com:1234",
      // This should be `USERINFO_OR_PORT`, but it matches
      // `REGEXP_LIKE_PROTOCOL`, so it returns `NONE`.
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },
    {
      origin: "example.com:1234",
      options: { noPort: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },

    {
      origin: "user@example.com:1234",
      // This should be `USERINFO_OR_PORT`, but it matches
      // `REGEXP_LIKE_PROTOCOL`, so it returns `NONE`.
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },
    {
      origin: "user@example.com:1234",
      options: { noPort: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },

    {
      origin: "user:pass@example.com:1234",
      // This should be `USERINFO_OR_PORT`, but it matches
      // `REGEXP_LIKE_PROTOCOL`, so it returns `NONE`.
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },
    {
      origin: "user:pass@example.com:1234",
      options: { noPort: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },

    {
      origin: "1.2.3.4",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.IP,
    },
    {
      origin: "1.2.3.4",
      options: { noIp: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },

    {
      origin: "[2001:0db8:0000:0000:0000:8a2e:0370:7334]",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.IP,
    },
    {
      origin: "[2001:0db8:0000:0000:0000:8a2e:0370:7334]",
      options: { noIp: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },

    {
      origin: "[2001:db8::8a2e:370:7334]",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.IP,
    },
    {
      origin: "[2001:db8::8a2e:370:7334]",
      options: { noIp: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },

    {
      origin: "a!@#$%^&( z",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },

    {
      origin: "example",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.NONE,
    },

    {
      origin: "localhost",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.KNOWN_DOMAIN,
    },
    {
      origin: "localhost",
      options: { ignoreKnownDomains: true },
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.OTHER,
    },

    {
      origin: "example.com",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.OTHER,
    },
    {
      origin: "example.co",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.OTHER,
    },
    {
      origin: "example.c",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.OTHER,
    },
    {
      origin: "example.",
      expected: UrlUtils.LOOKS_LIKE_ORIGIN.OTHER,
    },
  ];

  for (let test of tests) {
    const { origin, options, expected } = test;

    info(`Testing '${origin}' with options '${JSON.stringify(options)}'`);

    Assert.strictEqual(
      UrlUtils.looksLikeOrigin(origin, options),
      expected,
      "looksLikeOrigin should return expected value: " +
        JSON.stringify({ origin, options })
    );
  }
});
