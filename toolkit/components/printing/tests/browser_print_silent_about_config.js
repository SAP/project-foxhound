/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_print_silent_about_config() {
  // The relevant thing for this test is that this is a parent process page,
  // but about:config is complex enough to trigger some interesting
  // code-paths.
  await SpecialPowers.pushPrefEnv({
    set: [
      ["print.always_print_silent", true],
      ["print_printer", "Mozilla Save to PDF"],
    ],
  });

  await BrowserTestUtils.withNewTab("about:config", async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      await new Promise(r => {
        content.addEventListener("afterprint", r, { once: true });
        content.print();
      });
    });
  });

  info("waiting for print process to finish");
  // Needed to avoid leaked docshells etc at end of test.
  await BrowserTestUtils.waitForMutationCondition(
    document.documentElement,
    { childList: true },
    () => {
      return !document.querySelector(":root > browser");
    }
  );

  ok(true, "Didn't crash, hopefully");
});
