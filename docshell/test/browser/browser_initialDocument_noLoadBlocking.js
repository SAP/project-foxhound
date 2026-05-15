/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function createInjectingExtension() {
  return ExtensionTestUtils.loadExtension({
    manifest: {
      manifest_version: 2,
      name: "insert script to about:blank",
      version: "1.0",
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content.js"],
          run_at: "document_start",
          all_frames: true,
          match_about_blank: true,
        },
      ],
    },

    files: {
      "content.js": function () {
        if (!window.location.href.startsWith("about:blank?")) {
          return;
        }

        // location.search doesn't work for about:blank, see bug 2020432.
        const injection = window.location.href.replace("about:blank?", "");

        if (injection == "script") {
          const script = document.createElement("script");
          script.src =
            "data:,(window.parent.postMessage(`script ${window.location.href}`))()";
          (document.documentElement || document).appendChild(script);
        } else if (injection == "style") {
          const style = document.createElement("style");
          style.textContent = "* { color: red !important; }";
          document.head.append(style);
        }
      },
    },
  });
}

async function testInjectionDoesNotBlockInitialLoad(injectionType) {
  const extension = createInjectingExtension();
  await extension.startup();

  const url = "https://example.com/";
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, url);

  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [url, injectionType],
    async function (url, injectionType) {
      Assert.equal(content.location.href, url, "Correct content document");

      // injectionType==script is verified asynchronously via postMessage
      const scriptEvaluated = new Promise(
        res =>
          (content.onmessage = ({ data }) => {
            if (data == `script about:blank?${injectionType}`) {
              res();
            }
          })
      );

      let loaded = false;
      const iframe = content.document.createElement("iframe");
      iframe.onload = () => (loaded = true);
      iframe.src = `about:blank?${injectionType}`;
      content.document.body.append(iframe);
      Assert.ok(loaded, "Load occurred synchronously");

      // "script" or "style" element
      const extEl = iframe.contentDocument.querySelector(injectionType);
      Assert.ok(!!extEl, `Extension inserted ${injectionType} synchronously`);

      if (injectionType == "script") {
        await scriptEvaluated;
      }
    }
  );

  BrowserTestUtils.removeTab(tab);
  await extension.unload();
}

// See bug 2003255
add_task(
  async function test_extension_injecting_script_does_not_block_initial_load() {
    await testInjectionDoesNotBlockInitialLoad("script");
  }
);

// See bug 2020300
add_task(
  async function test_extension_injecting_style_does_not_block_initial_load() {
    await testInjectionDoesNotBlockInitialLoad("style");
  }
);
