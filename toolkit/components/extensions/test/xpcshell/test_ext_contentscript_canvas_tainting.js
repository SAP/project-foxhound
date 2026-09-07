"use strict";

const server = createHttpServer({
  hosts: ["green.example.com", "red.example.com"],
});

server.registerDirectory("/data/", do_get_file("data"));

server.registerPathHandler("/pixel.html", (request, response) => {
  response.setStatusLine(request.httpVersion, 200, "OK");
  response.setHeader("Content-Type", "text/html", false);
  response.write(`<!DOCTYPE html>
    <script>
      function readByWeb() {
        let ctx = document.querySelector("canvas").getContext("2d");
        let {data} = ctx.getImageData(0, 0, 1, 1);
        return data.slice(0, 3).join();
      }
    </script>
  `);
});

add_setup(() => {
  // Allow background scripts to load http images without trying to upgrade.
  // This can be removed if the server above supports https (bug 1742061).
  Services.prefs.setBoolPref(
    "security.mixed_content.upgrade_display_content",
    false
  );
});

add_task(async function test_contentscript_canvas_tainting() {
  async function contentScript() {
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    document.body.appendChild(canvas);

    function draw(url) {
      return new Promise(resolve => {
        let img = document.createElement("img");
        img.onload = () => {
          ctx.drawImage(img, 0, 0, 1, 1);
          resolve();
        };
        img.src = url;
      });
    }

    function readByExt() {
      let { data } = ctx.getImageData(0, 0, 1, 1);
      return data.slice(0, 3).join();
    }

    let readByWeb = window.wrappedJSObject.readByWeb;

    // Test reading after drawing an image from the same origin as the web page.
    await draw("http://green.example.com/data/pixel_green.gif");
    browser.test.assertEq(
      readByWeb(),
      "0,255,0",
      "Content can read same-origin image"
    );
    browser.test.assertEq(
      readByExt(),
      "0,255,0",
      "Extension can read same-origin image"
    );

    // Test reading after drawing a blue pixel data URI from extension content script.
    await draw(
      "data:image/gif;base64,R0lGODlhAQABAIABAAAA/wAAACwAAAAAAQABAAACAkQBADs="
    );
    browser.test.assertThrows(
      readByWeb,
      /operation is insecure/,
      "Content can't read extension's image"
    );
    browser.test.assertEq(
      readByExt(),
      "0,0,255",
      "Extension can read its own image"
    );

    // Test after tainting the canvas with an image from a third party domain.
    await draw("http://red.example.com/data/pixel_red.gif");
    browser.test.assertThrows(
      readByWeb,
      /operation is insecure/,
      "Content can't read third party image"
    );
    browser.test.assertThrows(
      readByExt,
      /operation is insecure/,
      "Extension can't read fully tainted"
    );

    // Test canvas is still fully tainted after drawing extension's data: image again.
    await draw(
      "data:image/gif;base64,R0lGODlhAQABAIABAAAA/wAAACwAAAAAAQABAAACAkQBADs="
    );
    browser.test.assertThrows(
      readByWeb,
      /operation is insecure/,
      "Canvas still fully tainted for content"
    );
    browser.test.assertThrows(
      readByExt,
      /operation is insecure/,
      "Canvas still fully tainted for extension"
    );

    browser.test.sendMessage("done");
  }

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      content_scripts: [
        {
          matches: ["http://green.example.com/pixel.html"],
          js: ["cs.js"],
        },
      ],
    },
    files: {
      "cs.js": contentScript,
    },
  });

  await extension.startup();
  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://green.example.com/pixel.html"
  );
  await extension.awaitMessage("done");

  await contentPage.close();
  await extension.unload();
});

async function do_test_all_urls_permission(manifest_version) {
  async function canReadFromCrossOriginImage() {
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    document.body.appendChild(canvas);
    let img = document.createElement("img");
    img.src = "http://red.example.com/data/pixel_red.gif";
    await img.decode();
    ctx.drawImage(img, 0, 0, 1, 1);

    try {
      let { data } = ctx.getImageData(0, 0, 1, 1);
      browser.test.assertEq(
        data.slice(0, 3).join(),
        "255,0,0",
        "Expected canvas data when read"
      );
      return true;
    } catch (e) {
      browser.test.assertEq(
        e.message,
        "The operation is insecure.",
        "Expected error message when canvas read fails."
      );
      return false;
    }
  }
  async function background(canReadFromCrossOriginImage) {
    browser.runtime.onInstalled.addListener(async () => {
      browser.test.assertTrue(
        await canReadFromCrossOriginImage(),
        "Background script can read from canvas with <all_urls>"
      );
      browser.test.sendMessage("done:bg");
    });
  }
  async function contentScript(canReadFromCrossOriginImage) {
    // In MV3 it could be reasonable to assertFalse here, if we want to reduce
    // the power of host permissions in MV3, see bug 2032951.
    browser.test.assertTrue(
      await canReadFromCrossOriginImage(),
      "Content script can read from canvas with <all_urls>"
    );
    browser.test.sendMessage("done:contentscript");
  }
  const extensionData = {
    manifest: {
      manifest_version,
      host_permissions: ["<all_urls>"],
      content_scripts: [
        {
          matches: ["http://green.example.com/pixel.html"],
          js: ["cs.js"],
        },
      ],
    },
    background: `(${background})(${canReadFromCrossOriginImage})`,
    files: {
      "cs.js": `(${contentScript})(${canReadFromCrossOriginImage})`,
    },
  };
  if (manifest_version === 3) {
    extensionData.manifest.content_security_policy = {
      // Override CSP to drop MV3's default 'upgrade-insecure-requests' to
      // enable us to load the test image (from http).
      extension_pages: "script-src 'self'",
    };
  }

  let extension = ExtensionTestUtils.loadExtension(extensionData);
  await extension.startup();
  await extension.awaitMessage("done:bg");
  let contentPage = await ExtensionTestUtils.loadContentPage(
    "http://green.example.com/pixel.html"
  );
  await extension.awaitMessage("done:contentscript");

  await contentPage.close();
  await extension.unload();
}

add_task(async function test_all_urls_permission_mv2() {
  await do_test_all_urls_permission(2);
});

add_task(async function test_all_urls_permission_mv3() {
  await do_test_all_urls_permission(3);
});
