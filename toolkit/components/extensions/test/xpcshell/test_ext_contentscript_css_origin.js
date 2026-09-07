"use strict";

const server = createHttpServer({ hosts: ["example.com"] });

server.registerPathHandler("/", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/html; charset=utf-8", false);
});

add_task(async function test_content_script_css_origin() {
  let extensionData = {
    manifest: {
      content_scripts: [
        {
          matches: ["http://example.com/"],
          css: ["style-0.css"],
          run_at: "document_start",
        },
        {
          matches: ["http://example.com/"],
          css: ["style-1.css"],
          css_origin: "author",
          run_at: "document_start",
        },
        {
          matches: ["http://example.com/"],
          css: ["style-2.css"],
          css_origin: "AUTHOR",
          run_at: "document_start",
        },
        {
          matches: ["http://example.com/"],
          css: ["style-3.css"],
          css_origin: "authoR",
          run_at: "document_start",
        },
        {
          matches: ["http://example.com/"],
          css_origin: "user",
          css: ["style-4.css"],
          run_at: "document_start",
        },
        {
          matches: ["http://example.com/"],
          css_origin: "USER",
          css: ["style-5.css"],
          run_at: "document_start",
        },
        {
          matches: ["http://example.com/"],
          js: ["end.js"],
          run_at: "document_end",
        },
      ],
    },

    files: {
      "style-0.css": "body { background: black; }",
      "style-1.css": "body { background: yellow; }",
      "style-2.css": "body { background: orange; }",
      "style-3.css": "body { background: red; }",
      "style-4.css": "body { background: purple; }",
      "style-5.css": "body { background: blue; }",
      "end.js": function () {
        let style = window.getComputedStyle(document.body);
        browser.test.assertEq(
          "rgb(255, 0, 0)",
          style.backgroundColor,
          "style-3.css with last-defined author origin takes precendence over users"
        );
        browser.test.sendMessage("content-script-done");
      },
    },
  };

  let extension = ExtensionTestUtils.loadExtension(extensionData);
  await extension.startup();
  let contentPage =
    await ExtensionTestUtils.loadContentPage(`http://example.com/`);
  await extension.awaitMessage("content-script-done");
  await contentPage.close();
  await extension.unload();
});
