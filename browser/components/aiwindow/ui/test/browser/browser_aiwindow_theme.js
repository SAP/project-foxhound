/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function hasBrightText(win) {
  return win.document.documentElement.hasAttribute("lwtheme-brighttext");
}

describe("AI window theme", () => {
  let aiWin;

  afterEach(async () => {
    await BrowserTestUtils.closeWindow(aiWin);
    await SpecialPowers.popPrefEnv();
  });

  it("should follow OS light mode", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [["ui.systemUsesDarkTheme", 0]],
    });
    aiWin = await openAIWindow();
    Assert.ok(
      !hasBrightText(aiWin),
      "AI window should not have brighttext when OS is light"
    );
  });

  it("should follow OS dark mode", async () => {
    await SpecialPowers.pushPrefEnv({
      set: [["ui.systemUsesDarkTheme", 1]],
    });
    aiWin = await openAIWindow();
    Assert.ok(
      hasBrightText(aiWin),
      "AI window should have brighttext when OS is dark"
    );
  });
});
