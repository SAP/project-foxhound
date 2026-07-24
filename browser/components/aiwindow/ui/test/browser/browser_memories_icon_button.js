/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PAGE =
  "chrome://mochitests/content/browser/browser/components/aiwindow/ui/test/browser/test_memories_icon_button_page.html";

add_task(async function test_memories_icon_button() {
  await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const doc = content.document;
      const btn = doc.getElementById("test-memories-icon-button");

      await content.customElements.whenDefined("memories-icon-button");

      Assert.ok(btn, "Button element should exist in the test page");

      Assert.equal(btn.pressed, true, "Default `pressed` state should be true");
      Assert.ok(
        btn.hasAttribute("pressed"),
        "pressed attribute should reflect initial markup"
      );

      let changeEvent = null;
      btn.addEventListener(
        "aiwindow-memories-toggle:on-change",
        e => (changeEvent = e),
        { once: true }
      );

      const shadow = btn.shadowRoot;
      const mozBtn = shadow.querySelector("moz-button");

      mozBtn.click();

      await content.Promise.resolve();

      Assert.ok(changeEvent, "Change event should fire");

      Assert.equal(
        typeof changeEvent.detail.pressed,
        "boolean",
        "`change` event detail.pressed should be a boolean"
      );

      Assert.equal(
        btn.pressed,
        false,
        "Pressed should toggle to false after click"
      );

      Assert.equal(
        btn.getAttribute("pressed"),
        null,
        "Attribute `pressed` should be removed when false"
      );
    });
  });
});
