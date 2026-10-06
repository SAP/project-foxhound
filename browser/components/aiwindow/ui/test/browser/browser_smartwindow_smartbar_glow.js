/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

describe("smartbar-glow", () => {
  let aiWin;

  beforeEach(async () => {
    // The glow sets :host { display: none } under prefers-reduced-motion,
    // which zeroes the host size and stops the animation tick (so the path
    // never draws). CI runs with reduced motion enabled, so force
    // no-preference here to exercise the glow.
    await SpecialPowers.pushPrefEnv({
      set: [["ui.prefersReducedMotion", 0]],
    });
    aiWin = await openAIWindow();
  });

  afterEach(async () => {
    if (aiWin) {
      await BrowserTestUtils.closeWindow(aiWin);
      aiWin = null;
    }
    await SpecialPowers.popPrefEnv();
  });

  it("renders with a populated path", async () => {
    await SpecialPowers.spawn(aiWin.gBrowser.selectedBrowser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = await ContentTaskUtils.waitForCondition(
        () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
        "Wait for Smartbar to be rendered"
      );

      const glow = smartbar.querySelector("smartwindow-smartbar-glow");
      Assert.ok(glow, "smartbar-glow rendered as a child of moz-smartbar");

      Assert.equal(
        glow.referenceElement,
        smartbar.querySelector(".urlbar-background"),
        "SmartbarInput wired referenceElement to .urlbar-background"
      );

      const path = glow.shadowRoot.querySelector(".glow-path");
      Assert.ok(path, "shadow root contains the .glow-path element");

      await ContentTaskUtils.waitForCondition(
        () => path.getAttribute("d"),
        "path d attribute populates after first tick"
      );
      const d = path.getAttribute("d");
      Assert.ok(
        d.startsWith("M") && d.endsWith("Z"),
        `path d looks like a closed polygon: ${d.slice(0, 40)}`
      );
    });
  });

  it("tracks the cursor once the smartbar is no longer focused", async () => {
    await SpecialPowers.spawn(aiWin.gBrowser.selectedBrowser, [], async () => {
      const aiWindowElement = content.document.querySelector("ai-window");
      const smartbar = await ContentTaskUtils.waitForCondition(
        () => aiWindowElement.shadowRoot?.querySelector("#ai-window-smartbar"),
        "Wait for Smartbar to be rendered"
      );
      const glow = smartbar.querySelector("smartwindow-smartbar-glow");
      const path = glow.shadowRoot.querySelector(".glow-path");

      await ContentTaskUtils.waitForCondition(
        () => path.getAttribute("d"),
        "path d populated"
      );

      smartbar.removeAttribute("focused");
      const dBeforeMove = path.getAttribute("d");
      const bar = smartbar.querySelector(".urlbar-background");
      const rect = bar.getBoundingClientRect();
      const moveEvent = new content.MouseEvent("mousemove", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true,
      });
      content.window.dispatchEvent(moveEvent);

      await ContentTaskUtils.waitForCondition(
        () => path.getAttribute("d") !== dBeforeMove,
        "path d updates when the cursor moves to the bar's center"
      );
      Assert.notEqual(
        path.getAttribute("d"),
        dBeforeMove,
        "smartbar-glow reshapes itself toward the cursor when unfocused"
      );
    });
  });
});
