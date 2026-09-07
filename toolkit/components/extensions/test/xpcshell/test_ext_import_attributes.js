"use strict";

// This test verifies that JSON and CSS modules can be imported using import
// attributes in content scripts and extension pages.
const server = createHttpServer({ hosts: ["example.com"] });

const testHtml = `
  <!DOCTYPE html>
  <html>
  <meta charset=utf-8>
  <title>Test synthetic modules</title>
  <body>
  </body></html>`;

server.registerPathHandler("/test.html", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/html", false);
  response.write(testHtml);
});

add_task(async function test_synthetic_modules() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      content_scripts: [
        {
          matches: ["http://example.com/test.html"],
          js: ["content.js"],
        },
      ],
    },

    files: {
      "data.json": JSON.stringify({ name: "test", value: 42 }),
      "styles.css": "body { color: red; }",
      "styles.txt": "body { color: red; }",
      "content.js": async function () {
        try {
          const jsonUrl = browser.runtime.getURL("data.json");
          const data = await import(jsonUrl, { with: { type: "json" } });
          browser.test.assertDeepEq({ name: "test", value: 42 }, data.default);
        } catch (e) {
          browser.test.fail(`JSON module import failed: ${e.message}`);
        }

        const cssUrl = browser.runtime.getURL("styles.css");
        await browser.test.assertRejects(
          import(cssUrl, { with: { type: "css" } }),
          "CSS module scripts not supported when there is no window",
          "CSS module import should fail without window"
        );

        browser.test.sendMessage("content-done");
      },
      "page.html": `<!DOCTYPE html>
        <html>
        <meta charset=utf-8>
        <title>Extension page</title>
        <body>
        <script src="page.js"></script>
        </body></html>`,
      "page.js": async function () {
        try {
          const jsonUrl = browser.runtime.getURL("data.json");
          const data = await import(jsonUrl, { with: { type: "json" } });
          browser.test.assertDeepEq({ name: "test", value: 42 }, data.default);
        } catch (e) {
          browser.test.fail(
            `JSON module import failed in extension page: ${e.message}`
          );
        }

        try {
          const cssUrl = browser.runtime.getURL("styles.css");
          const styles = await import(cssUrl, { with: { type: "css" } });
          browser.test.assertTrue(
            styles.default instanceof CSSStyleSheet,
            "css import returns a CSSStyleSheet"
          );
          browser.test.assertEq(
            "body { color: red; }",
            styles.default.cssRules[0].cssText,
            "Expected style.css content"
          );
        } catch (e) {
          browser.test.fail(
            `CSS module import failed in extension page: ${e.message}`
          );
        }

        const cssUrl = browser.runtime.getURL("styles.txt");
        await browser.test.assertRejects(
          import(cssUrl, { with: { type: "css" } }),
          /error loading dynamically imported module:.*\/styles.txt/,
          "CSS module import should fail without window"
        );

        browser.test.sendMessage("page-done");
      },
    },
  });

  await extension.startup();

  // Test in content script
  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/test.html"
  );
  await extension.awaitMessage("content-done");
  await contentPage.close();

  // Test in extension page
  let url = `moz-extension://${extension.uuid}/page.html`;
  let page = await ExtensionTestUtils.loadContentPage(url, { extension });
  await extension.awaitMessage("page-done");
  await page.close();

  await extension.unload();
});

add_task(async function test_synthetic_modules_war() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      web_accessible_resources: ["war_styles.css"],
      content_scripts: [
        {
          matches: ["http://example.com/test.html"],
          js: ["content.js"],
        },
      ],
    },

    files: {
      "data.json": JSON.stringify({ name: "test", value: 42 }),
      "war_styles.css": "body { color: red; }",
      "content.js": async function () {
        try {
          const jsonUrl = browser.runtime.getURL("data.json");
          const data = await import(jsonUrl, { with: { type: "json" } });
          browser.test.assertDeepEq({ name: "test", value: 42 }, data.default);
        } catch (e) {
          browser.test.fail(`JSON module import failed: ${e.message}`);
        }

        const cssUrl = browser.runtime.getURL("war_styles.css");
        await browser.test.assertRejects(
          import(cssUrl, { with: { type: "css" } }),
          "CSS module scripts not supported when there is no window",
          "CSS module import should fail without window"
        );

        browser.test.sendMessage("content-done");
      },
    },
  });

  await extension.startup();

  // Test in content script
  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://example.com/test.html"
  );
  await extension.awaitMessage("content-done");
  await contentPage.close();

  await extension.unload();
});
