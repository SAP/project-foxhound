"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ExtensionPermissions: "resource://gre/modules/ExtensionPermissions.sys.mjs",
});

const FILE_DUMMY_URL = Services.io.newFileURI(
  do_get_file("data/dummy_page.html")
).spec;

// ExtensionContent.sys.mjs needs to know when it's running from xpcshell,
// to use the right timeout for content scripts executed at document_idle.
ExtensionTestUtils.mockAppInfo();

// Force opt in to true to verify the permission requirement across the test.
Services.prefs.setBoolPref(
  "extensions.webextensions.fileSchemeAccess.requireOptIn",
  true
);

async function grantInternalFileSchemePermission(extension) {
  await ExtensionPermissions.add(
    extension.id,
    { permissions: ["internal:fileSchemeAllowed"], origins: [] },
    // Note: Extension instance is required to be included here to enable the
    // permission change to be detected and be propagated to the child.
    extension.extension
  );
}

add_task(async function test_no_content_scripts_without_internal_permission() {
  let extensionWithoutPermission = ExtensionTestUtils.loadExtension({
    manifest: {
      content_scripts: [
        {
          matches: ["file:///*"],
          js: ["content_script_without_access.js"],
        },
      ],
    },
    files: {
      "content_script_without_access.js": () => {
        browser.test.fail("Should not run without internal file permission");
      },
    },
  });
  await extensionWithoutPermission.startup();

  // It is often tricky to verify that a content script has not run for the
  // right reasons. We will rely on the other tests in this test file to open
  // FILE_DUMMY_URL; if these other tests and extensions managed to run their
  // content scripts in FILE_DUMMY_URL and we do not, then that is conclusive
  // evidence that this extension was disallowed from running content scripts.
  registerCleanupFunction(() => extensionWithoutPermission.unload());
});

// XHR/fetch from content script to the page itself is allowed.
add_task(async function content_script_xhr_to_self() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      content_scripts: [
        {
          matches: ["file:///*"],
          js: ["content_script.js"],
        },
      ],
    },
    files: {
      "content_script.js": async () => {
        let response = await fetch(document.URL);
        browser.test.assertEq(200, response.status, "expected load");
        let responseText = await response.text();
        browser.test.assertTrue(
          responseText.includes("<p>Page</p>"),
          `expected file content in response of ${response.url}`
        );

        // Now with content.fetch:
        response = await content.fetch(document.URL);
        browser.test.assertEq(200, response.status, "expected load (content)");

        browser.test.sendMessage("done");
      },
    },
  });

  await extension.startup();
  await grantInternalFileSchemePermission(extension);

  let contentPage = await ExtensionTestUtils.loadContentPage(FILE_DUMMY_URL);
  await extension.awaitMessage("done");
  await contentPage.close();

  await extension.unload();
});

// XHR/fetch for other file is not allowed, even with file://-permissions.
add_task(async function content_script_xhr_to_other_file_not_allowed() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["file:///*"],
      content_scripts: [
        {
          matches: ["file:///*"],
          js: ["content_script.js"],
        },
      ],
    },
    files: {
      "content_script.js": async () => {
        let otherFileUrl = document.URL.replace(
          "dummy_page.html",
          "file_sample.html"
        );
        let x = new XMLHttpRequest();
        x.open("GET", otherFileUrl);
        await new Promise(resolve => {
          x.onloadend = resolve;
          x.send();
        });
        browser.test.assertEq(0, x.status, "expected error");
        browser.test.assertEq("", x.responseText, "request should fail");

        // Now with content.XMLHttpRequest.
        x = new content.XMLHttpRequest();
        x.open("GET", otherFileUrl);
        x.onloadend = () => {
          browser.test.assertEq(0, x.status, "expected error (content)");
          browser.test.sendMessage("done");
        };
        x.send();
      },
    },
  });

  await extension.startup();
  await grantInternalFileSchemePermission(extension);

  let contentPage = await ExtensionTestUtils.loadContentPage(FILE_DUMMY_URL);
  await extension.awaitMessage("done");
  await contentPage.close();

  await extension.unload();
});

// "file://" permission does not grant access to files in the extension page.
add_task(async function file_access_from_extension_page_not_allowed() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["file:///*"],
      description: FILE_DUMMY_URL,
    },
    async background() {
      const FILE_DUMMY_URL = browser.runtime.getManifest().description;

      await browser.test.assertRejects(
        fetch(FILE_DUMMY_URL),
        /NetworkError when attempting to fetch resource/,
        "block request to file from background page without internal permission"
      );

      await new Promise(resolve => {
        browser.test.onMessage.addListener(resolve);
        browser.test.sendMessage("wait_for_internal_permission_granted");
      });

      await browser.test.assertRejects(
        fetch(FILE_DUMMY_URL),
        /NetworkError when attempting to fetch resource/,
        "block request to file from background page despite file permission"
      );

      // Regression test for bug 1420296 .
      await browser.test.assertRejects(
        fetch(FILE_DUMMY_URL, { mode: "same-origin" }),
        /NetworkError when attempting to fetch resource/,
        "block request to file from background page despite 'same-origin' mode"
      );

      browser.test.sendMessage("done");
    },
  });

  await extension.startup();

  await extension.awaitMessage("wait_for_internal_permission_granted");
  await grantInternalFileSchemePermission(extension);
  extension.sendMessage("wait_for_internal_permission_granted:done");

  await extension.awaitMessage("done");

  await extension.unload();
});

// webRequest listeners should see subresource requests from file:-principals.
add_task(async function webRequest_script_request_from_file_principals() {
  // Extension without file:-permission should not see the request.
  let extensionWithoutFilePermission = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["http://example.net/", "webRequest"],
    },
    background() {
      browser.webRequest.onBeforeRequest.addListener(
        details => {
          browser.test.fail(`Unexpected request from ${details.originUrl}`);
        },
        { urls: ["http://example.net/intercept_by_webRequest.js"] }
      );
    },
  });

  // Extension with <all_urls> (which matches the resource URL at example.net
  // and the origin at file://*/*) can see the request.
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      permissions: ["<all_urls>", "webRequest", "webRequestBlocking"],
      web_accessible_resources: ["testDONE.html"],
    },
    background() {
      browser.webRequest.onBeforeRequest.addListener(
        ({ originUrl }) => {
          browser.test.assertTrue(
            /^file:.*file_do_load_script_subresource.html/.test(originUrl),
            `expected script to be loaded from a local file (${originUrl})`
          );
          let redirectUrl = browser.runtime.getURL("testDONE.html");
          return {
            redirectUrl: `data:text/javascript,location.href='${redirectUrl}';`,
          };
        },
        { urls: ["http://example.net/intercept_by_webRequest.js"] },
        ["blocking"]
      );
    },
    files: {
      "testDONE.html": `<!DOCTYPE html><script src="testDONE.js"></script>`,
      "testDONE.js"() {
        browser.test.sendMessage("webRequest_redirect_completed");
      },
    },
  });

  await extensionWithoutFilePermission.startup();
  // Granting the internal permission to make sure that the lack of access is
  // attributed to the lack of "file:" or "<all_urls>" permission, not due to
  // the lack of the internal permission:
  await grantInternalFileSchemePermission(extensionWithoutFilePermission);
  await extension.startup();
  // We are purposefully avoiding grantInternalFileSchemePermission(extension)
  // here, to verify that webRequest can observe requests initiated from
  // file:-URLs without requiring file access.

  let contentPage = await ExtensionTestUtils.loadContentPage(
    Services.io.newFileURI(
      do_get_file("data/file_do_load_script_subresource.html")
    ).spec
  );
  await extension.awaitMessage("webRequest_redirect_completed");
  await contentPage.close();

  await extension.unload();
  await extensionWithoutFilePermission.unload();
});
