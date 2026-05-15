/**
 * Test that the doorhanger notification for password saving doesn't reveal
 * the password if the password is previously revealed.
 */

add_task(async function test_do_not_reveal_password() {
  // Add a login for the origin of the form.
  await Services.logins.addLoginAsync(
    LoginTestUtils.testData.formLogin({
      origin: "https://example.com",
      formActionOrigin: "https://example.com",
      username: "username",
      password: "password",
    })
  );

  await update_credentials("username", "password1", () => {
    document.getElementById("password-notification-password").revealPassword =
      true;
  });
  await update_credentials("username", "password2", () => {
    Assert.strictEqual(
      document.getElementById("password-notification-password").revealPassword,
      false,
      "Password expected to not be revealed"
    );
  });

  // Clean up the database before the next test case is executed.
  Services.logins.removeAllUserFacingLogins();
});

/**
 *
 * @param {string} username
 * @param {string} password
 * @param {() => void} afterDoorhangerShown
 */
async function update_credentials(username, password, afterDoorhangerShown) {
  let formProcessedPromise = listenForTestNotification("FormProcessed");
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url:
        "https://example.com/browser/toolkit/components/" +
        "passwordmgr/test/browser/form_basic.html",
    },
    async function (browser) {
      await SimpleTest.promiseFocus(browser.ownerGlobal);

      info("Waiting for form-processed message");
      await formProcessedPromise;

      info(
        `First update form with username: ${username}, password: ${password}`
      );
      await changeContentFormValues(browser, {
        "#form-basic-username": username,
        "#form-basic-password": password,
      });

      // Submit the form with the new credentials. This will cause the doorhanger
      // notification to be displayed.
      let formSubmittedPromise = listenForTestNotification([
        "FormProcessed",
        "ShowDoorhanger",
      ]);
      await SpecialPowers.spawn(browser, [], async function () {
        let doc = this.content.document;
        doc.getElementById("form-basic").submit();
      });
      await formSubmittedPromise;

      info("Waiting for doorhanger of type: password-change");
      let notif = await waitForDoorhanger(browser, "password-change");

      // Wait for the popup notification (LoginManagerPrompter)
      await checkDoorhangerUsernamePassword(username, password);

      await afterDoorhangerShown();

      let promiseLogin = TestUtils.topicObserved(
        "passwordmgr-storage-changed",
        (_, data) => data == "modifyLogin"
      );
      clickDoorhangerButton(notif, REMEMBER_BUTTON);
      await promiseLogin;
      await cleanupDoorhanger(notif); // clean slate for the next test
    }
  );
}
