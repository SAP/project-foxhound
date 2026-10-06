"use strict";

const { setEnterpriseGuards } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionPermissions.sys.mjs"
);

const { newURI } = Services.io;

function makePolicy({ id, uuid, allowedOrigins = [] }) {
  return new WebExtensionPolicy({
    id,
    mozExtensionHostname: uuid,
    baseURL: `moz-extension://${uuid}/`,
    localizeCallback: str => str,
    allowedOrigins: new MatchPatternSet(allowedOrigins),
  });
}

const server = createHttpServer({ hosts: ["guard.example.com"] });
server.registerPathHandler("/ok", (req, res) => {
  res.setStatusLine(req.httpVersion, 200, "OK");
  res.write("ok");
});

add_task(async function test_no_guards() {
  let policy = makePolicy({
    id: "ext@test",
    uuid: "aaaaaaaa-0000-0000-0000-000000000001",
    allowedOrigins: ["https://*.example.com/*"],
  });
  policy.active = true;

  deepEqual(
    policy.guardSets,
    [],
    "guardSets is empty with no enterprise guards"
  );
  strictEqual(
    policy.checkGuarded(newURI("https://example.com/")),
    null,
    "checkGuarded returns null when no guards set"
  );
  ok(
    policy.canAccessURI(newURI("https://example.com/")),
    "canAccessURI returns true with no guards"
  );

  policy.active = false;
});

add_task(async function test_empty_blocked_hosts() {
  let policy = makePolicy({
    id: "ext@empty",
    uuid: "aaaaaaaa-0000-0000-0000-000000000020",
    allowedOrigins: ["https://*.example.com/*"],
  });
  policy.active = true;

  setEnterpriseGuards({
    "*": { runtime_blocked_hosts: [], runtime_allowed_hosts: [] },
  });

  equal(policy.guardSets.length, 1, "guard set is constructed even when empty");
  strictEqual(
    policy.checkGuarded(newURI("https://example.com/")),
    null,
    "empty deny list does not block anything"
  );
  ok(
    policy.canAccessURI(newURI("https://example.com/")),
    "canAccessURI returns true with empty deny list"
  );

  policy.active = false;
  setEnterpriseGuards({});
});

add_task(async function test_global_guard_applied_to_active_policy() {
  let policy = makePolicy({
    id: "ext@test",
    uuid: "aaaaaaaa-0000-0000-0000-000000000002",
    allowedOrigins: ["https://*.example.com/*"],
  });
  policy.active = true;

  setEnterpriseGuards({
    "*": {
      runtime_blocked_hosts: ["https://*.example.com/*"],
      runtime_allowed_hosts: [],
    },
  });

  equal(policy.guardSets.length, 1, "one guard set from global entry");
  strictEqual(
    policy.checkGuarded(newURI("https://example.com/page")),
    "enterprise-global",
    "URL in deny list returns enterprise-global"
  );
  ok(
    !policy.canAccessURI(newURI("https://example.com/page")),
    "canAccessURI returns false for URL denied by guard"
  );
  strictEqual(
    policy.checkGuarded(newURI("https://example.org/")),
    null,
    "URL on different domain returns null"
  );

  policy.active = false;
  setEnterpriseGuards({});
});

add_task(async function test_per_extension_overrides_global() {
  let policyX = makePolicy({
    id: "ext-x@test",
    uuid: "aaaaaaaa-0000-0000-0000-000000000003",
    allowedOrigins: ["<all_urls>"],
  });
  let policyY = makePolicy({
    id: "ext-y@test",
    uuid: "aaaaaaaa-0000-0000-0000-000000000004",
    allowedOrigins: ["<all_urls>"],
  });
  policyX.active = true;
  policyY.active = true;

  setEnterpriseGuards({
    "*": {
      runtime_blocked_hosts: ["https://*.global.example/*"],
      runtime_allowed_hosts: [],
    },
    "ext-x@test": {
      runtime_blocked_hosts: ["https://*.perext.example/*"],
      runtime_allowed_hosts: [],
    },
  });

  equal(policyX.guardSets.length, 1, "ext-x has exactly one guard");
  strictEqual(
    policyX.checkGuarded(newURI("https://perext.example/page")),
    "enterprise-per-extension",
    "ext-x: URL in per-ext deny returns enterprise-per-extension"
  );
  ok(
    !policyX.canAccessURI(newURI("https://perext.example/page")),
    "ext-x: canAccessURI returns false for URL denied by per-ext guard"
  );
  strictEqual(
    policyX.checkGuarded(newURI("https://global.example/page")),
    null,
    "ext-x: global deny has no effect when per-ext guard overrides"
  );
  ok(
    policyX.canAccessURI(newURI("https://global.example/page")),
    "ext-x: canAccessURI returns true for URL not denied by per-ext guard"
  );

  equal(policyY.guardSets.length, 1, "ext-y falls back to global guard");
  strictEqual(
    policyY.checkGuarded(newURI("https://global.example/page")),
    "enterprise-global",
    "ext-y: global deny returns enterprise-global"
  );
  ok(
    !policyY.canAccessURI(newURI("https://global.example/page")),
    "ext-y: canAccessURI returns false for URL denied by global guard"
  );
  strictEqual(
    policyY.checkGuarded(newURI("https://perext.example/page")),
    null,
    "ext-y: per-ext entry does not affect ext-y"
  );
  ok(
    policyY.canAccessURI(newURI("https://perext.example/page")),
    "ext-y: canAccessURI returns true for URL not denied by global guard"
  );

  policyX.active = false;
  policyY.active = false;
  setEnterpriseGuards({});
});

add_task(async function test_per_extension_only_no_fallback() {
  let policyA = makePolicy({
    id: "ext-a@test",
    uuid: "aaaaaaaa-0000-0000-0000-000000000005",
    allowedOrigins: ["https://*.example.com/*"],
  });
  let policyB = makePolicy({
    id: "ext-b@test",
    uuid: "aaaaaaaa-0000-0000-0000-000000000006",
    allowedOrigins: ["https://*.example.com/*"],
  });
  policyA.active = true;
  policyB.active = true;

  setEnterpriseGuards({
    "ext-a@test": {
      runtime_blocked_hosts: ["https://*.example.com/*"],
      runtime_allowed_hosts: [],
    },
  });

  equal(policyA.guardSets.length, 1, "ext-a has its per-extension guard");
  ok(
    !policyA.canAccessURI(newURI("https://example.com/")),
    "ext-a: canAccessURI returns false for URL denied by per-ext guard"
  );
  equal(policyB.guardSets.length, 0, "ext-b has no guard (no global fallback)");
  ok(
    policyB.canAccessURI(newURI("https://example.com/")),
    "ext-b: canAccessURI returns true with no guard applied"
  );

  policyA.active = false;
  policyB.active = false;
  setEnterpriseGuards({});
});

add_task(async function test_default_guard_instance_is_shared() {
  let policy1 = makePolicy({
    id: "ext-s1@test",
    uuid: "aaaaaaaa-0000-0000-0000-000000000023",
    allowedOrigins: ["<all_urls>"],
  });
  let policy2 = makePolicy({
    id: "ext-s2@test",
    uuid: "aaaaaaaa-0000-0000-0000-000000000024",
    allowedOrigins: ["<all_urls>"],
  });
  policy1.active = true;
  policy2.active = true;

  setEnterpriseGuards({
    "*": {
      runtime_blocked_hosts: ["https://*.example.com/*"],
      runtime_allowed_hosts: [],
    },
  });

  equal(policy1.guardSets.length, 1, "policy1 has one guard");
  equal(policy2.guardSets.length, 1, "policy2 has one guard");
  strictEqual(
    policy1.guardSets[0],
    policy2.guardSets[0],
    "policies using the default share the same ExtensionGuardSet instance"
  );

  policy1.active = false;
  policy2.active = false;
  setEnterpriseGuards({});
});

add_task(async function test_except_overrides_deny() {
  let policy = makePolicy({
    id: "ext@except",
    uuid: "aaaaaaaa-0000-0000-0000-000000000007",
    allowedOrigins: ["https://*.example.com/*"],
  });
  policy.active = true;

  setEnterpriseGuards({
    "*": {
      runtime_blocked_hosts: ["https://*.example.com/*"],
      runtime_allowed_hosts: ["https://allowed.example.com/*"],
    },
  });

  strictEqual(
    policy.checkGuarded(newURI("https://blocked.example.com/")),
    "enterprise-global",
    "URL in deny but not in except returns enterprise-global"
  );
  ok(
    !policy.canAccessURI(newURI("https://blocked.example.com/")),
    "canAccessURI returns false for URL denied by guard"
  );
  strictEqual(
    policy.checkGuarded(newURI("https://allowed.example.com/")),
    null,
    "URL in except returns null"
  );
  ok(
    policy.canAccessURI(newURI("https://allowed.example.com/")),
    "canAccessURI returns true for URL carved out by except"
  );

  policy.active = false;
  setEnterpriseGuards({});
});

add_task(async function test_clear_guards() {
  let policy = makePolicy({
    id: "clear@test",
    uuid: "aaaaaaaa-0000-0000-0000-000000000008",
    allowedOrigins: ["https://*.example.com/*"],
  });
  policy.active = true;

  setEnterpriseGuards({
    "*": {
      runtime_blocked_hosts: ["https://*.example.com/*"],
      runtime_allowed_hosts: [],
    },
  });
  strictEqual(
    policy.checkGuarded(newURI("https://example.com/")),
    "enterprise-global",
    "URL is blocked (enterprise-global) after setting guards"
  );
  ok(
    !policy.canAccessURI(newURI("https://example.com/")),
    "canAccessURI returns false after setting guards"
  );

  setEnterpriseGuards({});
  deepEqual(policy.guardSets, [], "guardSets is empty after clearing");
  strictEqual(
    policy.checkGuarded(newURI("https://example.com/")),
    null,
    "URL is unblocked after clearing"
  );
  ok(
    policy.canAccessURI(newURI("https://example.com/")),
    "canAccessURI returns true after clearing guards"
  );

  policy.active = false;
});

add_task(async function test_replace_guards_at_runtime() {
  let policyA = makePolicy({
    id: "ext-a@replace",
    uuid: "aaaaaaaa-0000-0000-0000-000000000021",
    allowedOrigins: ["<all_urls>"],
  });
  let policyB = makePolicy({
    id: "ext-b@replace",
    uuid: "aaaaaaaa-0000-0000-0000-000000000025",
    allowedOrigins: ["<all_urls>"],
  });
  policyA.active = true;
  policyB.active = true;

  // Initial: global guard + per-extension guard for policyA only.
  setEnterpriseGuards({
    "*": {
      runtime_blocked_hosts: ["https://*.first.example/*"],
      runtime_allowed_hosts: [],
    },
    "ext-a@replace": {
      runtime_blocked_hosts: ["https://*.perext.example/*"],
      runtime_allowed_hosts: [],
    },
  });

  equal(
    policyA.guardSets[0].source,
    "enterprise-per-extension",
    "policyA has per-extension guard"
  );
  ok(
    !policyA.canAccessURI(newURI("https://perext.example/")),
    "policyA: per-ext guard blocks perext.example"
  );
  ok(
    policyA.canAccessURI(newURI("https://first.example/")),
    "policyA: per-ext guard overrides global, first.example unblocked"
  );
  equal(
    policyB.guardSets[0].source,
    "enterprise-global",
    "policyB falls back to global guard"
  );
  ok(
    !policyB.canAccessURI(newURI("https://first.example/")),
    "policyB: global guard blocks first.example"
  );
  ok(
    policyB.canAccessURI(newURI("https://perext.example/")),
    "policyB: global guard does not block perext.example"
  );

  // Replace: only global guard, no per-extension entry for policyA.
  setEnterpriseGuards({
    "*": {
      runtime_blocked_hosts: ["https://*.second.example/*"],
      runtime_allowed_hosts: [],
    },
  });

  equal(
    policyA.guardSets[0].source,
    "enterprise-global",
    "policyA fell back to global guard after per-ext entry removed"
  );
  ok(
    policyA.canAccessURI(newURI("https://perext.example/")),
    "policyA: per-ext guard fully removed, perext.example now allowed"
  );
  ok(
    !policyA.canAccessURI(newURI("https://second.example/")),
    "policyA: new global guard blocks second.example"
  );
  ok(
    policyA.canAccessURI(newURI("https://first.example/")),
    "policyA: old global guard removed, first.example now allowed"
  );
  ok(
    !policyB.canAccessURI(newURI("https://second.example/")),
    "policyB: new global guard blocks second.example"
  );

  policyA.active = false;
  policyB.active = false;
  setEnterpriseGuards({});
});

add_task(async function test_malformed_pattern_does_not_propagate() {
  let policy = makePolicy({
    id: "ext@malformed",
    uuid: "aaaaaaaa-0000-0000-0000-000000000022",
    allowedOrigins: ["https://*.example.com/*"],
  });
  policy.active = true;
  setEnterpriseGuards({});

  Assert.throws(
    () =>
      setEnterpriseGuards({
        "*": {
          runtime_blocked_hosts: ["not-a-valid-pattern"],
          runtime_allowed_hosts: [],
        },
      }),
    /NS_ERROR_ILLEGAL_VALUE/,
    "setEnterpriseGuards throws on malformed pattern"
  );

  equal(policy.guardSets.length, 0, "malformed guard not applied to policy");
  ok(
    policy.canAccessURI(newURI("https://example.com/")),
    "policy access unaffected by failed guard"
  );
  equal(
    0,
    Services.ppmm.sharedData.get("extensions/guards").size,
    "sharedData not populated with malformed guard"
  );

  policy.active = false;
  setEnterpriseGuards({});
});

add_task(async function test_loadExtension_picks_up_existing_guards() {
  setEnterpriseGuards({
    "*": {
      runtime_blocked_hosts: ["https://*.example.com/*"],
      runtime_allowed_hosts: [],
    },
  });

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: { gecko: { id: "startup-guard@test" } },
      host_permissions: ["https://*.example.com/*"],
    },
    background() {
      browser.test.notifyPass("started");
    },
  });
  await extension.startup();
  await extension.awaitFinish("started");

  let policy = WebExtensionPolicy.getByID("startup-guard@test");
  equal(
    policy.guardSets.length,
    1,
    "extension picks up pre-set guard on startup"
  );
  strictEqual(
    policy.checkGuarded(newURI("https://example.com/")),
    "enterprise-global",
    "guard is active for extension started after guards were set"
  );
  ok(
    !policy.canAccessURI(newURI("https://example.com/")),
    "canAccessURI returns false for guarded URL after startup"
  );

  await extension.unload();
  setEnterpriseGuards({});
});

add_task(
  async function test_setEnterpriseGuards_propagates_to_loaded_extension() {
    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        browser_specific_settings: { gecko: { id: "propagate-guard@test" } },
        host_permissions: ["https://*.example.com/*"],
      },
      background() {
        browser.test.notifyPass("started");
      },
    });
    await extension.startup();
    await extension.awaitFinish("started");

    let policy = WebExtensionPolicy.getByID("propagate-guard@test");
    equal(policy.guardSets.length, 0, "no guards before setEnterpriseGuards");

    setEnterpriseGuards({
      "*": {
        runtime_blocked_hosts: ["https://*.example.com/*"],
        runtime_allowed_hosts: [],
      },
    });

    equal(
      policy.guardSets.length,
      1,
      "guard applied to already-loaded extension"
    );
    equal(
      policy.guardSets[0].source,
      "enterprise-global",
      "guard source is enterprise-global"
    );
    strictEqual(
      policy.checkGuarded(newURI("https://example.com/")),
      "enterprise-global",
      "guard is active after setEnterpriseGuards on loaded extension"
    );
    ok(
      !policy.canAccessURI(newURI("https://example.com/")),
      "canAccessURI returns false after guard applied to loaded extension"
    );

    await extension.unload();
    setEnterpriseGuards({});
  }
);
