/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

const { Preferences } = ChromeUtils.importESModule(
  "resource://gre/modules/Preferences.sys.mjs"
);

const ADDON_ID = "test@web.extension";

const aps = Cc["@mozilla.org/addons/policy-service;1"].getService(
  Ci.nsIAddonPolicyService
);

const v2_csp = Preferences.get(
  "extensions.webextensions.base-content-security-policy"
);

const v3_csp = Preferences.get(
  "extensions.webextensions.base-content-security-policy.v3"
);

const v3_with_localhost_csp = Preferences.get(
  "extensions.webextensions.base-content-security-policy.v3-with-localhost"
);

function getExpectedBaseCSP(manifestVersion, temporarilyInstalled) {
  if (manifestVersion === 2) {
    return v2_csp;
  }

  if (temporarilyInstalled) {
    return v3_with_localhost_csp;
  }

  return v3_csp;
}

add_task(async function test_invalid_addon_csp() {
  await Assert.throws(
    () => aps.getBaseCSP("invalid@missing"),
    /NS_ERROR_ILLEGAL_VALUE/,
    "no base csp for non-existent addon"
  );
  await Assert.throws(
    () => aps.getExtensionPageCSP("invalid@missing"),
    /NS_ERROR_ILLEGAL_VALUE/,
    "no extension page csp for non-existent addon"
  );
});

add_task(async function test_policy_csp() {
  equal(
    aps.defaultCSP,
    Preferences.get("extensions.webextensions.default-content-security-policy"),
    "Expected default CSP value"
  );

  const CUSTOM_POLICY = "script-src: 'self' https://xpcshell.test.custom.csp";

  let tests = [
    {
      name: "manifest version 2, no custom policy",
      policyData: {},
      expectedPolicy: aps.defaultCSP,
    },
    {
      name: "manifest version 2, no custom policy",
      policyData: {
        manifestVersion: 2,
      },
      expectedPolicy: aps.defaultCSP,
    },
    {
      name: "version 2 custom extension policy",
      policyData: {
        extensionPageCSP: CUSTOM_POLICY,
      },
      expectedPolicy: CUSTOM_POLICY,
    },
    {
      name: "manifest version 2 set, custom extension policy",
      policyData: {
        manifestVersion: 2,
        extensionPageCSP: CUSTOM_POLICY,
      },
      expectedPolicy: CUSTOM_POLICY,
    },
    {
      name: "manifest version 3, no custom policy",
      policyData: {
        manifestVersion: 3,
      },
      expectedPolicy: aps.defaultCSPV3,
    },
    {
      name: "manifest 3 version set, custom extensionPage policy",
      policyData: {
        manifestVersion: 3,
        extensionPageCSP: CUSTOM_POLICY,
      },
      expectedPolicy: CUSTOM_POLICY,
    },
    {
      name: "manifest 3 version set (temporary install), no custom policy",
      policyData: {
        manifestVersion: 3,
        temporarilyInstalled: true,
      },
      expectedPolicy: aps.defaultCSPV3,
    },
    {
      name: "manifest 3 version set (temporary install), custom extensionPage policy",
      policyData: {
        manifestVersion: 3,
        temporarilyInstalled: true,
        extensionPageCSP: `script-src 'self' https://127.0.0.1 https://localhost`,
      },
      expectedPolicy: `script-src 'self' https://127.0.0.1 https://localhost`,
    },
  ];

  let policy = null;

  function setExtensionCSP({
    manifestVersion,
    extensionPageCSP,
    temporarilyInstalled,
  }) {
    if (policy) {
      policy.active = false;
    }

    policy = new WebExtensionPolicy({
      id: ADDON_ID,
      mozExtensionHostname: ADDON_ID,
      baseURL: "file:///",

      allowedOrigins: new MatchPatternSet([]),
      localizeCallback() {},

      temporarilyInstalled,
      manifestVersion,
      extensionPageCSP,
    });

    policy.active = true;
  }

  for (let test of tests) {
    info(test.name);
    setExtensionCSP(test.policyData);

    let expectedBaseCSP = getExpectedBaseCSP(
      test.policyData.manifestVersion ?? 2,
      !!test.policyData.temporarilyInstalled
    );

    equal(aps.getBaseCSP(ADDON_ID), expectedBaseCSP, "baseCSP is correct");
    equal(
      aps.getExtensionPageCSP(ADDON_ID),
      test.expectedPolicy,
      "extensionPageCSP is correct"
    );
  }
});

add_task(async function test_extension_csp() {
  ExtensionTestUtils.failOnSchemaWarnings(false);

  let extension_pages = "script-src 'self'; img-src 'none'";

  let tests = [
    {
      name: "manifest_v2 invalid csp results in default csp used",
      manifest: {
        content_security_policy: `script-src 'none'`,
      },
      expectedPolicy: aps.defaultCSP,
    },
    {
      name: "manifest_v2 allows https protocol",
      manifest: {
        manifest_version: 2,
        content_security_policy: `script-src 'self' https://example.com`,
      },
      expectedPolicy: `script-src 'self' https://example.com`,
    },
    {
      name: "manifest_v2 allows unsafe-eval",
      manifest: {
        manifest_version: 2,
        content_security_policy: `script-src 'self' 'unsafe-eval'`,
      },
      expectedPolicy: `script-src 'self' 'unsafe-eval'`,
    },
    {
      name: "manifest_v2 allows wasm-unsafe-eval",
      manifest: {
        manifest_version: 2,
        content_security_policy: `script-src 'self' 'wasm-unsafe-eval'`,
      },
      expectedPolicy: `script-src 'self' 'wasm-unsafe-eval'`,
    },
    {
      // object-src used to require local sources, but now we accept anything.
      name: "manifest_v2 allows object-src, with non-local sources",
      manifest: {
        manifest_version: 2,
        content_security_policy: `script-src 'self'; object-src https:'`,
      },
      expectedPolicy: `script-src 'self'; object-src https:'`,
    },
    {
      name: "manifest_v3 invalid csp results in default csp used",
      manifest: {
        manifest_version: 3,
        content_security_policy: {
          extension_pages: `script-src 'none'`,
        },
      },
      expectedPolicy: aps.defaultCSPV3,
    },
    {
      name: "manifest_v3 forbidden protocol results in default csp used",
      manifest: {
        manifest_version: 3,
        content_security_policy: {
          extension_pages: `script-src 'self' https://*`,
        },
      },
      expectedPolicy: aps.defaultCSPV3,
    },
    {
      name: "manifest_v3 forbidden eval results in default csp used",
      manifest: {
        manifest_version: 3,
        content_security_policy: {
          extension_pages: `script-src 'self' 'unsafe-eval'`,
        },
      },
      expectedPolicy: aps.defaultCSPV3,
    },
    {
      name: "manifest_v3 disallows localhost",
      manifest: {
        manifest_version: 3,
        content_security_policy: {
          extension_pages: `script-src 'self' https://localhost`,
        },
      },
      expectedPolicy: aps.defaultCSPV3,
    },
    {
      name: "manifest_v3 disallows 127.0.0.1",
      manifest: {
        manifest_version: 3,
        content_security_policy: {
          extension_pages: `script-src 'self' https://127.0.0.1`,
        },
      },
      expectedPolicy: aps.defaultCSPV3,
    },
    {
      name: "manifest_v3 allows localhost when temporarily installed",
      temporarilyInstalled: true,
      manifest: {
        manifest_version: 3,
        content_security_policy: {
          extension_pages: `script-src 'self' https://127.0.0.1 https://localhost`,
        },
      },
      expectedPolicy: `script-src 'self' https://127.0.0.1 https://localhost`,
    },
    {
      name: "manifest_v3 allows 127.0.0.1 when temporarily installed",
      temporarilyInstalled: true,
      manifest: {
        manifest_version: 3,
        content_security_policy: {
          extension_pages: `script-src 'self' https://127.0.0.1`,
        },
      },
      expectedPolicy: `script-src 'self' https://127.0.0.1`,
    },
    {
      name: "manifest_v3 allows wasm-unsafe-eval",
      manifest: {
        manifest_version: 3,
        content_security_policy: {
          extension_pages: `script-src 'self' 'wasm-unsafe-eval'`,
        },
      },
      expectedPolicy: `script-src 'self' 'wasm-unsafe-eval'`,
    },
    {
      // object-src used to require local sources, but now we accept anything.
      name: "manifest_v3 allows object-src, with non-local sources",
      manifest: {
        manifest_version: 3,
        content_security_policy: {
          extension_pages: `script-src 'self'; object-src https:'`,
        },
      },
      expectedPolicy: `script-src 'self'; object-src https:'`,
    },
    {
      name: "manifest_v2 csp",
      manifest: {
        manifest_version: 2,
        content_security_policy: extension_pages,
      },
      expectedPolicy: extension_pages,
    },
    {
      name: "manifest_v2 with no csp, expect default",
      manifest: {
        manifest_version: 2,
      },
      expectedPolicy: aps.defaultCSP,
    },
    {
      name: "manifest_v3 used with no csp, expect default",
      manifest: {
        manifest_version: 3,
      },
      expectedPolicy: aps.defaultCSPV3,
    },
    {
      name: "manifest_v3 syntax used",
      manifest: {
        manifest_version: 3,
        content_security_policy: {
          extension_pages,
        },
      },
      expectedPolicy: extension_pages,
    },
  ];

  for (let test of tests) {
    info(test.name);
    let extension = ExtensionTestUtils.loadExtension({
      manifest: test.manifest,
      temporarilyInstalled: !!test.temporarilyInstalled,
    });
    await extension.startup();
    let policy = WebExtensionPolicy.getByID(extension.id);

    const expectedBaseCSP = getExpectedBaseCSP(
      policy.manifestVersion,
      policy.temporarilyInstalled
    );

    equal(policy.baseCSP, expectedBaseCSP, "baseCSP is correct");

    equal(
      policy.extensionPageCSP,
      test.expectedPolicy,
      "extensionPageCSP is correct."
    );

    await extension.unload();
  }

  ExtensionTestUtils.failOnSchemaWarnings(true);
});
