/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Regression test for bug 2034329.
//
// DOMStringList::GetParentObject() used to return nullptr.
// This would cause DOMStringList to be created in the current global's realm,
// which is problematic if this is an extension script's global realm as this will
// cause subsequent accesses by web content to throw security errors.

const TEST_PAGE =
  "http://mochi.test:8888/browser/dom/base/test/file_bug2034329.html";

add_task(async function bug2034329_domstringlist_realm() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      content_scripts: [
        {
          matches: ["http://mochi.test/*"],
          js: ["content.js"],
          run_at: "document_start",
        },
      ],
    },
    files: {
      "content.js": function () {
        // Read ancestorOrigins from the extension content script first.
        // Before fix for bug2034329 DOMStringList would be created in the callers compartment.
        // Any subsequent accesses by web content would throw exceptions.
        void location.ancestorOrigins; // eslint-disable-line no-unused-expressions
      },
    },
  });

  await extension.startup();

  await BrowserTestUtils.withNewTab(TEST_PAGE, async function (browser) {
    let result = await SpecialPowers.spawn(browser, [], function () {
      return content.document.getElementById("result").textContent;
    });

    ok(
      result.startsWith("ok:"),
      "location.ancestorOrigins must be readable from the page script after " +
        "an extension content script accessed it first (got: " +
        result +
        ")"
    );
  });

  await extension.unload();
});
//
