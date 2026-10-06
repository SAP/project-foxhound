/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PAGE =
  "chrome://mochitests/content/browser/browser/components/aiwindow/ui/test/browser/test_kit_mention_page.html";

add_task(
  async function test_kit_mention_renders_on_trigger_and_clears_on_reset() {
    await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        const kit = content.document.getElementById("kit");
        await content.customElements.whenDefined("kit-mention");

        const shadow = kit.shadowRoot;
        ok(shadow, "kit-mention has a shadow root");
        ok(!shadow.querySelector("img"), "No img rendered before trigger");

        kit.trigger({ value: "MENTION_DEFINITE", convId: "conv-1" });
        await kit.updateComplete;
        ok(shadow.querySelector("img"), "img rendered after trigger");

        kit.reset();
        await kit.updateComplete;
        ok(!shadow.querySelector("img"), "img removed after reset");
      });
    });
  }
);

add_task(async function test_kit_mention_ignores_non_definite_payload() {
  await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const kit = content.document.getElementById("kit");
      await content.customElements.whenDefined("kit-mention");

      kit.trigger({ value: "MENTION_AMBIGUOUS", convId: "conv-1" });
      await kit.updateComplete;
      ok(
        !kit.shadowRoot.querySelector("img"),
        "Non-MENTION_DEFINITE payload does not render"
      );
    });
  });
});

add_task(async function test_kit_mention_dedupes_per_convId() {
  await BrowserTestUtils.withNewTab(TEST_PAGE, async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      const kit = content.document.getElementById("kit");
      await content.customElements.whenDefined("kit-mention");

      kit.trigger({ value: "MENTION_DEFINITE", convId: "conv-1" });
      await kit.updateComplete;
      ok(kit.shadowRoot.querySelector("img"), "img rendered for conv-1");

      // Simulate the hide timeout firing without clearing the dedup key,
      // so the next trigger exercises the per-convId dedup branch.
      kit.show = false;
      await kit.updateComplete;
      ok(!kit.shadowRoot.querySelector("img"), "img hidden");

      kit.trigger({ value: "MENTION_DEFINITE", convId: "conv-1" });
      await kit.updateComplete;
      ok(
        !kit.shadowRoot.querySelector("img"),
        "Repeat trigger for same convId does not re-render"
      );

      kit.trigger({ value: "MENTION_DEFINITE", convId: "conv-2" });
      await kit.updateComplete;
      ok(
        kit.shadowRoot.querySelector("img"),
        "Trigger for a new convId renders"
      );
    });
  });
});
