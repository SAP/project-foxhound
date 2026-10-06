/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

"use strict";

const { IPProtectionService, IPProtectionStates } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs"
);
const { ERRORS, IPPProxyManager, IPPProxyStates } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs"
);
const { ProxyPass } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/GuardianTypes.sys.mjs"
);
const { IPProtectionActivator } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPProtectionActivator.sys.mjs"
);
const { IPPEnterpriseAuthProvider } = ChromeUtils.importESModule(
  "resource://testing-common/ipprotection/IPPEnterpriseAuthProvider.sys.mjs"
);
IPProtectionActivator.removeHelpers();
IPProtectionActivator.setupHelpers();
IPProtectionActivator.setAuthProvider(IPPEnterpriseAuthProvider);

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

/* exported waitForEvent */
function waitForEvent(target, eventName, callback = () => true) {
  return new Promise(resolve => {
    let listener = () => {
      if (callback()) {
        target.removeEventListener(eventName, listener);
        resolve();
      }
    };
    target.addEventListener(eventName, listener);
  });
}

function createProxyPassToken(
  from = Temporal.Now.instant(),
  until = from.add({ hours: 24 })
) {
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    iat: Math.floor(from.add({ seconds: 1 }).epochMilliseconds / 1000),
    nbf: Math.floor(from.epochMilliseconds / 1000),
    exp: Math.floor(until.epochMilliseconds / 1000),
    sub: "proxy-pass-user-42",
    aud: "guardian-proxy",
    iss: "vpn.mozilla.org",
  };
  const encode = obj => btoa(JSON.stringify(obj));
  return [encode(header), encode(body), "signature"].join(".");
}

/* exported setupStubs */
function setupStubs(sandbox) {
  sandbox.stub(IPPEnterpriseAuthProvider, "fetchProxyPass").resolves({
    status: 200,
    error: undefined,
    pass: new ProxyPass(createProxyPassToken()),
    usage: null,
  });
}
