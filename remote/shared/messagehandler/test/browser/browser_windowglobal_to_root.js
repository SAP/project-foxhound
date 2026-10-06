/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { RootMessageHandler } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/messagehandler/RootMessageHandler.sys.mjs"
);

add_task(async function test_windowGlobal_to_root_command() {
  // Navigate to a page to make sure that the windowglobal modules run in a
  // different process than the root module.
  const tab = BrowserTestUtils.addTab(
    gBrowser,
    "https://example.com/document-builder.sjs?html=tab"
  );
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  const browsingContextId = tab.linkedBrowser.browsingContext.id;

  const rootMessageHandler = createRootMessageHandler(
    "session-id-windowglobal-to-rootModule"
  );

  info("Test commands which call getValueFromRoot from windowglobal to root");
  for (const commandName of [
    "testHandleCommandToRoot",
    "testSendRootCommand",
  ]) {
    const valueFromRoot = await rootMessageHandler.handleCommand({
      moduleName: "windowglobaltoroot",
      commandName,
      destination: {
        type: WindowGlobalMessageHandler.type,
        id: browsingContextId,
      },
    });

    is(
      valueFromRoot,
      "root-value-called-from-windowglobal",
      "Retrieved the expected value from windowglobaltoroot using " +
        commandName
    );
  }

  info(
    "Test commands which call getValueFromRootUnlisted from windowglobal to root"
  );
  for (const commandName of [
    "testHandleCommandToRootUnlisted",
    "testSendRootCommandUnlisted",
  ]) {
    await Assert.rejects(
      rootMessageHandler.handleCommand({
        moduleName: "windowglobaltoroot",
        commandName,
        destination: {
          type: WindowGlobalMessageHandler.type,
          id: browsingContextId,
        },
      }),
      err =>
        err.message.includes(
          `Command windowglobaltoroot.getValueFromRootUnlisted can not be called from a windowglobal module`
        ),
      "Error received when windowglobal tried to call an unlisted method"
    );
  }

  rootMessageHandler.destroy();
  gBrowser.removeTab(tab);
});
