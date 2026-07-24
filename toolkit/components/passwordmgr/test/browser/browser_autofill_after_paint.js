/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  const login1 = LoginTestUtils.testData.formLogin({
    origin: "https://example.com",
    formActionOrigin: "https://example.com",
    username: "username",
    password: "password",
  });
  await Services.logins.addLogins([login1]);

  registerCleanupFunction(async function () {
    SpecialPowers.clearUserPref("signon.rustMirror.migrationNeeded");
    SpecialPowers.clearUserPref("signon.rustMirror.poisoned");
  });
});

add_task(async function test_autofill_after_paint() {
  const TEST_URL =
    "https://example.com/browser/toolkit/components/passwordmgr/test/browser/form_basic_slow_css.html";

  info("Opening test page with slow CSS");
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: TEST_URL,
      waitForLoad: false,
    },
    async browser => {
      await BrowserTestUtils.browserLoaded(
        browser,
        false,
        TEST_URL,
        true // Set `maybeErrorPage` so we wait for `DOMContentLoaded` instead of `load`
      );

      info(
        "The test page has been parsed, `DOMContentLoaded` should be fired at this point"
      );
      await SpecialPowers.spawn(browser, [], async () => {
        let receiveChangeEvent = false;
        const onChange = () => {
          receiveChangeEvent = true;
        };

        // Listen for "change" event to detect autofill before MozAfterPaint
        const passwordField = content.document.getElementById(
          "form-basic-password"
        );
        passwordField.addEventListener("change", onChange, { once: true });

        // Due to slow css, `MozAfterPaint` will be delayed.
        await ContentTaskUtils.waitForEvent(content, "MozAfterPaint");
        passwordField.removeEventListener("change", onChange);

        await ContentTaskUtils.waitForCondition(
          () =>
            content.document.getElementById("form-basic-password")?.value ==
            "password",
          `test if password field is filled`
        );

        Assert.ok(
          !receiveChangeEvent,
          "Password field should not be filled before receiving MozAfterPaint event"
        );
        Assert.ok(
          true,
          "Password field should be filled after receiving MozAfterPaint event"
        );
      });
    }
  );
});
