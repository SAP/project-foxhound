/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);
const { IPPAuthProvider } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPPAuthProvider.sys.mjs"
);
const { IPPEnterpriseAuthProviderSingleton } = ChromeUtils.importESModule(
  "resource://testing-common/ipprotection/IPPEnterpriseAuthProvider.sys.mjs"
);

const GUARDIAN_ENDPOINT_PREF = "browser.ipProtection.guardian.endpoint";

do_get_profile();

/**
 * Services.felt is registered by browser/extensions/felt/api.js on enterprise
 * builds only. On the xpcshell runner it doesn't exist, so we install a fake
 * via defineProperty (plain sinon.stub requires the property to be present).
 *
 * @param {string} [token]
 */
/* eslint-disable mozilla/valid-services */
function installFakeFelt(token = "test-token") {
  const had = Object.prototype.hasOwnProperty.call(Services, "felt");
  const prev = had ? Services.felt : undefined;
  Object.defineProperty(Services, "felt", {
    value: { getAccessTokenIfValid: () => token },
    configurable: true,
    writable: true,
  });
  return {
    [Symbol.dispose]() {
      if (had) {
        Services.felt = prev;
      } else {
        delete Services.felt;
      }
    },
  };
}
/* eslint-enable mozilla/valid-services */

add_task(function test_overrides_all_IPPAuthProvider_members() {
  // eslint-disable-next-line no-unused-vars
  using _felt = installFakeFelt();
  const provider = new IPPEnterpriseAuthProviderSingleton();
  const baseProto = IPPAuthProvider.prototype;
  const subProto = Object.getPrototypeOf(provider);

  const members = Object.getOwnPropertyNames(baseProto).filter(
    name => name !== "constructor"
  );

  for (const name of members) {
    const baseDesc = Object.getOwnPropertyDescriptor(baseProto, name);
    const subDesc = Object.getOwnPropertyDescriptor(subProto, name);
    Assert.ok(
      subDesc,
      `IPPEnterpriseAuthProvider must define an own "${name}"`
    );
    if (baseDesc.value) {
      Assert.notStrictEqual(
        subDesc.value,
        baseDesc.value,
        `"${name}" must not inherit from IPPAuthProvider`
      );
    } else {
      Assert.notStrictEqual(
        subDesc.get,
        baseDesc.get,
        `"${name}" getter must not inherit from IPPAuthProvider`
      );
    }
  }
});

add_task(async function test_initOnStartupCompleted_notifies_listeners() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(IPProtectionService, "updateState");

  const provider = new IPPEnterpriseAuthProviderSingleton();

  let eventFired = false;
  provider.addEventListener("IPPAuthProvider:StateChanged", () => {
    eventFired = true;
  });

  await provider.initOnStartupCompleted();

  Assert.ok(eventFired, "IPPAuthProvider:StateChanged should be dispatched");
  Assert.ok(
    IPProtectionService.updateState.calledOnce,
    "IPProtectionService.updateState() should be called"
  );

  sandbox.restore();
});

add_task(async function test_fetchProxyPass_success() {
  // eslint-disable-next-line no-unused-vars
  using _felt = installFakeFelt();
  const server = new HttpServer();
  server.registerPathHandler("/api/v1/fpn/token", (request, response) => {
    Assert.equal(
      request.getHeader("Authorization"),
      "Bearer test-token",
      "Authorization header is forwarded from Services.felt"
    );
    response.setStatusLine(request.httpVersion, 200, "OK");
    response.setHeader("Cache-Control", "max-age=3600", false);
    response.write(JSON.stringify({ token: createProxyPassToken() }));
  });
  server.start(-1);
  Services.prefs.setCharPref(
    GUARDIAN_ENDPOINT_PREF,
    `http://localhost:${server.identity.primaryPort}`
  );

  try {
    const provider = new IPPEnterpriseAuthProviderSingleton();
    const { pass, status, usage, error } = await provider.fetchProxyPass();

    Assert.equal(status, 200, "status is 200");
    Assert.equal(error, undefined, "no error");
    Assert.equal(usage, null, "usage is null on the enterprise path");
    Assert.ok(pass, "pass is present");
    Assert.ok(pass.isValid(), "pass is valid");
  } finally {
    Services.prefs.clearUserPref(GUARDIAN_ENDPOINT_PREF);
    await new Promise(resolve => server.stop(resolve));
  }
});
