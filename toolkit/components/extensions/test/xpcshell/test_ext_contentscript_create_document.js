"use strict";

const server = createHttpServer({ hosts: ["example.com"] });

server.registerPathHandler("/dummy", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/html", false);
  response.write("<!DOCTYPE html><html></html>");
});

// Exposes the assertDocumentPrincipalSameAsWebpage helper to the test page,
// and waits for the extension script in the page to report test completion.
async function runPrincipalTest(contentPage) {
  await contentPage.spawn([], async () => {
    const assertDocumentPrincipalSameAsWebpage = createdDocument => {
      const objPrincipal = Cu.getObjectPrincipal(createdDocument);
      Assert.ok(
        objPrincipal.equals(content.document.nodePrincipal),
        `Doc object has same principal as web page: ${objPrincipal.origin}`
      );

      const docPrincipal = Cu.unwaiveXrays(createdDocument).nodePrincipal;
      Assert.ok(
        docPrincipal.equals(content.document.nodePrincipal),
        `Doc nodePrincipal is same principal as web page: ${docPrincipal.origin}`
      );
    };
    Cu.exportFunction(assertDocumentPrincipalSameAsWebpage, content, {
      defineAs: "assertDocumentPrincipalSameAsWebpage",
    });
    await new Promise(resolve => {
      Cu.exportFunction(resolve, content, { defineAs: "reportTestDone" });

      // Now let the extension script (content script, user script, etc) know
      // about the existence of the test helpers so that it can run the test
      // that relies on assertDocumentPrincipalSameAsWebpage, and then signal
      // completion when it is done.
      content.document.dispatchEvent(new content.CustomEvent("helper_ready"));
    });
  });
}

async function grantUserScriptsPermission(extensionId) {
  // userScripts is optional-only, and we must grant it. See comment at
  // grantUserScriptsPermission in test_ext_userScripts_mv3_availability.js.
  const { ExtensionPermissions } = ChromeUtils.importESModule(
    "resource://gre/modules/ExtensionPermissions.sys.mjs"
  );
  await ExtensionPermissions.add(extensionId, {
    permissions: ["userScripts"],
    origins: [],
  });
}

// Regression test for https://bugzilla.mozilla.org/show_bug.cgi?id=1912587
// Document.parseHTMLUnsafe and Document.parseHTML should not crash, but return
// a document (with the same principal as the document, not the expanded
// principal of the sandbox).
add_task(async function test_Document_parseHTML_and_parseHTMLUnsafe() {
  const extension = ExtensionTestUtils.loadExtension({
    manifest: {
      content_scripts: [
        {
          run_at: "document_end",
          matches: ["http://example.com/dummy"],
          js: ["contentscript.js"],
        },
      ],
    },
    files: {
      "contentscript.js": async () => {
        if (!window.wrappedJSObject.assertDocumentPrincipalSameAsWebpage) {
          await new Promise(resolve => {
            document.addEventListener("helper_ready", resolve, { once: true });
          });
        }

        function checkDocument(doc) {
          browser.test.assertTrue(
            HTMLDocument.isInstance(doc),
            "Is HTMLDocument"
          );
          browser.test.assertTrue(doc.wrappedJSObject, "Doc is a XrayWrapper");
          window.wrappedJSObject.assertDocumentPrincipalSameAsWebpage(doc);
        }

        browser.test.log("Testing Document.parseHTML");
        checkDocument(Document.parseHTML("<html></html>"));

        browser.test.log("Testing Document.parseHTMLUnsafe");
        checkDocument(Document.parseHTMLUnsafe("<html></html>"));

        window.wrappedJSObject.reportTestDone();
      },
    },
  });

  await extension.startup();

  const contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/dummy"
  );
  await runPrincipalTest(contentPage);

  await extension.unload();
  await contentPage.close();
});

add_task(async function test_Document_parseHTML_in_mv2_userscript_sandbox() {
  const extension = ExtensionTestUtils.loadExtension({
    manifest: {
      user_scripts: {},
      permissions: ["http://example.com/*"],
    },
    background: async () => {
      await browser.userScripts.register({
        runAt: "document_end",
        matches: ["http://example.com/dummy"],
        js: [{ file: "userscript_mv2.js" }],
      });
      browser.test.sendMessage("user_scripts_registered");
    },
    files: {
      "userscript_mv2.js": async () => {
        if (!window.wrappedJSObject.assertDocumentPrincipalSameAsWebpage) {
          await new Promise(resolve => {
            document.addEventListener("helper_ready", resolve, { once: true });
          });
        }

        // browser.test unavailable in user scripts, run document checks only.
        function checkDocument(doc) {
          window.wrappedJSObject.assertDocumentPrincipalSameAsWebpage(doc);
        }
        checkDocument(Document.parseHTML("<html></html>"));
        checkDocument(Document.parseHTMLUnsafe("<html></html>"));
        window.wrappedJSObject.reportTestDone();
      },
    },
  });

  await extension.startup();
  await extension.awaitMessage("user_scripts_registered");
  const contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/dummy"
  );
  await runPrincipalTest(contentPage);
  await contentPage.close();
  await extension.unload();
});

add_task(async function test_Document_parseHTML_in_mv3_userscript_sandbox() {
  const extensionId = "@test_Document_parseHTML_in_mv3_userscript_sandbox";
  await grantUserScriptsPermission(extensionId);
  const extension = ExtensionTestUtils.loadExtension({
    manifest: {
      browser_specific_settings: { gecko: { id: extensionId } },
      manifest_version: 3,
      optional_permissions: ["userScripts"],
      host_permissions: ["http://example.com/*"],
    },
    background() {
      browser.runtime.onInstalled.addListener(async () => {
        await browser.userScripts.register([
          {
            id: "mv3_userscript",
            runAt: "document_end",
            matches: ["http://example.com/dummy"],
            js: [{ file: "userscript_mv3.js" }],
          },
        ]);
        browser.test.sendMessage("user_scripts_registered");
      });
    },
    files: {
      "userscript_mv3.js": async () => {
        if (!window.wrappedJSObject.assertDocumentPrincipalSameAsWebpage) {
          await new Promise(resolve => {
            document.addEventListener("helper_ready", resolve, { once: true });
          });
        }

        // browser.test unavailable in user scripts, run document checks only.
        function checkDocument(doc) {
          window.wrappedJSObject.assertDocumentPrincipalSameAsWebpage(doc);
        }
        checkDocument(Document.parseHTML("<html></html>"));
        checkDocument(Document.parseHTMLUnsafe("<html></html>"));
        window.wrappedJSObject.reportTestDone();
      },
    },
  });

  await extension.startup();
  await extension.awaitMessage("user_scripts_registered");
  const contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/dummy"
  );
  await runPrincipalTest(contentPage);
  await contentPage.close();
  await extension.unload();
});

// Lower level test for Document.parseHTML / Document.parseHTMLUnsafe where
// Document is a Sandbox-specific instance independent of any window.
// This is just for completeness of test coverage, it is not something that
// users ever ought to experience in practice. We are just making sure that
// a reasonable error is thrown instead of crashing.
add_task(async function test_Document_parseHTML_in_sandbox_without_window() {
  const principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(
      "https://example.com"
    );
  let sandbox = Cu.Sandbox([principal], {
    wantGlobalProperties: ["Document"],
  });
  Assert.ok(
    Cu.getObjectPrincipal(sandbox).isExpandedPrincipal,
    "Sandbox has an expanded principal"
  );
  function evalInSandbox(code) {
    return Cu.evalInSandbox(
      code,
      sandbox,
      /* version */ null,
      /* filename */ null,
      /* lineNo */ null,
      // We need to opt out of enforceFilenameRestrictions, in order to be able
      // to evaluate code in the system principal in the parent process.
      /* enforceFilenameRestrictions */ false
    );
  }

  Assert.throws(
    () => evalInSandbox(`Document.parseHTML("<html></html>");`),
    /NS_ERROR_UNEXPECTED/,
    "Document.parseHTML without window should throw"
  );
  Assert.throws(
    () => evalInSandbox(`Document.parseHTMLUnsafe("<html></html>");`),
    /NS_ERROR_UNEXPECTED/,
    "Document.parseHTMLUnsafe without window should throw"
  );
});

// Testing what happens when Document.parseHTMLUnsafe is called in a sandbox
// that has no direct connection (e.g. sandboxPrototype) to the window:
// - If the sandbox principal subsumes the received Document, the created
//   document has the same principal as the Document instance.
// - If the sandbox principal does not subsume the received Document, the API
//   call throws.
add_task(async function test_Document_parseHTML_in_sandbox_with_window() {
  const contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/dummy"
  );
  await contentPage.spawn([], () => {
    let sandbox = Cu.Sandbox([content.document.nodePrincipal]);
    Assert.ok(
      Cu.getObjectPrincipal(sandbox).isExpandedPrincipal,
      "Sandbox has an expanded principal"
    );
    sandbox.windowReference = content;
    // Although the sandbox does not have a Document instance, it can invoke
    // Document.parseHTMLUnsafe when it receives a window.
    const createdDocument = Cu.evalInSandbox(
      `windowReference.Document.parseHTMLUnsafe("<html></html>");`,
      sandbox
    );
    const objPrincipal = Cu.getObjectPrincipal(createdDocument);
    Assert.ok(
      objPrincipal.equals(content.document.nodePrincipal),
      `Doc object has same principal as web page: ${objPrincipal.origin}`
    );

    const docPrincipal = Cu.unwaiveXrays(createdDocument).nodePrincipal;
    Assert.ok(
      docPrincipal.equals(content.document.nodePrincipal),
      `Doc nodePrincipal is same principal as web page: ${docPrincipal.origin}`
    );

    // As a sanity check, verify that Document.parseHTML cannot be called when
    // the Document instance comes from a principal that is not subsumed by
    // the sandbox's principal.
    //
    // The other checks in this test file reach into the implementation of
    // Document.parseHTMLUnsafe, ultimately into Document::CreateHTMLDocument.
    // But the check below does not get that far; it is already stopped at the
    // bindings level. That's good enough for us - as long as access is denied.
    info("Verifying that sandbox that does not subsume the doc cannot use it");
    const nullPrincipal = Services.scriptSecurityManager.createNullPrincipal(
      {}
    );
    const nullSandbox = Cu.Sandbox([nullPrincipal]);
    nullSandbox.crossOriginDocument = content.Document;
    Assert.throws(
      () =>
        Cu.evalInSandbox(
          `crossOriginDocument.parseHTMLUnsafe("<html></html>");`,
          nullSandbox
        ),
      /Permission denied to access property "parseHTMLUnsafe"/,
      "Document.parseHTMLUnsafe from non-subsuming principal cannot be used"
    );
  });
  await contentPage.close();
});
