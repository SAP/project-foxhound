"use strict";

loadTestSubscript("head_devtools.js");

const { ExtensionPermissions } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionPermissions.sys.mjs"
);

const FILE_URL = Services.io.newFileURI(
  new FileUtils.File(getTestFilePath("file_dummy.html"))
).spec;

const EXTENSION_ID = "@test-devtools-eval-in-file-url";

async function do_test_devtools_inspectedWindow_eval_in_file_url(
  expectAllowed
) {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, FILE_URL);

  async function devtools_page() {
    try {
      const [evalResult, errorResult] =
        await browser.devtools.inspectedWindow.eval("location.protocol");
      if (browser.runtime.getManifest().name === "expect_eval_allowed") {
        browser.test.assertEq(undefined, errorResult, "eval should not fail");
        browser.test.assertEq("file:", evalResult, "eval should succeed");
      } else {
        browser.test.assertDeepEq(
          {
            isError: true,
            code: "E_PROTOCOLERROR",
            description: "Inspector protocol error: %s",
            details: [
              "This extension is not allowed on the current inspected window origin",
            ],
          },
          errorResult,
          "Expected error on eval failure"
        );
        browser.test.assertEq(undefined, evalResult, "eval should fail");
      }
      browser.test.notifyPass("inspectedWindow-eval-file");
    } catch (err) {
      browser.test.fail(`Error: ${err} :: ${err.stack}`);
      browser.test.notifyFail("inspectedWindow-eval-file");
    }
  }

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      name: expectAllowed ? "expect_eval_allowed" : "expect_eval_denied",
      browser_specific_settings: { gecko: { id: EXTENSION_ID } },
      devtools_page: "devtools_page.html",
    },
    files: {
      "devtools_page.html": `<!DOCTYPE html>
      <html>
       <head>
         <meta charset="utf-8">
         <script src="devtools_page.js"></script>
       </head>
      </html>`,
      "devtools_page.js": devtools_page,
    },
  });

  await extension.startup();

  await openToolboxForTab(tab);

  await extension.awaitFinish("inspectedWindow-eval-file");

  await closeToolboxForTab(tab);

  await extension.unload();

  BrowserTestUtils.removeTab(tab);
}

add_task(
  async function test_devtools_inspectedWindow_eval_in_file_url_allowed() {
    await ExtensionPermissions.add(EXTENSION_ID, {
      permissions: ["internal:fileSchemeAllowed"],
      origins: [],
    });
    await do_test_devtools_inspectedWindow_eval_in_file_url(
      /* expectAllowed */ true
    );
  }
);

add_task(
  async function test_devtools_inspectedWindow_eval_in_file_url_disallowed() {
    await do_test_devtools_inspectedWindow_eval_in_file_url(
      /* expectAllowed */ false
    );
  }
);
