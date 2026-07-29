"use strict";

// Get main thread CPU time, in ms.
async function getMainThreadCpuTime() {
  let proc = await ChromeUtils.requestProcInfo();
  let thread =
    proc.threads.find(t => t.name === "MainThread" || t.tid == proc.pid) ??
    // Apparently the main thread has an empty name "" in xpcshell,
    // so fall back to the first one.
    proc.threads[0];
  return Math.round(thread.cpuTime / 1_000_000);
}

registerCleanupFunction(async () => {
  Services.prefs.clearUserPref("network.url.useDefaultURI");
});

add_setup(async function () {
  // unknown-scheme://foo tests will fail with default URI
  // see bug 1868413 (to re-enable)
  Services.prefs.setBoolPref("network.url.useDefaultURI", false);
});

add_task(async function test_MatchPattern_matches() {
  function test(url, pattern, normalized = pattern, options = {}, explicit) {
    let uri = Services.io.newURI(url);

    pattern = Array.prototype.concat.call(pattern);
    normalized = Array.prototype.concat.call(normalized);

    let patterns = pattern.map(pat => new MatchPattern(pat, options));

    let set = new MatchPatternSet(pattern, options);
    let set2 = new MatchPatternSet(patterns, options);

    deepEqual(
      set2.patterns,
      patterns,
      "Patterns in set should equal the input patterns"
    );

    equal(
      set.matches(uri, explicit),
      set2.matches(uri, explicit),
      "Single pattern and pattern set should return the same match"
    );

    for (let [i, pat] of patterns.entries()) {
      equal(
        pat.pattern,
        normalized[i],
        "Pattern property should contain correct normalized pattern value"
      );
    }

    if (patterns.length == 1) {
      equal(
        patterns[0].matches(uri, explicit),
        set.matches(uri, explicit),
        "Single pattern and string set should return the same match"
      );
    }

    return set.matches(uri, explicit);
  }

  function pass({ url, pattern, normalized, options, explicit }) {
    ok(
      test(url, pattern, normalized, options, explicit),
      `Expected match: ${JSON.stringify(pattern)}, ${url}`
    );
  }

  function fail({ url, pattern, normalized, options, explicit }) {
    ok(
      !test(url, pattern, normalized, options, explicit),
      `Expected no match: ${JSON.stringify(pattern)}, ${url}`
    );
  }

  function invalid({ pattern }) {
    Assert.throws(
      () => new MatchPattern(pattern),
      /.*/,
      `Invalid pattern '${pattern}' should throw`
    );
    Assert.throws(
      () => new MatchPatternSet([pattern]),
      /.*/,
      `Invalid pattern '${pattern}' should throw`
    );
  }

  // Invalid pattern.
  invalid({ pattern: "" });

  // Pattern must include trailing slash.
  invalid({ pattern: "http://mozilla.org" });

  // Protocol not allowed.
  invalid({ pattern: "gopher://wuarchive.wustl.edu/" });

  pass({ url: "http://mozilla.org", pattern: "http://mozilla.org/" });
  pass({ url: "http://mozilla.org/", pattern: "http://mozilla.org/" });

  pass({ url: "http://mozilla.org/", pattern: "*://mozilla.org/" });
  pass({ url: "https://mozilla.org/", pattern: "*://mozilla.org/" });
  fail({ url: "file://mozilla.org/", pattern: "*://mozilla.org/" });
  fail({ url: "ftp://mozilla.org/", pattern: "*://mozilla.org/" });

  fail({ url: "http://mozilla.com", pattern: "http://*mozilla.com*/" });
  fail({ url: "http://mozilla.com", pattern: "http://mozilla.*/" });
  invalid({ pattern: "http:/mozilla.com/" });

  pass({ url: "http://google.com", pattern: "http://*.google.com/" });
  pass({ url: "http://docs.google.com", pattern: "http://*.google.com/" });

  pass({ url: "http://mozilla.org:8080", pattern: "http://mozilla.org/" });
  pass({ url: "http://mozilla.org:8080", pattern: "*://mozilla.org/" });
  fail({ url: "http://mozilla.org:8080", pattern: "http://mozilla.org:8080/" });

  // Now try with * in the path.
  pass({ url: "http://mozilla.org", pattern: "http://mozilla.org/*" });
  pass({ url: "http://mozilla.org/", pattern: "http://mozilla.org/*" });

  pass({ url: "http://mozilla.org/", pattern: "*://mozilla.org/*" });
  pass({ url: "https://mozilla.org/", pattern: "*://mozilla.org/*" });
  fail({ url: "file://mozilla.org/", pattern: "*://mozilla.org/*" });
  fail({ url: "http://mozilla.com", pattern: "http://mozilla.*/*" });

  pass({ url: "http://google.com", pattern: "http://*.google.com/*" });
  pass({ url: "http://docs.google.com", pattern: "http://*.google.com/*" });

  // Check path stuff.
  fail({ url: "http://mozilla.com/abc/def", pattern: "http://mozilla.com/" });
  pass({ url: "http://mozilla.com/abc/def", pattern: "http://mozilla.com/*" });
  pass({
    url: "http://mozilla.com/abc/def",
    pattern: "http://mozilla.com/a*f",
  });
  pass({ url: "http://mozilla.com/abc/def", pattern: "http://mozilla.com/a*" });
  pass({ url: "http://mozilla.com/abc/def", pattern: "http://mozilla.com/*f" });
  fail({ url: "http://mozilla.com/abc/def", pattern: "http://mozilla.com/*e" });
  fail({ url: "http://mozilla.com/abc/def", pattern: "http://mozilla.com/*c" });

  invalid({ pattern: "http:///a.html" });
  pass({ url: "file:///foo", pattern: "file:///foo*" });
  pass({ url: "file:///foo/bar.html", pattern: "file:///foo*" });

  pass({ url: "http://mozilla.org/a", pattern: "<all_urls>" });
  pass({ url: "https://mozilla.org/a", pattern: "<all_urls>" });
  pass({ url: "ftp://mozilla.org/a", pattern: "<all_urls>" });
  pass({ url: "file:///a", pattern: "<all_urls>" });
  fail({ url: "gopher://wuarchive.wustl.edu/a", pattern: "<all_urls>" });

  // Multiple patterns.
  pass({ url: "http://mozilla.org", pattern: ["http://mozilla.org/"] });
  pass({
    url: "http://mozilla.org",
    pattern: ["http://mozilla.org/", "http://mozilla.com/"],
  });
  pass({
    url: "http://mozilla.com",
    pattern: ["http://mozilla.org/", "http://mozilla.com/"],
  });
  fail({
    url: "http://mozilla.biz",
    pattern: ["http://mozilla.org/", "http://mozilla.com/"],
  });

  // Match url with fragments.
  pass({
    url: "http://mozilla.org/base#some-fragment",
    pattern: "http://mozilla.org/base",
  });

  // Match data:-URLs.
  pass({ url: "data:text/plain,foo", pattern: ["data:text/plain,foo"] });
  pass({ url: "data:text/plain,foo", pattern: ["data:text/plain,*"] });
  pass({
    url: "data:text/plain;charset=utf-8,foo",
    pattern: ["data:text/plain;charset=utf-8,foo"],
  });
  fail({
    url: "data:text/plain,foo",
    pattern: ["data:text/plain;charset=utf-8,foo"],
  });
  fail({
    url: "data:text/plain;charset=utf-8,foo",
    pattern: ["data:text/plain,foo"],
  });

  // Privileged matchers:
  invalid({ pattern: "about:foo" });
  invalid({ pattern: "resource://foo/*" });

  pass({
    url: "about:foo",
    pattern: ["about:foo", "about:foo*"],
    options: { restrictSchemes: false },
  });
  pass({
    url: "about:foo",
    pattern: ["about:foo*"],
    options: { restrictSchemes: false },
  });
  pass({
    url: "about:foobar",
    pattern: ["about:foo*"],
    options: { restrictSchemes: false },
  });

  pass({
    url: "resource://foo/bar",
    pattern: ["resource://foo/bar"],
    options: { restrictSchemes: false },
  });
  fail({
    url: "resource://fog/bar",
    pattern: ["resource://foo/bar"],
    options: { restrictSchemes: false },
  });
  fail({
    url: "about:foo",
    pattern: ["about:meh"],
    options: { restrictSchemes: false },
  });

  // Matchers for schemes without host should ignore ignorePath.
  pass({
    url: "about:reader?http://e.com/",
    pattern: ["about:reader*"],
    options: { ignorePath: true, restrictSchemes: false },
  });
  pass({ url: "data:,", pattern: ["data:,*"], options: { ignorePath: true } });

  // Matchers for schems without host should still match even if the explicit (host) flag is set.
  pass({
    url: "about:reader?explicit",
    pattern: ["about:reader*"],
    options: { restrictSchemes: false },
    explicit: true,
  });
  pass({
    url: "about:reader?explicit",
    pattern: ["about:reader?explicit"],
    options: { restrictSchemes: false },
    explicit: true,
  });
  pass({ url: "data:,explicit", pattern: ["data:,explicit"], explicit: true });
  pass({ url: "data:,explicit", pattern: ["data:,*"], explicit: true });

  // Matchers without "//" separator in the pattern.
  pass({ url: "data:text/plain;charset=utf-8,foo", pattern: ["data:*"] });
  pass({
    url: "about:blank",
    pattern: ["about:*"],
    options: { restrictSchemes: false },
  });
  pass({
    url: "view-source:https://example.com",
    pattern: ["view-source:*"],
    options: { restrictSchemes: false },
  });
  invalid({ pattern: ["chrome:*"], options: { restrictSchemes: false } });
  invalid({ pattern: "http:*" });

  // Matchers for unrecognized schemes.
  invalid({ pattern: "unknown-scheme:*" });
  pass({
    url: "unknown-scheme:foo",
    pattern: ["unknown-scheme:foo"],
    options: { restrictSchemes: false },
  });
  pass({
    url: "unknown-scheme:foo",
    pattern: ["unknown-scheme:*"],
    options: { restrictSchemes: false },
  });
  pass({
    url: "unknown-scheme://foo",
    pattern: ["unknown-scheme://foo"],
    options: { restrictSchemes: false },
  });
  pass({
    url: "unknown-scheme://foo",
    pattern: ["unknown-scheme://*"],
    options: { restrictSchemes: false },
  });
  pass({
    url: "unknown-scheme://foo",
    pattern: ["unknown-scheme:*"],
    options: { restrictSchemes: false },
  });
  pass({
    url: "unknown-scheme:/foo",
    pattern: ["unknown-scheme:/*"],
    options: { restrictSchemes: false },
  });
  fail({
    url: "unknown-scheme://foo",
    pattern: ["unknown-scheme:foo"],
    options: { restrictSchemes: false },
  });
  fail({
    url: "unknown-scheme:foo",
    pattern: ["unknown-scheme://foo"],
    options: { restrictSchemes: false },
  });
  fail({
    url: "unknown-scheme:foo",
    pattern: ["unknown-scheme://*"],
    options: { restrictSchemes: false },
  });
  fail({
    url: "unknown-scheme:foo",
    pattern: ["unknown-scheme:/*"],
    options: { restrictSchemes: false },
  });

  // Matchers for IPv6
  pass({ url: "http://[::1]/", pattern: ["http://[::1]/"] });
  pass({
    url: "http://[2a03:4000:6:310e:216:3eff:fe53:99b]/",
    pattern: ["http://[2a03:4000:6:310e:216:3eff:fe53:99b]/"],
  });
  fail({
    url: "http://[2:4:6:3:2:3:f:b]/",
    pattern: ["http://[2a03:4000:6:310e:216:3eff:fe53:99b]/"],
  });

  // Before fixing Bug 1529230, the only way to match a specific IPv6 url is by droping the brackets in pattern,
  // thus we keep this pattern valid for the sake of backward compatibility
  pass({ url: "http://[::1]/", pattern: ["http://::1/"] });
  pass({
    url: "http://[2a03:4000:6:310e:216:3eff:fe53:99b]/",
    pattern: ["http://2a03:4000:6:310e:216:3eff:fe53:99b/"],
  });
});

add_task(async function test_MatchPattern_overlaps() {
  function test(filter, hosts, optional) {
    filter = Array.prototype.concat.call(filter);
    hosts = Array.prototype.concat.call(hosts);
    optional = Array.prototype.concat.call(optional);

    const set = new MatchPatternSet([...hosts, ...optional]);
    const pat = new MatchPatternSet(filter);
    return set.overlapsAll(pat);
  }

  function pass({ filter = [], hosts = [], optional = [] }) {
    ok(
      test(filter, hosts, optional),
      `Expected overlap: ${filter}, ${hosts} (${optional})`
    );
  }

  function fail({ filter = [], hosts = [], optional = [] }) {
    ok(
      !test(filter, hosts, optional),
      `Expected no overlap: ${filter}, ${hosts} (${optional})`
    );
  }

  // Direct comparison.
  pass({ hosts: "http://ab.cd/", filter: "http://ab.cd/" });
  fail({ hosts: "http://ab.cd/", filter: "ftp://ab.cd/" });

  // Wildcard protocol.
  pass({ hosts: "*://ab.cd/", filter: "https://ab.cd/" });
  fail({ hosts: "*://ab.cd/", filter: "ftp://ab.cd/" });

  // Wildcard subdomain.
  pass({ hosts: "http://*.ab.cd/", filter: "http://ab.cd/" });
  pass({ hosts: "http://*.ab.cd/", filter: "http://www.ab.cd/" });
  fail({ hosts: "http://*.ab.cd/", filter: "http://ab.cd.ef/" });
  fail({ hosts: "http://*.ab.cd/", filter: "http://www.cd/" });

  // Wildcard subsumed.
  pass({ hosts: "http://*.ab.cd/", filter: "http://*.cd/" });
  fail({ hosts: "http://*.cd/", filter: "http://*.xy/" });

  // Subdomain vs substring.
  fail({ hosts: "http://*.ab.cd/", filter: "http://fake-ab.cd/" });
  fail({ hosts: "http://*.ab.cd/", filter: "http://*.fake-ab.cd/" });

  // Wildcard domain.
  pass({ hosts: "http://*/", filter: "http://ab.cd/" });
  fail({ hosts: "http://*/", filter: "https://ab.cd/" });

  // Wildcard wildcards.
  pass({ hosts: "<all_urls>", filter: "ftp://ab.cd/" });
  fail({ hosts: "<all_urls>" });

  // Multiple hosts.
  pass({ hosts: ["http://ab.cd/"], filter: ["http://ab.cd/"] });
  pass({ hosts: ["http://ab.cd/", "http://ab.xy/"], filter: "http://ab.cd/" });
  pass({ hosts: ["http://ab.cd/", "http://ab.xy/"], filter: "http://ab.xy/" });
  fail({ hosts: ["http://ab.cd/", "http://ab.xy/"], filter: "http://ab.zz/" });

  // Multiple Multiples.
  pass({
    hosts: ["http://*.ab.cd/"],
    filter: ["http://ab.cd/", "http://www.ab.cd/"],
  });
  pass({
    hosts: ["http://ab.cd/", "http://ab.xy/"],
    filter: ["http://ab.cd/", "http://ab.xy/"],
  });
  fail({
    hosts: ["http://ab.cd/", "http://ab.xy/"],
    filter: ["http://ab.cd/", "http://ab.zz/"],
  });

  // Optional.
  pass({ hosts: [], optional: "http://ab.cd/", filter: "http://ab.cd/" });
  pass({
    hosts: "http://ab.cd/",
    optional: "http://ab.xy/",
    filter: ["http://ab.cd/", "http://ab.xy/"],
  });
  fail({
    hosts: "http://ab.cd/",
    optional: "https://ab.xy/",
    filter: "http://ab.xy/",
  });
});

add_task(async function test_MatchGlob() {
  function test(url, pattern) {
    let m = new MatchGlob(pattern[0]);
    return m.matches(Services.io.newURI(url).spec);
  }

  function pass({ url, pattern }) {
    ok(
      test(url, pattern),
      `Expected match: ${JSON.stringify(pattern)}, ${url}`
    );
  }

  function fail({ url, pattern }) {
    ok(
      !test(url, pattern),
      `Expected no match: ${JSON.stringify(pattern)}, ${url}`
    );
  }

  let moz = "http://mozilla.org";

  pass({ url: moz, pattern: ["*"] });
  pass({ url: moz, pattern: ["http://*"] });
  pass({ url: moz, pattern: ["*mozilla*"] });
  // pass({url: moz, pattern: ["*example*", "*mozilla*"]});

  pass({ url: moz, pattern: ["*://*"] });
  pass({ url: "https://mozilla.org", pattern: ["*://*"] });

  // Documentation example
  pass({
    url: "http://www.example.com/foo/bar",
    pattern: ["http://???.example.com/foo/*"],
  });
  pass({
    url: "http://the.example.com/foo/",
    pattern: ["http://???.example.com/foo/*"],
  });
  fail({
    url: "http://my.example.com/foo/bar",
    pattern: ["http://???.example.com/foo/*"],
  });
  fail({
    url: "http://example.com/foo/",
    pattern: ["http://???.example.com/foo/*"],
  });
  fail({
    url: "http://www.example.com/foo",
    pattern: ["http://???.example.com/foo/*"],
  });

  // Matches path
  let path = moz + "/abc/def";
  pass({ url: path, pattern: ["*def"] });
  pass({ url: path, pattern: ["*c/d*"] });
  pass({ url: path, pattern: ["*org/abc*"] });
  fail({ url: path + "/", pattern: ["*def"] });

  // Trailing slash
  pass({ url: moz, pattern: ["*.org/"] });
  fail({ url: moz, pattern: ["*.org"] });

  // Wrong TLD
  fail({ url: moz, pattern: ["*oz*.com/"] });
  // Case sensitive
  fail({ url: moz, pattern: ["*.ORG/"] });
});

add_task(async function test_MatchGlob_redundant_wildcards_backtracking() {
  const slow_build =
    AppConstants.DEBUG || AppConstants.TSAN || AppConstants.ASAN;
  const first_limit = slow_build ? 200 : 30;
  {
    // Bug 1570868 - repeated * in tabs.query glob causes too much backtracking.
    let title = `Monster${"*".repeat(999)}Mash`;

    // The first run could take longer than subsequent runs, as the DFA is lazily created.
    let first_start = await getMainThreadCpuTime();
    let glob = new MatchGlob(title);
    let first_matches = glob.matches(title);
    let first_duration = (await getMainThreadCpuTime()) - first_start;
    ok(first_matches, `Expected match: ${title}, ${title}`);
    Assert.less(
      first_duration,
      first_limit,
      `First matching duration: ${first_duration}ms (limit: ${first_limit}ms)`
    );

    let start = await getMainThreadCpuTime();
    let matches = glob.matches(title);
    let duration = (await getMainThreadCpuTime()) - start;

    ok(matches, `Expected match: ${title}, ${title}`);
    Assert.less(duration, 10, `Matching duration: ${duration}ms`);
  }
  {
    // Similarly with any continuous combination of ?**???****? wildcards.
    let title = `Monster${"?*".repeat(999)}Mash`;

    // The first run could take longer than subsequent runs, as the DFA is lazily created.
    let first_start = await getMainThreadCpuTime();
    let glob = new MatchGlob(title);
    let first_matches = glob.matches(title);
    let first_duration = (await getMainThreadCpuTime()) - first_start;
    ok(first_matches, `Expected match: ${title}, ${title}`);
    Assert.less(
      first_duration,
      first_limit,
      `First matching duration: ${first_duration}ms (limit: ${first_limit}ms)`
    );

    let start = await getMainThreadCpuTime();
    let matches = glob.matches(title);
    let duration = (await getMainThreadCpuTime()) - start;

    ok(matches, `Expected match: ${title}, ${title}`);
    Assert.less(duration, 10, `Matching duration: ${duration}ms`);
  }
});

add_task(async function test_MatchPattern_subsumes() {
  function test(oldPat, newPat) {
    let m = new MatchPatternSet(oldPat);
    return m.subsumes(new MatchPattern(newPat));
  }

  function pass({ oldPat, newPat }) {
    ok(test(oldPat, newPat), `${JSON.stringify(oldPat)} subsumes "${newPat}"`);
  }

  function fail({ oldPat, newPat }) {
    ok(
      !test(oldPat, newPat),
      `${JSON.stringify(oldPat)} doesn't subsume "${newPat}"`
    );
  }

  pass({ oldPat: ["<all_urls>"], newPat: "*://*/*" });
  pass({ oldPat: ["<all_urls>"], newPat: "http://*/*" });
  pass({ oldPat: ["<all_urls>"], newPat: "http://*.example.com/*" });

  pass({ oldPat: ["*://*/*"], newPat: "http://*/*" });
  pass({ oldPat: ["*://*/*"], newPat: "wss://*/*" });
  pass({ oldPat: ["*://*/*"], newPat: "http://*.example.com/*" });

  pass({ oldPat: ["*://*.example.com/*"], newPat: "http://*.example.com/*" });
  pass({ oldPat: ["*://*.example.com/*"], newPat: "*://sub.example.com/*" });

  pass({ oldPat: ["https://*/*"], newPat: "https://*.example.com/*" });
  pass({
    oldPat: ["http://*.example.com/*"],
    newPat: "http://subdomain.example.com/*",
  });
  pass({
    oldPat: ["http://*.sub.example.com/*"],
    newPat: "http://sub.example.com/*",
  });
  pass({
    oldPat: ["http://*.sub.example.com/*"],
    newPat: "http://sec.sub.example.com/*",
  });
  pass({
    oldPat: ["http://www.example.com/*"],
    newPat: "http://www.example.com/path/*",
  });
  pass({
    oldPat: ["http://www.example.com/path/*"],
    newPat: "http://www.example.com/*",
  });

  fail({ oldPat: ["*://*/*"], newPat: "<all_urls>" });
  fail({ oldPat: ["*://*/*"], newPat: "ftp://*/*" });
  fail({ oldPat: ["*://*/*"], newPat: "file://*/*" });

  fail({ oldPat: ["http://example.com/*"], newPat: "*://example.com/*" });
  fail({ oldPat: ["http://example.com/*"], newPat: "https://example.com/*" });
  fail({
    oldPat: ["http://example.com/*"],
    newPat: "http://otherexample.com/*",
  });
  fail({ oldPat: ["http://example.com/*"], newPat: "http://*.example.com/*" });
  fail({
    oldPat: ["http://example.com/*"],
    newPat: "http://subdomain.example.com/*",
  });

  fail({
    oldPat: ["http://subdomain.example.com/*"],
    newPat: "http://example.com/*",
  });
  fail({
    oldPat: ["http://subdomain.example.com/*"],
    newPat: "http://*.example.com/*",
  });
  fail({
    oldPat: ["http://sub.example.com/*"],
    newPat: "http://*.sub.example.com/*",
  });

  fail({ oldPat: ["ws://example.com/*"], newPat: "wss://example.com/*" });
  fail({ oldPat: ["http://example.com/*"], newPat: "ws://example.com/*" });
  fail({ oldPat: ["https://example.com/*"], newPat: "wss://example.com/*" });
});

add_task(async function test_MatchPattern_matchesAllWebUrls() {
  function test(patterns, options) {
    let m = new MatchPatternSet(patterns, options);
    if (patterns.length === 1) {
      // Sanity check: with a single pattern, MatchPatternSet and MatchPattern
      // have equivalent outputs.
      equal(
        new MatchPattern(patterns[0], options).matchesAllWebUrls,
        m.matchesAllWebUrls,
        "matchesAllWebUrls() is consistent in MatchPattern and MatchPatternSet"
      );
    }
    return m.matchesAllWebUrls;
  }
  function pass(patterns, options) {
    ok(
      test(patterns, options),
      `${JSON.stringify(patterns)} ${
        options ? JSON.stringify(options) : ""
      } matches all web URLs`
    );
  }

  function fail(patterns, options) {
    ok(
      !test(patterns, options),
      `${JSON.stringify(patterns)} ${
        options ? JSON.stringify(options) : ""
      } doesn't match all web URLs`
    );
  }

  pass(["<all_urls>"]);
  pass(["*://*/*"]);
  pass(["*://*/"], { ignorePath: true });

  fail(["*://*/"]); // missing path wildcard.
  fail(["http://*/*"]);
  fail(["https://*/*"]);
  fail(["wss://*/*"]);
  fail(["ws://*/*"]);
  fail(["file://*/*"]);

  // Edge case: unusual number of wildcards in path.
  pass(["*://*/**"]);
  pass(["*://*/***"]);
  pass(["*://*/***"], { ignorePath: true });
  fail(["*://*//***"]);

  // After the singular cases, test non-single cases.
  fail([]);
  pass(["<all_urls>", "https://example.com/"]);
  pass(["https://example.com/", "http://example.com/", "*://*/*"]);

  pass(["https://*/*", "http://*/*"]);
  pass(["https://*/", "http://*/"], { ignorePath: true });
  fail(["https://*/", "http://*/"]); // missing path wildcard everywhere.
  fail(["https://*/*", "http://*/"]); // missing http://*/*.
  fail(["https://*/", "http://*/*"]); // missing https://*/*.
});

add_task(async function test_ExtensionGuardSet() {
  const globalGuard = new ExtensionGuardSet({
    deny: ["https://*.example.com/*"],
    source: "enterprise-global",
  });
  equal(globalGuard.source, "enterprise-global", "source round-trips");
  ok(MatchPatternSet.isInstance(globalGuard.deny), "deny is a MatchPatternSet");
  strictEqual(globalGuard.except, null, "except is null when not provided");

  const perExtGuard = new ExtensionGuardSet({
    deny: ["https://*.example.com/*"],
    except: ["https://other.example.com/*"],
    source: "enterprise-per-extension",
  });
  equal(
    perExtGuard.source,
    "enterprise-per-extension",
    "per-extension source round-trips"
  );
  ok(
    MatchPatternSet.isInstance(perExtGuard.except),
    "except is a MatchPatternSet when provided"
  );

  // denies() returns true when URI is in deny and not in except.
  ok(
    globalGuard.denies(Services.io.newURI("https://example.com/page")),
    "denies URI in deny set"
  );
  ok(
    !globalGuard.denies(Services.io.newURI("https://unrelated.example/")),
    "does not deny URI outside deny set"
  );

  // except overrides deny.
  ok(
    perExtGuard.denies(Services.io.newURI("https://www.example.com/page")),
    "denies URI in deny but not in except"
  );
  ok(
    !perExtGuard.denies(Services.io.newURI("https://other.example.com/page")),
    "does not deny URI covered by except"
  );

  // Empty except list is the same as no except.
  const emptyExceptGuard = new ExtensionGuardSet({
    deny: ["https://*.example.com/*"],
    except: [],
    source: "enterprise-global",
  });
  ok(
    emptyExceptGuard.denies(Services.io.newURI("https://example.com/page")),
    "empty except does not prevent denial"
  );
  strictEqual(emptyExceptGuard.except, null, "except is null for empty array");

  // Non-wildcard path in pattern is accepted; matching is origin-based only.
  const pathGuard = new ExtensionGuardSet({
    deny: ["https://example.com/admin"],
    source: "enterprise-global",
  });
  ok(
    pathGuard.denies(Services.io.newURI("https://example.com/other")),
    "path pattern denies other paths on same origin (paths ignored)"
  );
  ok(
    !pathGuard.denies(Services.io.newURI("https://other.example.com/admin")),
    "path pattern does not deny different origin"
  );

  // Empty deny list constructs successfully; denies() always returns false.
  const emptyDenyGuard = new ExtensionGuardSet({
    deny: [],
    source: "enterprise-global",
  });
  ok(
    !emptyDenyGuard.denies(Services.io.newURI("https://example.com/page")),
    "empty deny set never denies"
  );

  // Invalid source throws.
  Assert.throws(
    () =>
      new ExtensionGuardSet({
        deny: ["https://*.example.com/*"],
        source: "unknown",
      }),
    /is not a valid value for enumeration ExtensionGuardSource/,
    "invalid source value throws"
  );

  // Missing required deny throws.
  Assert.throws(
    () => new ExtensionGuardSet({ source: "enterprise-global" }),
    /Missing required.*deny/,
    "missing deny throws"
  );

  // Missing required source throws.
  Assert.throws(
    () => new ExtensionGuardSet({ deny: ["https://*.example.com/*"] }),
    /Missing required.*source/,
    "missing source throws"
  );

  // Invalid scheme in deny is rejected (verifies aRestrictSchemes = true).
  Assert.throws(
    () =>
      new ExtensionGuardSet({
        deny: ["resource://foo/*"],
        source: "enterprise-global",
      }),
    /NS_ERROR_ILLEGAL_VALUE/,
    "deny pattern with restricted scheme throws"
  );

  // Invalid scheme in except is rejected.
  Assert.throws(
    () =>
      new ExtensionGuardSet({
        deny: ["https://*.example.com/*"],
        except: ["chrome://foo/*"],
        source: "enterprise-global",
      }),
    /NS_ERROR_ILLEGAL_VALUE/,
    "except pattern with restricted scheme throws"
  );

  // Patterns without a path component (enterprise policy format) are accepted
  // and normalized to origin-based matching.
  const noPathGuard = new ExtensionGuardSet({
    deny: ["https://example.com"],
    source: "enterprise-global",
  });
  ok(
    noPathGuard.denies(Services.io.newURI("https://example.com/page")),
    "no-path deny pattern denies same-origin URLs"
  );
  ok(
    !noPathGuard.denies(Services.io.newURI("https://other.example/")),
    "no-path deny pattern does not deny other origins"
  );

  // Wildcard host without path (https://*) denies any https URL.
  const wildcardHostGuard = new ExtensionGuardSet({
    deny: ["https://*"],
    source: "enterprise-global",
  });
  ok(
    wildcardHostGuard.denies(Services.io.newURI("https://example.com/page")),
    "https://* denies https URL"
  );
  ok(
    wildcardHostGuard.denies(Services.io.newURI("https://other.test/")),
    "https://* denies any https host"
  );
  ok(
    !wildcardHostGuard.denies(Services.io.newURI("http://example.com/")),
    "https://* does not deny http URL"
  );

  // Wildcard scheme + host (*://*) denies http/https/ws/wss but not file:.
  const wildcardSchemeGuard = new ExtensionGuardSet({
    deny: ["*://*"],
    source: "enterprise-global",
  });
  ok(
    wildcardSchemeGuard.denies(Services.io.newURI("http://example.com/")),
    "*://* denies http URL"
  );
  ok(
    wildcardSchemeGuard.denies(Services.io.newURI("https://x.test/y")),
    "*://* denies https URL"
  );
  ok(
    !wildcardSchemeGuard.denies(Services.io.newURI("file:///tmp/x")),
    "*://* does not deny file URL (file not in wildcard schemes)"
  );

  // Subdomain wildcard without path (https://*.example.com) denies apex and subdomains.
  const subdomainGuard = new ExtensionGuardSet({
    deny: ["https://*.example.com"],
    source: "enterprise-global",
  });
  ok(
    subdomainGuard.denies(Services.io.newURI("https://example.com/")),
    "subdomain wildcard denies apex"
  );
  ok(
    subdomainGuard.denies(Services.io.newURI("https://sub.example.com/page")),
    "subdomain wildcard denies subdomain"
  );
  ok(
    !subdomainGuard.denies(Services.io.newURI("https://example.org/")),
    "subdomain wildcard does not deny different origin"
  );

  // Canonical file: pattern (file:///*) denies local file URLs.
  const fileGuard = new ExtensionGuardSet({
    deny: ["file:///*"],
    source: "enterprise-global",
  });
  ok(
    fileGuard.denies(Services.io.newURI("file:///etc/passwd")),
    "file:///* denies local file URL"
  );
  ok(
    !fileGuard.denies(Services.io.newURI("https://example.com/")),
    "file:///* does not deny https URL"
  );
});
