/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  });
});

add_task(async function test_check_alert_from_blank() {
  await BrowserTestUtils.withNewTab(
    "https://example.com/blank",
    async browser => {
      await SpecialPowers.spawn(browser, [], () => {
        let button = content.document.createElement("button");
        button.addEventListener("click", () => {
          info("Button onclick: opening about:blank");
          let newWin = content.open(
            "about:blank",
            "",
            "popup,width=600,height=600"
          );
          // Start an async navigation that will close the alert
          // Previously this wasn't needed as the initial about:blank
          // was followed by an async about:blank load. See Bug 543435
          newWin.location = "about:blank?0";
          newWin.alert("Alert from the popup.");
          info("Button onclick: finished");
        });
        content.document.body.append(button);
        info(
          "Added alert-from-about-blank-popup trigger button to " +
            content.document.location.href
        );
      });

      let newWinPromise = BrowserTestUtils.waitForNewWindow();
      await BrowserTestUtils.synthesizeMouseAtCenter("button", {}, browser);

      // otherWin is the same as newWin
      let otherWin = await newWinPromise;

      Assert.equal(
        otherWin.gBrowser.currentURI?.spec,
        "about:blank",
        "Should have opened about:blank"
      );
      Assert.equal(
        otherWin.menubar.visible,
        false,
        "Should be a popup window."
      );
      let contentDialogManager = gBrowser
        .getTabDialogBox(gBrowser.selectedBrowser)
        .getContentDialogManager();
      todo_is(contentDialogManager._dialogs.length, 1, "Should have 1 dialog.");
      await BrowserTestUtils.closeWindow(otherWin);
    }
  );
});
