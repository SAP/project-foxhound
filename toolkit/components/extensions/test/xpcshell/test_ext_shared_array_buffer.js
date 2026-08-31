/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const server = createHttpServer();
server.registerPathHandler("/isolated_yes", (_req, res) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
});
server.registerPathHandler("/isolated_no", () => {
  // No COOP or COEP headers, implies not cross-origin isolated.
});
// crossOriginIsolated is only available to secure contexts, but we only have a
// http server here. Fortunately, localhost is considered a secure context.
const localhostBaseUrl = `http://localhost:${server.identity.primaryPort}`;

add_task(async function test_shared_array_buffer_worker() {
  const extension_description = {
    isPrivileged: null,
    async background() {
      browser.test.onMessage.addListener(async isPrivileged => {
        const worker = new Worker("worker.js");
        worker.isPrivileged = isPrivileged;
        worker.onmessage = function (e) {
          const msg = `${
            this.isPrivileged
              ? "privileged addon can"
              : "non-privileged addon can't"
          } instantiate a SharedArrayBuffer
          in a worker`;
          if (e.data === this.isPrivileged) {
            browser.test.succeed(msg);
          } else {
            browser.test.fail(msg);
          }
          browser.test.sendMessage("test-sab-worker:done");
        };
      });
    },
    files: {
      "worker.js": function () {
        try {
          new SharedArrayBuffer(1);
          this.postMessage(true);
        } catch (e) {
          this.postMessage(false);
        }
      },
    },
  };

  // This test attempts to verify that a worker inside a privileged addon
  // is allowed to instantiate a SharedArrayBuffer
  extension_description.isPrivileged = true;
  let extension = ExtensionTestUtils.loadExtension(extension_description);
  await extension.startup();
  extension.sendMessage(extension_description.isPrivileged);
  await extension.awaitMessage("test-sab-worker:done");
  await extension.unload();

  // This test attempts to verify that a worker inside a non privileged addon
  // is not allowed to instantiate a SharedArrayBuffer
  extension_description.isPrivileged = false;
  extension = ExtensionTestUtils.loadExtension(extension_description);
  await extension.startup();
  extension.sendMessage(extension_description.isPrivileged);
  await extension.awaitMessage("test-sab-worker:done");
  await extension.unload();
});

add_task(async function test_shared_array_buffer_in_background_script() {
  let extension_description = {
    isPrivileged: null,
    async background() {
      browser.test.onMessage.addListener(async isPrivileged => {
        let succeed = null;
        try {
          new SharedArrayBuffer(1);
          succeed = true;
        } catch (e) {
          succeed = false;
        } finally {
          const msg = `${
            isPrivileged ? "privileged addon can" : "non-privileged addon can't"
          } instantiate a SharedArrayBuffer
          in the main thread`;
          if (succeed === isPrivileged) {
            browser.test.succeed(msg);
          } else {
            browser.test.fail(msg);
          }
          browser.test.sendMessage("test-sab-content:done");
        }
      });
    },
  };

  // This test attempts to verify that a non privileged addon
  // is allowed to instantiate a sharedarraybuffer
  extension_description.isPrivileged = true;
  let extension = ExtensionTestUtils.loadExtension(extension_description);
  await extension.startup();
  extension.sendMessage(extension_description.isPrivileged);
  await extension.awaitMessage("test-sab-content:done");
  await extension.unload();

  // This test attempts to verify that a non privileged addon
  // is not allowed to instantiate a sharedarraybuffer
  extension_description.isPrivileged = false;
  extension = ExtensionTestUtils.loadExtension(extension_description);
  await extension.startup();
  extension.sendMessage(extension_description.isPrivileged);
  await extension.awaitMessage("test-sab-content:done");
  await extension.unload();
});

async function do_test_shared_array_buffer_content_script(isPrivileged) {
  let extension = ExtensionTestUtils.loadExtension({
    isPrivileged,
    manifest: {
      content_scripts: [
        {
          js: ["contentscript.js"],
          matches: ["*://localhost/isolated_*"],
        },
      ],
    },
    files: {
      "contentscript.js": () => {
        if (location.pathname === "/isolated_yes") {
          /* globals crossOriginIsolated */
          browser.test.assertTrue(crossOriginIsolated, "Is isolated");
          browser.test.assertEq(
            new window.SharedArrayBuffer(1).byteLength,
            1,
            "SharedArrayBuffer available in web page"
          );
        } else {
          browser.test.assertFalse(crossOriginIsolated, "Is not isolated");
          browser.test.assertEq(
            typeof window.SharedArrayBuffer,
            "undefined",
            "SharedArrayBuffer unavailable in web page"
          );
        }
        browser.test.assertEq(
          typeof window.SharedArrayBuffer,
          typeof SharedArrayBuffer,
          "SharedArrayBuffer availability is consistent with the window"
        );
        browser.test.sendMessage("done");
      },
    },
  });
  await extension.startup();

  let contentPage = await ExtensionTestUtils.loadContentPage(
    `${localhostBaseUrl}/isolated_yes`
  );
  await extension.awaitMessage("done");
  await contentPage.close();

  let contentPage2 = await ExtensionTestUtils.loadContentPage(
    `${localhostBaseUrl}/isolated_no`
  );
  await extension.awaitMessage("done");
  await contentPage2.close();

  await extension.unload();
}

add_task(async function test_shared_array_buffer_content_script() {
  await do_test_shared_array_buffer_content_script();
});

add_task(async function test_shared_array_buffer_privileged_content_script() {
  // Even with privileges, SharedArrayBuffer availability in the content script
  // depends on availability in the web.
  await do_test_shared_array_buffer_content_script(/* isPrivileged */ true);
});
