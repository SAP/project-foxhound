/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

// Frequent promise rejections which are not impacting the load of the toolbox.
const { PromiseTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PromiseTestUtils.sys.mjs"
);
PromiseTestUtils.allowMatchingRejectionsGlobally(/NS_ERROR_FAILURE/);

// Testing that there's no breaking exception when destroying
// an iframe early after its creation.

add_task(async function () {
  const { tab } = await openInspectorForURL("about:blank");
  const browser = tab.linkedBrowser;

  // Create/remove an extra one now, after the load event.
  for (let i = 0; i < 10; i++) {
    await SpecialPowers.spawn(browser, [], async function () {
      const iframe = content.document.createElement("iframe");
      const loaded = new Promise(res => (iframe.onload = res));
      content.document.body.appendChild(iframe);
      await loaded;
      iframe.remove();
    });
  }
});
