/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { Capabilities } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/webdriver/Capabilities.sys.mjs"
);

const { EventPromise } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/Sync.sys.mjs"
);

const { UserPromptHandlerManager } = ChromeUtils.importESModule(
  "chrome://remote/content/webdriver-bidi/UserPromptHandlerManager.sys.mjs"
);

const BUILDER_URL = "https://example.com/document-builder.sjs?html=";

const BEFOREUNLOAD_MARKUP = `
<html>
<head>
  <script>
    window.onbeforeunload = function() {
      return true;
    };
  </script>
</head>
<body>TEST PAGE</body>
</html>
`;
const BEFOREUNLOAD_URL = BUILDER_URL + encodeURI(BEFOREUNLOAD_MARKUP);

function createScriptNode(script) {
  return SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [script],
    function (_script) {
      var script = content.document.createElement("script");
      script.append(content.document.createTextNode(_script));
      content.document.body.append(script);
    }
  );
}

add_task(async function test_prompts() {
  for (const type of ["alert", "confirm", "prompt"]) {
    for (const behavior of ["accept", "dismiss", "ignore"]) {
      let userPromptHandlerManager;

      try {
        info(
          `Checking the prompt with type: "${type}" and the behavior: "${behavior}"`
        );

        const expectedAcceptedValue =
          type === "alert" || behavior === "accept" || behavior === "ignore";
        const capabilities = Capabilities.fromJSON(
          { unhandledPromptBehavior: { [type]: behavior } },
          true
        );
        userPromptHandlerManager = new UserPromptHandlerManager(
          capabilities.get("unhandledPromptBehavior")
        );
        const onClosePrompt = new EventPromise(
          gBrowser.selectedBrowser.ownerGlobal,
          "DOMModalDialogClosed"
        );

        const dialogPromise = BrowserTestUtils.promiseAlertDialogOpen();
        await createScriptNode(`setTimeout(() => window.${type}('test'))`);
        const dialogWin = await dialogPromise;

        if (behavior === "ignore") {
          // Spin the event loop to make that the prompt is not handled automatically.
          /* eslint-disable mozilla/no-arbitrary-setTimeout */
          await new Promise(resolve => setTimeout(resolve, 200));

          dialogWin.document.querySelector("dialog").acceptDialog();
        }

        const event = await onClosePrompt;
        const isAccepted =
          event.detail.areLeaving === undefined || type === "alert"
            ? true
            : event.detail.areLeaving;

        is(
          isAccepted,
          expectedAcceptedValue,
          `The prompt of type "${type}" is ${behavior}ed`
        );
      } finally {
        userPromptHandlerManager.destroy();
      }
    }
  }
});

add_task(async function test_beforeunload() {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.require_user_interaction_for_beforeunload", false]],
  });

  for (const behavior of ["accept", "dismiss", "ignore"]) {
    let userPromptHandlerManager;

    try {
      info(`Checking the beforeunload and the behavior: "${behavior}"`);

      const capabilities = Capabilities.fromJSON(
        { unhandledPromptBehavior: { beforeUnload: behavior } },
        true
      );
      userPromptHandlerManager = new UserPromptHandlerManager(
        capabilities.get("unhandledPromptBehavior")
      );

      await BrowserTestUtils.withNewTab(
        BEFOREUNLOAD_URL,
        async function (browser) {
          const onClosePrompt = new EventPromise(
            browser.ownerGlobal,
            "DOMModalDialogClosed"
          );

          const dialogPromise = BrowserTestUtils.promiseAlertDialogOpen();
          BrowserTestUtils.startLoadingURIString(browser, "about:blank");
          const dialogWin = await dialogPromise;

          if (behavior === "ignore") {
            // Spin the event loop to make that the prompt is not handled automatically.
            /* eslint-disable mozilla/no-arbitrary-setTimeout */
            await new Promise(resolve => setTimeout(resolve, 200));

            dialogWin.document.querySelector("dialog").acceptDialog();
          }

          const closedEvent = await onClosePrompt;
          const isAccepted =
            closedEvent.detail.areLeaving === undefined
              ? true
              : closedEvent.detail.areLeaving;

          is(
            isAccepted,
            behavior !== "dismiss",
            `The beforeunload prompt is ${behavior}ed`
          );

          if (behavior === "dismiss") {
            // Now we need to get rid of the handler to avoid the prompt coming up
            // when trying to close the tab.
            await SpecialPowers.spawn(browser, [], function () {
              content.window.onbeforeunload = null;
            });
          } else {
            await BrowserTestUtils.browserLoaded(browser, false, "about:blank");
          }
        }
      );
    } finally {
      userPromptHandlerManager.destroy();
    }
  }
});
