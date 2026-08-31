/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

// Bug 1714201 - Extension requests should respect HTTPS-Only exceptions.
"use strict";
/* global browser */

add_task(async function test_extension_exemption() {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.security.https_only_mode", true]],
  });

  await SpecialPowers.pushPermissions([
    {
      type: "https-only-load-insecure",
      allow: true,
      // eslint-disable-next-line @microsoft/sdl/no-insecure-url
      context: "http://example.com",
    },
  ]);

  let ext = ExtensionTestUtils.loadExtension({
    manifest: {},
    async background() {
      let r1 = await fetch(
        // eslint-disable-next-line @microsoft/sdl/no-insecure-url
        "http://example.org/browser/dom/security/test/https-only/file_cors.sjs"
      );
      let r2 = await fetch(
        // eslint-disable-next-line @microsoft/sdl/no-insecure-url
        "http://example.com/browser/dom/security/test/https-only/file_cors.sjs"
      );
      browser.test.sendMessage("results", [r1.url, r2.url]);
    },
  });
  await ext.startup();

  let [urlWithoutException, urlWithException] =
    await ext.awaitMessage("results");
  ok(
    urlWithoutException.startsWith("https://"),
    `Without exception, request should be upgraded (got: ${urlWithoutException})`
  );
  ok(
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    urlWithException.startsWith("http://"),
    `With exception, request should not be upgraded (got: ${urlWithException})`
  );

  await ext.unload();
  await SpecialPowers.popPermissions();
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_content_script_not_exempted() {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.security.https_only_mode", true]],
  });

  await SpecialPowers.pushPermissions([
    {
      type: "https-only-load-insecure",
      allow: true,
      // eslint-disable-next-line @microsoft/sdl/no-insecure-url
      context: "http://example.org",
    },
  ]);

  let ext = ExtensionTestUtils.loadExtension({
    manifest: {
      host_permissions: ["<all_urls>"],
      content_scripts: [
        {
          matches: ["https://example.com/*"],
          js: ["cs.js"],
        },
      ],
    },
    files: {
      "cs.js": async function () {
        // The fetch() call here is allowed due to it running with the expanded
        // principal containing the extension principal, which enables requests
        // through host_permissions declared above. Notably, CORS from the
        // server does not have any effect (bug 1605197).
        // But we intentionally do NOT want the extension principal's ability
        // to bypass https-only (with "https-only-load-insecure") to
        // automatically apply to content scripts, so we expect https-only to
        // still apply here.
        let r1 = await fetch(
          // eslint-disable-next-line @microsoft/sdl/no-insecure-url
          "http://example.org/browser/dom/security/test/https-only/file_cors.sjs"
        );
        browser.test.assertTrue(
          r1.url.startsWith("https:"),
          `fetch() must still be upgraded despite destination exception (got: ${r1.url})`
        );

        // content.fetch uses the web page's principal.
        // This is also the default behavior for MV3 extensions.
        let r2 = await content.fetch(
          // eslint-disable-next-line @microsoft/sdl/no-insecure-url
          "http://example.org/browser/dom/security/test/https-only/file_cors.sjs"
        );
        browser.test.assertTrue(
          r2.url.startsWith("https:"),
          `content.fetch() must still be upgraded despite destination exception (got: ${r2.url})`
        );

        browser.test.sendMessage("cs-done");
      },
    },
  });

  await ext.startup();

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/"
  );

  await ext.awaitMessage("cs-done");

  BrowserTestUtils.removeTab(tab);
  await ext.unload();
  await SpecialPowers.popPermissions();
  await SpecialPowers.popPrefEnv();
});

// Same as above but the page loads as http:// because of the exception.
// The exception principal (http://example.com) matches the triggering principal,
// so subresource exemption propagates to all fetches from the page.
add_task(async function test_content_script_http_page() {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.security.https_only_mode", true]],
  });

  await SpecialPowers.pushPermissions([
    {
      type: "https-only-load-insecure",
      allow: true,
      // eslint-disable-next-line @microsoft/sdl/no-insecure-url
      context: "http://example.com",
    },
  ]);

  let ext = ExtensionTestUtils.loadExtension({
    manifest: {
      host_permissions: ["<all_urls>"],
      content_scripts: [
        {
          // eslint-disable-next-line @microsoft/sdl/no-insecure-url
          matches: ["http://example.com/*"],
          js: ["cs.js"],
        },
      ],
    },
    files: {
      "cs.js": async function () {
        // The page exemption propagates to all subresource fetches.
        let r1 = await fetch(
          // eslint-disable-next-line @microsoft/sdl/no-insecure-url
          "http://example.org/browser/dom/security/test/https-only/file_cors.sjs"
        );
        browser.test.assertTrue(
          // eslint-disable-next-line @microsoft/sdl/no-insecure-url
          r1.url.startsWith("http:"),
          `page exception must propagate to subresource fetches (got: ${r1.url})`
        );

        // content.fetch uses the web page's principal.
        // This is also the default behavior for MV3 extensions.
        let r2 = await content.fetch(
          // eslint-disable-next-line @microsoft/sdl/no-insecure-url
          "http://example.org/browser/dom/security/test/https-only/file_cors.sjs"
        );
        browser.test.assertTrue(
          // eslint-disable-next-line @microsoft/sdl/no-insecure-url
          r2.url.startsWith("http:"),
          `page exception must propagate to subresource fetches (got: ${r2.url})`
        );

        browser.test.sendMessage("cs-done");
      },
    },
  });

  await ext.startup();

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://example.com/"
  );

  await ext.awaitMessage("cs-done");

  BrowserTestUtils.removeTab(tab);
  await ext.unload();
  await SpecialPowers.popPermissions();
  await SpecialPowers.popPrefEnv();
});
