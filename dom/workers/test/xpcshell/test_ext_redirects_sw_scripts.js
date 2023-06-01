/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const { TestUtils } = ChromeUtils.import(
  "resource://testing-common/TestUtils.jsm"
);

const { AddonTestUtils } = ChromeUtils.import(
  "resource://testing-common/AddonTestUtils.jsm"
);

const { ExtensionTestUtils } = ChromeUtils.import(
  "resource://testing-common/ExtensionXPCShellUtils.jsm"
);

const { createHttpServer } = AddonTestUtils;

// Force ServiceWorkerRegistrar to init by calling do_get_profile.
// (This has to be called before AddonTestUtils.init, because it does
// also call do_get_profile internally but it doesn't notify
// profile-after-change).
do_get_profile(true);

AddonTestUtils.init(this);
ExtensionTestUtils.init(this);

const server = createHttpServer({ hosts: ["localhost"] });

server.registerPathHandler("/page.html", (request, response) => {
  info(`/page.html is being requested: ${JSON.stringify(request)}`);
  response.write(`<!DOCTYPE html>`);
});

server.registerPathHandler("/sw.js", (request, response) => {
  info(`/sw.js is being requested: ${JSON.stringify(request)}`);
  response.setHeader("Content-Type", "application/javascript");
  response.write(`
    dump('Executing http://localhost/sw.js\\n');
    importScripts('sw-imported.js');
    dump('Executed importScripts from http://localhost/sw.js\\n');
  `);
});

server.registerPathHandler("/sw-imported.js", (request, response) => {
  info(`/sw-imported.js is being requested: ${JSON.stringify(request)}`);
  response.setHeader("Content-Type", "application/javascript");
  response.write(`
    dump('importScript loaded from http://localhost/sw-imported.js\\n');
    self.onmessage = evt => evt.ports[0].postMessage('original-imported-script'); 
  `);
});

Services.prefs.setBoolPref("dom.serviceWorkers.testing.enabled", true);
// Make sure this test file doesn't run with the legacy behavior by
// setting explicitly the expected default value.
Services.prefs.setBoolPref(
  "extensions.filterResponseServiceWorkerScript.disabled",
  false
);
registerCleanupFunction(() => {
  Services.prefs.clearUserPref("dom.serviceWorkers.testing.enabled");
  Services.prefs.clearUserPref(
    "extensions.filterResponseServiceWorkerScript.disabled"
  );
});

// Helper function used to be sure to clear any data that a previous test case
// may have left (e.g. service worker registration, cached service worker
// scripts).
//
// NOTE: Given that xpcshell test are running isolated from each other (unlike
// mochitests), we can just clear every storage type supported by clear data
// (instead of cherry picking what we want to clear based on the test cases
// part of this test file).
async function ensureDataCleanup() {
  info("Clear any service worker or data previous test cases may have left");
  await new Promise(resolve =>
    Services.clearData.deleteData(Ci.nsIClearDataService.CLEAR_ALL, resolve)
  );
}

// Note that the update algorithm (https://w3c.github.io/ServiceWorker/#update-algorithm)
// builds an "updatedResourceMap" as part of its check process. This means that only a
// single fetch will be performed for "sw-imported.js" as part of the update check and its
// resulting install invocation. The installation's call to importScripts when evaluated
// will load the script directly out of the Cache API.
function testSWUpdate(contentPage) {
  return contentPage.spawn([], async () => {
    const oldReg = await this.content.navigator.serviceWorker.ready;
    const reg = await oldReg.update();
    const sw = reg.installing || reg.waiting || reg.active;
    return new Promise(resolve => {
      const { port1, port2 } = new MessageChannel();
      port1.onmessage = evt => resolve(evt.data);
      sw.postMessage("worker-message", [port2]);
    });
  });
}

add_task(async function test_extension_invalid_sw_scripts_redirect_ignored() {
  const extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["<all_urls>", "webRequest", "webRequestBlocking"],
    },
    background() {
      browser.webRequest.onBeforeRequest.addListener(
        req => {
          if (req.url == "http://localhost/sw.js") {
            const filter = browser.webRequest.filterResponseData(req.requestId);
            filter.ondata = event => filter.write(event.data);
            filter.onstop = event => filter.disconnect();
            filter.onerror = () => {
              browser.test.sendMessage(
                "filter-response-error:mainscript",
                filter.error
              );
            };
            return {
              redirectUrl: browser.runtime.getURL("sw-unexpected-redirect.js"),
            };
          }

          if (req.url == "http://localhost/sw-imported.js") {
            const filter = browser.webRequest.filterResponseData(req.requestId);
            filter.ondata = event => filter.write(event.data);
            filter.onstop = event => filter.disconnect();
            filter.onerror = () => {
              browser.test.sendMessage(
                "filter-response-error:importscript",
                filter.error
              );
            };
            return { redirectUrl: "about:blank" };
          }

          return {};
        },
        { urls: ["http://localhost/sw.js", "http://localhost/sw-imported.js"] },
        ["blocking"]
      );
    },
    files: {
      "sw-unexpected-redirect.js": `
        dump('importScript redirected to moz-extension://UUID/sw-unexpected-redirect.js\\n');
        self.onmessage = evt => evt.ports[0].postMessage('sw-unexpected-redirect'); 
      `,
    },
  });

  // Start the test extension to redirect importScripts requests.
  await extension.startup();

  function awaitConsoleMessage(regexp) {
    return new Promise(resolve => {
      Services.console.registerListener(function listener(message) {
        if (regexp.test(message.message)) {
          Services.console.unregisterListener(listener);
          resolve(message);
        }
      });
    });
  }

  const awaitIgnoredMainScriptRedirect = awaitConsoleMessage(
    /Invalid redirectUrl .* on service worker main script/
  );
  const awaitIgnoredImportScriptRedirect = awaitConsoleMessage(
    /Invalid redirectUrl .* on service worker imported script/
  );

  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://localhost/page.html"
  );

  // Register the worker while the test extension isn't loaded and cannot
  // intercept and redirect the importedScripts requests.
  info("Register service worker from a content webpage");
  let workerMessage = await contentPage.spawn([], async () => {
    const reg = await this.content.navigator.serviceWorker.register("/sw.js");
    return new Promise(resolve => {
      const { port1, port2 } = new MessageChannel();
      port1.onmessage = evt => resolve(evt.data);
      const sw = reg.active || reg.waiting || reg.installing;
      sw.postMessage("worker-message", [port2]);
    });
  });

  equal(
    workerMessage,
    "original-imported-script",
    "Got expected worker reply (importScripts not intercepted)"
  );

  info("Wait for the expected error message on main script redirect");
  const errorMsg = await awaitIgnoredMainScriptRedirect;
  ok(errorMsg?.message, `Got error message: ${errorMsg?.message}`);
  ok(
    errorMsg?.message?.includes(extension.id),
    "error message should include the addon id"
  );
  ok(
    errorMsg?.message?.includes("http://localhost/sw.js"),
    "error message should include the sw main script url"
  );

  info("Wait for the expected error message on import script redirect");
  const errorMsg2 = await awaitIgnoredImportScriptRedirect;
  ok(errorMsg2?.message, `Got error message: ${errorMsg2?.message}`);
  ok(
    errorMsg2?.message?.includes(extension.id),
    "error message should include the addon id"
  );
  ok(
    errorMsg2?.message?.includes("http://localhost/sw-imported.js"),
    "error message should include the sw main script url"
  );

  info("Wait filterResponse error on main script");
  equal(
    await extension.awaitMessage("filter-response-error:mainscript"),
    "Invalid request ID",
    "Got expected error on main script"
  );
  info("Wait filterResponse error on import script");
  equal(
    await extension.awaitMessage("filter-response-error:importscript"),
    "Invalid request ID",
    "Got expected error on import script"
  );

  await extension.unload();
  await contentPage.close();
});

add_task(async function test_filter_sw_script() {
  const extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: [
        "<all_urls>",
        "webRequest",
        "webRequestBlocking",
        "webRequestFilterResponse.serviceWorkerScript",
      ],
    },
    background() {
      browser.webRequest.onBeforeRequest.addListener(
        req => {
          if (req.url == "http://localhost/sw.js") {
            const filter = browser.webRequest.filterResponseData(req.requestId);
            let decoder = new TextDecoder("utf-8");
            let encoder = new TextEncoder();
            filter.ondata = event => {
              let str = decoder.decode(event.data, { stream: true });
              browser.test.log(`Got filter ondata event: ${str}\n`);
              str = `
                dump('Executing filterResponse script for http://localhost/sw.js\\n');
                self.onmessage = evt => evt.ports[0].postMessage('filter-response-script');
                dump('Executed firlterResponse script for http://localhost/sw.js\\n');
              `;
              filter.write(encoder.encode(str));
              filter.disconnect();
            };
          }

          return {};
        },
        { urls: ["http://localhost/sw.js", "http://localhost/sw-imported.js"] },
        ["blocking"]
      );
    },
  });

  // Start the test extension to redirect importScripts requests.
  await extension.startup();

  await ensureDataCleanup();
  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://localhost/page.html"
  );

  let workerMessage = await contentPage.spawn([], async () => {
    const reg = await this.content.navigator.serviceWorker.register("/sw.js");
    return new Promise(resolve => {
      const { port1, port2 } = new MessageChannel();
      port1.onmessage = evt => resolve(evt.data);
      const sw = reg.active || reg.waiting || reg.installing;
      sw.postMessage("worker-message", [port2]);
    });
  });

  equal(
    workerMessage,
    "filter-response-script",
    "Got expected worker reply (filterResponse script)"
  );

  await extension.unload();
  workerMessage = await testSWUpdate(contentPage);
  equal(
    workerMessage,
    "original-imported-script",
    "Got expected worker reply (original script)"
  );

  await contentPage.close();
});

add_task(async function test_extension_redirect_sw_imported_script() {
  const extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["<all_urls>", "webRequest", "webRequestBlocking"],
      web_accessible_resources: ["sw-imported-1.js", "sw-imported-2.js"],
    },
    background() {
      let i = 1;
      browser.webRequest.onBeforeRequest.addListener(
        req => {
          browser.test.log(
            "Extension is redirecting http://localhost/sw-imported.js"
          );
          browser.test.sendMessage("request-redirected");
          return {
            redirectUrl: browser.runtime.getURL(`sw-imported-${i++}.js`),
          };
        },
        { urls: ["http://localhost/sw-imported.js"] },
        ["blocking"]
      );
    },
    files: {
      "sw-imported-1.js": `
        dump('importScript redirected to moz-extension://UUID/sw-imported1.js \\n');
        self.onmessage = evt => evt.ports[0].postMessage('redirected-imported-script-1'); 
      `,
      "sw-imported-2.js": `
        dump('importScript redirected to moz-extension://UUID/sw-imported2.js \\n');
        self.onmessage = evt => evt.ports[0].postMessage('redirected-imported-script-2'); 
      `,
    },
  });

  await ensureDataCleanup();
  const contentPage = await ExtensionTestUtils.loadContentPage(
    "http://localhost/page.html"
  );

  // Register the worker while the test extension isn't loaded and cannot
  // intercept and redirect the importedScripts requests.
  let workerMessage = await contentPage.spawn([], async () => {
    const reg = await this.content.navigator.serviceWorker.register("/sw.js");
    return new Promise(resolve => {
      const { port1, port2 } = new MessageChannel();
      port1.onmessage = evt => resolve(evt.data);
      const sw = reg.active || reg.waiting || reg.installing;
      sw.postMessage("worker-message", [port2]);
    });
  });

  equal(
    workerMessage,
    "original-imported-script",
    "Got expected worker reply (importScripts not intercepted)"
  );

  // Start the test extension to redirect importScripts requests.
  await extension.startup();

  // Trigger an update on the registered service worker, then assert that the
  // reply got is coming from the script where the extension is redirecting the
  // request.
  info("Update service worker and expect extension script to reply");
  workerMessage = await testSWUpdate(contentPage);
  await extension.awaitMessage("request-redirected");
  equal(
    workerMessage,
    "redirected-imported-script-1",
    "Got expected worker reply (importScripts redirected to moz-extension url)"
  );

  // Trigger a new update of the registered service worker, then assert that the
  // reply got is coming from a different script where the extension is
  // redirecting the second request (this confirms that the extension can
  // intercept and can change the redirected imported scripts on new service
  // worker updates).
  info("Update service worker and expect new extension script to reply");
  workerMessage = await testSWUpdate(contentPage);
  await extension.awaitMessage("request-redirected");
  equal(
    workerMessage,
    "redirected-imported-script-2",
    "Got expected worker reply (importScripts redirected to moz-extension url again)"
  );

  // Uninstall the extension and trigger one more update of the registered
  // service worker, then assert that the reply got is the one coming from the
  // server (because difference from the one got from the cache).
  // This verify that the service worker are updated as expected after the
  // extension is uninstalled and the worker is not stuck on the script where
  // the extension did redirect the request the last time.
  info(
    "Unload extension, update service worker and expect original script to reply"
  );
  await extension.unload();
  workerMessage = await testSWUpdate(contentPage);
  equal(
    workerMessage,
    "original-imported-script",
    "Got expected worker reply (importScripts not intercepted)"
  );

  await contentPage.close();
});
