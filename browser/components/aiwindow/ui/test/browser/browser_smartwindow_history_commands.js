/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(
  async function test_show_all_history_opens_firefoxview_in_smart_window() {
    let smartWindow = await openAIWindow();
    let stub = sinon.stub(smartWindow.FirefoxViewHandler, "openTab");

    smartWindow.document.getElementById("Browser:ShowAllHistory").doCommand();

    Assert.ok(stub.calledOnce, "FirefoxViewHandler.openTab should be called");
    Assert.equal(
      stub.firstCall.args[0],
      "history",
      "ShowAllHistory cmd in Smart Window should open Fx View history section"
    );

    stub.restore();
    await BrowserTestUtils.closeWindow(smartWindow);
  }
);

add_task(async function test_chats_history_opens_firefoxview_in_smart_window() {
  let smartWindow = await openAIWindow();
  let stub = sinon.stub(smartWindow.FirefoxViewHandler, "openTab");

  smartWindow.document.getElementById("Tools:ChatsHistory").doCommand();

  Assert.ok(stub.calledOnce, "FirefoxViewHandler.openTab should be called");
  Assert.equal(
    stub.firstCall.args[0],
    "chats",
    "ChatsHistory cmd should open Fx View chats section"
  );

  stub.restore();
  await BrowserTestUtils.closeWindow(smartWindow);
});

add_task(
  async function test_show_all_history_opens_library_in_classic_window() {
    let libraryOpened = BrowserTestUtils.domWindowOpened(null, async win => {
      await BrowserTestUtils.waitForEvent(win, "load");
      return (
        win.document.documentURI ===
        "chrome://browser/content/places/places.xhtml"
      );
    });

    document.getElementById("Browser:ShowAllHistory").doCommand();

    let libraryWin = await libraryOpened;
    Assert.ok(
      libraryWin,
      "ShowAllHistory cmd in Classic Window should still open the Library as before"
    );

    await BrowserTestUtils.closeWindow(libraryWin);
  }
);
