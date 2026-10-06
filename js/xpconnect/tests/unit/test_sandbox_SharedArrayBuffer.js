/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { XPCShellContentUtils } = ChromeUtils.importESModule(
  "resource://testing-common/XPCShellContentUtils.sys.mjs"
);
XPCShellContentUtils.init(this);
const server = XPCShellContentUtils.createHttpServer();
const SERVER_ORIGIN = `http://localhost:${server.identity.primaryPort}`;
server.registerPathHandler("/isolated_yes", (req, res) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
});
server.registerPathHandler("/isolated_no", (req, res) => {
  // No COOP or COEP headers, implies not cross-origin isolated.
});

add_task(function test_system_sandbox() {
  let sand = Cu.Sandbox(Services.scriptSecurityManager.getSystemPrincipal());

  equal(
    Cu.evalInSandbox("new SharedArrayBuffer(1).byteLength", sand),
    1,
    "Can use SharedArrayBuffer in system principal"
  );
});

add_task(function test_null_principal_sandbox() {
  let sand = Cu.Sandbox(null);
  equal(
    Cu.evalInSandbox("typeof SharedArrayBuffer", sand),
    "undefined",
    "SharedArrayBuffer unavailable in null principal sandbox"
  );
});

add_task(async function test_cross_origin_isolated_window() {
  const contentPage = await XPCShellContentUtils.loadContentPage(
    `${SERVER_ORIGIN}/isolated_yes`
  );
  await contentPage.spawn([], () => {
    const window = content;
    Assert.ok(window.crossOriginIsolated, "Window is crossOriginIsolated");

    let sand1 = Cu.Sandbox([window.document.nodePrincipal], {
      sandboxPrototype: window,
    });
    Assert.equal(
      Cu.evalInSandbox("new SharedArrayBuffer(1).byteLength", sand1),
      1,
      "Sandbox with sandboxPrototype set to window can access SharedArrayBuffer"
    );

    let sand2 = Cu.Sandbox([window.document.nodePrincipal]);
    Assert.equal(
      Cu.evalInSandbox("typeof SharedArrayBuffer", sand2),
      "undefined",
      "Sandbox without window cannot access SharedArrayBuffer"
    );

    let sand3 = Cu.Sandbox(window);
    Assert.equal(
      Cu.evalInSandbox("typeof SharedArrayBuffer", sand3),
      "undefined",
      "Sandbox with window as principal arg, without sandboxPrototype, cannot access SharedArrayBuffer"
    );

    // SharedArrayBuffer not exposed to the sandbox's global, so a lookup is
    // triggered on sandboxPrototype. That fails because the null principal
    // is not allowed access to sandboxPrototype.
    let sand4 = Cu.Sandbox(null, { sandboxPrototype: window });
    Assert.throws(
      () => Cu.evalInSandbox("typeof SharedArrayBuffer", sand4),
      /Permission denied to access property "SharedArrayBuffer" on cross-origin object/,
      "Sandbox with window as sandboxPrototype not subsumed by principal cannot access SharedArrayBuffer"
    );

    // sandboxPrototype is often set to a window, but in theory it can be set
    // to an object from said window.
    let sand5 = Cu.Sandbox([window.document.nodePrincipal], {
      sandboxPrototype: Cu.createObjectIn(window),
    });
    Assert.equal(
      Cu.evalInSandbox("new SharedArrayBuffer(1).byteLength", sand5),
      1,
      "Sandbox with sandboxPrototype set to window's object can access SharedArrayBuffer"
    );
  });
  await contentPage.close();
});

add_task(async function test_non_cross_origin_isolated_window() {
  const contentPage = await XPCShellContentUtils.loadContentPage(
    `${SERVER_ORIGIN}/isolated_no`
  );
  await contentPage.spawn([], () => {
    const window = content;
    Assert.ok(!window.crossOriginIsolated, "Window is not crossOriginIsolated");
    let sand1 = Cu.Sandbox([window.document.nodePrincipal], {
      sandboxPrototype: window,
    });
    Assert.equal(
      Cu.evalInSandbox("typeof SharedArrayBuffer", sand1),
      "undefined",
      "Sandbox with window that is not crossOriginIsolated does not grant SharedArrayBuffer"
    );
  });
  await contentPage.close();
});
