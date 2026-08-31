"use strict";

const server = createHttpServer({ hosts: ["example.com"] });
server.registerPathHandler("/dummy", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/html", false);
  response.write("<!DOCTYPE html><html></html>");
});

// contentScript is serialized and run as a content script.
async function testContentScript(contentScript) {
  async function runContentScript(contentScriptFn) {
    try {
      await contentScriptFn();
    } catch (e) {
      browser.test.fail(`Unexpected error: ${e}`);
    }
    browser.test.sendMessage("done");
  }
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      content_scripts: [
        {
          js: ["contentscript.js"],
          run_at: "document_end",
          matches: ["*://example.com/dummy"],
        },
      ],
    },
    files: {
      "contentscript.js": `(${runContentScript})(${contentScript})`,
    },
  });
  await extension.startup();

  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/dummy"
  );
  await extension.awaitMessage("done");
  await contentPage.close();

  await extension.unload();
}

add_task(async function test_document_adoptedStyleSheets_assign_array() {
  await testContentScript(async () => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync("body { color: pink; }");
    document.adoptedStyleSheets = [sheet];

    browser.test.assertEq(
      "rgb(255, 192, 203)",
      getComputedStyle(document.body).color,
      "Style applied through array assignment to adoptedStyleSheets"
    );
  });
});

add_task(async function test_document_adoptedStyleSheets_push_sheet() {
  await testContentScript(async () => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync("body { color: pink; }");
    document.adoptedStyleSheets.push(sheet);

    browser.test.assertEq(
      "rgb(255, 192, 203)",
      getComputedStyle(document.body).color,
      "Style applied through document.adoptedStyleSheets.push(sheet)"
    );
  });
});

add_task(async function test_document_adoptedStyleSheets_assign_index() {
  await testContentScript(async () => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync("body { color: pink; }");
    document.adoptedStyleSheets[0] = sheet;

    browser.test.assertEq(
      "rgb(255, 192, 203)",
      getComputedStyle(document.body).color,
      "Style applied through document.adoptedStyleSheets[0] = sheet"
    );
  });
});

// Test that adoptedStyleSheets is shared between content script and web page.
add_task(async function test_document_adoptedStyleSheets_visibility() {
  await testContentScript(async () => {
    // eslint-disable-next-line no-eval
    window.eval(`{
      const sheet = new CSSStyleSheet();
      sheet.replaceSync("body { color: yellow; }");
      document.adoptedStyleSheets = [sheet];
    }`);
    browser.test.assertEq(
      "body { color: yellow; }",
      document.adoptedStyleSheets[0].cssRules[0].cssText,
      "adoptedStyleSheets from page is visible in content script"
    );

    const sheet = new CSSStyleSheet();
    sheet.replaceSync("body { color: pink; }");
    document.adoptedStyleSheets.push(sheet);

    browser.test.assertEq(
      "body { color: pink; }",
      // eslint-disable-next-line no-eval
      window.eval(`document.adoptedStyleSheets[1].cssRules[0].cssText`),
      "adoptedStyleSheets from content script is visible in page"
    );

    document.adoptedStyleSheets = [];
    browser.test.assertEq(
      0,
      // eslint-disable-next-line no-eval
      window.eval(`document.adoptedStyleSheets.length`),
      "adoptedStyleSheets length in page is 0 after assigning []"
    );
  });
});

// For completeness, verify behavior against shadowRoot.adoptedStyleSheets, in
// case its implementation may differ from document.adoptedStyleSheets.
add_task(async function test_shadowRoot_adoptedStyleSheets() {
  await testContentScript(async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const shadowRoot = host.attachShadow({ mode: "closed" });

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(":host { color: pink; }");
    shadowRoot.adoptedStyleSheets = [sheet];

    browser.test.assertEq(
      "rgb(255, 192, 203)",
      getComputedStyle(host).color,
      "Style applied on shadowRoot.adoptedStyleSheets"
    );
  });
});

add_task(async function test_adoptedStyleSheets_protected_by_xrays() {
  await testContentScript(async () => {
    // eslint-disable-next-line no-eval
    window.eval(`
      Array.prototype.customProp = 1;
      Array.prototype.push = () => { throw new Error("Intercepted!"); };
      Array.prototype[Symbol.iterator] = () => { throw new Error("No iter!"); };
    `);
    const sheet = new CSSStyleSheet();
    sheet.replaceSync("body { color: pink; }");
    // Should not be intercepted by web page.
    document.adoptedStyleSheets.push(sheet);

    browser.test.assertEq(1, document.adoptedStyleSheets.length, "Has style");

    document.adoptedStyleSheets = [];
    browser.test.assertEq(0, document.adoptedStyleSheets.length, "Cleared");

    browser.test.assertThrows(
      () => {
        // As a sanity check, verify behavior of JSXrayTraits::defineProperty.
        document.adoptedStyleSheets.pop = () => {};
      },
      "Not allowed to define cross-origin object as property on [Object] or [Array] XrayWrapper",
      "document.adoptedStyleSheets is a JS XrayWrapper"
    );

    browser.test.assertEq(
      undefined,
      document.adoptedStyleSheets.customProp,
      "XrayWrapper hides custom property on adoptedStyleSheets"
    );
    browser.test.assertEq(
      1,
      document.adoptedStyleSheets.wrappedJSObject.customProp,
      "With Xrays waived, custom property exposed on adoptedStyleSheets"
    );

    let proto = Object.getPrototypeOf(document.adoptedStyleSheets);
    browser.test.assertTrue(
      proto === window.Array.prototype,
      "Prototype is window's Array.prototype"
    );
    browser.test.assertTrue(
      proto !== Array.prototype,
      "Prototype is distinct from the content script's Array.prototype"
    );
  });
});
