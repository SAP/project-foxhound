"use strict";

// Test that an extension page which is sandboxed may load resources
// from itself without relying on web acessible resources.
add_task(async function test_webext_background_sandbox_privileges() {
  function backgroundSubframeScript() {
    window.parent.postMessage(typeof browser, "*");
  }

  function backgroundScript() {
    /* eslint-disable-next-line mozilla/balanced-listeners */
    window.addEventListener("message", event => {
      if (event.data == "undefined") {
        browser.test.notifyPass("webext-background-sandbox-privileges");
      } else {
        browser.test.notifyFail("webext-background-sandbox-privileges");
      }
    });
  }

  let extensionData = {
    manifest: {
      background: {
        page: "background.html",
      },
    },
    files: {
      "background.html": `<!DOCTYPE>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body>
            <script src="background.js"><\/script>
            <iframe src="background-subframe.html" sandbox="allow-scripts"></iframe>
          </body>
        </html>`,
      "background-subframe.html": `<!DOCTYPE>
        <html>
          <head>
            <meta charset="utf-8">
            <script src="background-subframe.js"><\/script>
          </head>
        </html>`,
      "background-subframe.js": backgroundSubframeScript,
      "background.js": backgroundScript,
    },
  };
  let extension = ExtensionTestUtils.loadExtension(extensionData);

  await extension.startup();

  await extension.awaitFinish("webext-background-sandbox-privileges");
  await extension.unload();
});

add_task(async function test_webext_background_sandbox_iframe_import() {
  function backgroundSubframeScript() {
    document.title = "script_ran";
    import("./module1.js");
  }

  function backgroundScript() {
    window.onload = () => {
      browser.test.assertEq(
        "script_ran",
        frames[0].document.title,
        "Sandbox with allow-scripts executes"
      );

      browser.test.assertEq(
        "Initial title",
        frames[1].document.title,
        "Sandbox without allow-scripts does not run"
      );
      browser.test.sendMessage("background_done");
    };
  }

  const MODULE1 = `browser.test.sendMessage("module_done")`;

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      background: {
        page: "background.html",
      },
    },

    files: {
      "background.html": `<!DOCTYPE>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body>
            <script src="background.js"><\/script>
            <iframe src="background-subframe.html" sandbox="allow-same-origin allow-scripts"></iframe>
            <iframe src="background-subframe.html" sandbox="allow-same-origin"></iframe>
          </body>
        </html>`,
      "background-subframe.html": `<!DOCTYPE>
        <html>
          <title>Initial title</title>
          <head>
            <meta charset="utf-8">
            <script src="background-subframe.js"><\/script>
          </head>
        </html>`,
      "background-subframe.js": backgroundSubframeScript,
      "background.js": backgroundScript,
      "module1.js": MODULE1,
    },
  });

  await extension.startup();
  await Promise.all([
    extension.awaitMessage("background_done"),
    extension.awaitMessage("module_done"),
  ]);
  await extension.unload();
});
