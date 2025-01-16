/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

add_setup(async function () {
  let aboutLoginsTab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    url: "about:logins",
  });
  registerCleanupFunction(() => {
    BrowserTestUtils.removeTab(aboutLoginsTab);
    Services.logins.removeAllUserFacingLogins();
  });
});

add_task(async function test_create_login() {
  let browser = gBrowser.selectedBrowser;
  await SpecialPowers.spawn(browser, [], async () => {
    let loginList = Cu.waiveXrays(content.document.querySelector("login-list"));
    Assert.ok(
      !loginList._selectedGuid,
      "should not be a selected guid by default"
    );
    Assert.ok(
      content.document.documentElement.classList.contains("no-logins"),
      "Should initially be in no logins view"
    );
    Assert.ok(
      loginList.classList.contains("no-logins"),
      "login-list should initially be in no logins view"
    );
    Assert.equal(
      loginList._loginGuidsSortedOrder.length,
      0,
      "login list should be empty"
    );
  });

  let testCases = [
    ["ftp://ftp.example.com/", "ftp://ftp.example.com"],
    ["https://example.com/foo", "https://example.com"],
    ["http://example.com/", "http://example.com"],
    [
      "https://testuser1:testpass1@bugzilla.mozilla.org/show_bug.cgi?id=1556934",
      "https://bugzilla.mozilla.org",
    ],
    ["https://www.example.com/bar", "https://www.example.com"],
  ];

  for (let i = 0; i < testCases.length; i++) {
    let originTuple = testCases[i];
    info("Testcase " + i);
    let storageChangedPromised = TestUtils.topicObserved(
      "passwordmgr-storage-changed",
      (_, data) => data == "addLogin"
    );

    await SpecialPowers.spawn(
      browser,
      [[originTuple, i]],
      async ([aOriginTuple, index]) => {
        let loginList = Cu.waiveXrays(
          content.document.querySelector("login-list")
        );
        let createButton = loginList._createLoginButton;
        Assert.ok(
          ContentTaskUtils.isHidden(loginList._blankLoginListItem),
          "the blank login list item should be hidden initially"
        );
        Assert.ok(
          !createButton.disabled,
          "Create button should not be disabled initially"
        );

        let loginItem = Cu.waiveXrays(
          content.document.querySelector("login-item")
        );
        let usernameInput = loginItem.shadowRoot.querySelector(
          "input[name='username']"
        );
        usernameInput.placeholder = "dummy placeholder";

        createButton.click();

        Assert.ok(
          ContentTaskUtils.isVisible(loginList._blankLoginListItem),
          "the blank login list item should be visible after clicking on the create button"
        );
        Assert.ok(
          createButton.disabled,
          "Create button should be disabled after being clicked"
        );

        let cancelButton = loginItem.shadowRoot.querySelector(".cancel-button");
        Assert.ok(
          ContentTaskUtils.isVisible(cancelButton),
          "cancel button should be visible in create mode with no logins saved"
        );

        let originInput = loginItem.shadowRoot.querySelector(
          "input[name='origin']"
        );
        let passwordInput = loginItem.shadowRoot.querySelector(
          "input[name='password']"
        );

        // Upon clicking create-login-button, the origin input field is automatically focused.
        Assert.ok(
          ContentTaskUtils.isVisible(loginItem._originWarning),
          "The origin warning should be visible"
        );

        // At this moment, the password input field is not focused so no warning should be displayed.
        Assert.ok(
          ContentTaskUtils.isHidden(loginItem._passwordWarning),
          "The password warning should not be visible if the password input field is not focused"
        );

        Assert.equal(
          content.document.l10n.getAttributes(usernameInput).id,
          null,
          "there should be no placeholder id on the username input in edit mode"
        );
        Assert.equal(
          usernameInput.placeholder,
          "",
          "there should be no placeholder on the username input in edit mode"
        );

        originInput.value = aOriginTuple[0];
        usernameInput.value = "testuser1";

        passwordInput.focus();
        Assert.ok(
          ContentTaskUtils.isVisible(loginItem._passwordWarning),
          "The password warning should not visible"
        );
        passwordInput.value = "testpass1";

        // Since the password field is focused, the origin warning should not be displayed.
        Assert.ok(
          ContentTaskUtils.isHidden(loginItem._originWarning),
          "The origin warning should not be visible if the origin input field is not focused"
        );

        let saveChangesButton = loginItem.shadowRoot.querySelector(
          ".save-changes-button"
        );
        saveChangesButton.click();
      }
    );

    info("waiting for login to get added to storage");
    await storageChangedPromised;
    info("login added to storage");

    let canTestOSKeyStoreLogin = OSKeyStoreTestUtils.canTestOSKeyStoreLogin();
    if (canTestOSKeyStoreLogin) {
      storageChangedPromised = TestUtils.topicObserved(
        "passwordmgr-storage-changed",
        (_, data) => data == "modifyLogin"
      );
    }
    await SpecialPowers.spawn(browser, [originTuple], async aOriginTuple => {
      await ContentTaskUtils.waitForCondition(() => {
        return !content.document.documentElement.classList.contains(
          "no-logins"
        );
      }, "waiting for no-logins view to exit");
      Assert.ok(
        !content.document.documentElement.classList.contains("no-logins"),
        "Should no longer be in no logins view"
      );
      let loginList = Cu.waiveXrays(
        content.document.querySelector("login-list")
      );
      Assert.ok(
        !loginList.classList.contains("no-logins"),
        "login-list should no longer be in no logins view"
      );
      Assert.ok(
        ContentTaskUtils.isHidden(loginList._blankLoginListItem),
        "the blank login list item should be hidden after adding new login"
      );
      Assert.ok(
        !loginList._createLoginButton.disabled,
        "Create button shouldn't be disabled after exiting create login view"
      );

      let loginGuid = await ContentTaskUtils.waitForCondition(() => {
        return loginList._loginGuidsSortedOrder.find(
          guid => loginList._logins[guid].login.origin == aOriginTuple[1]
        );
      }, "Waiting for login to be displayed");
      Assert.ok(loginGuid, "Expected login found in login-list");

      let loginItem = Cu.waiveXrays(
        content.document.querySelector("login-item")
      );
      Assert.equal(loginItem._login.guid, loginGuid, "login-item should match");

      let { login, listItem } = loginList._logins[loginGuid];
      Assert.ok(
        listItem.classList.contains("selected"),
        "list item should be selected"
      );
      Assert.equal(
        login.origin,
        aOriginTuple[1],
        "Stored login should only include the origin of the URL provided during creation"
      );
      Assert.equal(
        login.username,
        "testuser1",
        "Stored login should have username provided during creation"
      );
      Assert.equal(
        login.password,
        "testpass1",
        "Stored login should have password provided during creation"
      );

      let usernameInput = loginItem.shadowRoot.querySelector(
        "input[name='username']"
      );
      await ContentTaskUtils.waitForCondition(
        () => usernameInput.placeholder,
        "waiting for placeholder to get set"
      );
      Assert.ok(
        usernameInput.placeholder,
        "there should be a placeholder on the username input when not in edit mode"
      );
    });

    if (!canTestOSKeyStoreLogin) {
      continue;
    }

    let reauthObserved = forceAuthTimeoutAndWaitForOSKeyStoreLogin({
      loginResult: true,
    });
    await SpecialPowers.spawn(browser, [originTuple], async aOriginTuple => {
      let loginItem = Cu.waiveXrays(
        content.document.querySelector("login-item")
      );
      let editButton = loginItem.shadowRoot.querySelector("edit-button");
      info("clicking on edit button");
      editButton.click();
    });
    info("waiting for oskeystore auth");
    await reauthObserved;

    await SpecialPowers.spawn(browser, [originTuple], async aOriginTuple => {
      let loginItem = Cu.waiveXrays(
        content.document.querySelector("login-item")
      );
      await ContentTaskUtils.waitForCondition(
        () => loginItem.dataset.editing,
        "waiting for 'edit' mode"
      );
      info("in edit mode");

      let usernameInput = loginItem.shadowRoot.querySelector(
        "input[name='username']"
      );
      let passwordInput = loginItem.shadowRoot.querySelector(
        "input[type='password']"
      );
      passwordInput.focus();
      passwordInput = loginItem.shadowRoot.querySelector(
        "input[name='password']"
      );
      usernameInput.value = "testuser2";
      passwordInput.value = "testpass2";

      let saveChangesButton = loginItem.shadowRoot.querySelector(
        ".save-changes-button"
      );
      info("clicking save changes button");
      saveChangesButton.click();
    });

    info("waiting for login to get modified in storage");
    await storageChangedPromised;
    info("login modified in storage");

    await SpecialPowers.spawn(browser, [originTuple], async aOriginTuple => {
      let loginList = Cu.waiveXrays(
        content.document.querySelector("login-list")
      );
      let login;
      await ContentTaskUtils.waitForCondition(() => {
        login = Object.values(loginList._logins).find(
          obj => obj.login.origin == aOriginTuple[1]
        ).login;
        info(`${login.origin} / ${login.username} / ${login.password}`);
        return (
          login.origin == aOriginTuple[1] &&
          login.username == "testuser2" &&
          login.password == "testpass2"
        );
      }, "waiting for the login to get updated");
      Assert.equal(
        login.origin,
        aOriginTuple[1],
        "Stored login should only include the origin of the URL provided during creation"
      );
      Assert.equal(
        login.username,
        "testuser2",
        "Stored login should have modified username"
      );
      Assert.equal(
        login.password,
        "testpass2",
        "Stored login should have modified password"
      );
    });
  }

  await SpecialPowers.spawn(
    browser,
    [testCases.length],
    async testCasesLength => {
      let loginList = Cu.waiveXrays(
        content.document.querySelector("login-list")
      );
      Assert.equal(
        loginList._loginGuidsSortedOrder.length,
        5,
        "login list should have a login per testcase"
      );
    }
  );
});

add_task(async function test_cancel_create_login() {
  let browser = gBrowser.selectedBrowser;
  await SpecialPowers.spawn(browser, [], async () => {
    let loginList = Cu.waiveXrays(content.document.querySelector("login-list"));
    Assert.ok(
      loginList._selectedGuid,
      "there should be a selected guid before create mode"
    );
    Assert.ok(
      ContentTaskUtils.isHidden(loginList._blankLoginListItem),
      "the blank login list item should be hidden before create mode"
    );

    let createButton = loginList._createLoginButton;
    createButton.click();

    Assert.ok(
      !loginList._selectedGuid,
      "there should be no selected guid when in create mode"
    );
    Assert.ok(
      ContentTaskUtils.isVisible(loginList._blankLoginListItem),
      "the blank login list item should be visible in create mode"
    );

    let loginItem = Cu.waiveXrays(content.document.querySelector("login-item"));
    let cancelButton = loginItem.shadowRoot.querySelector(".cancel-button");
    cancelButton.click();

    Assert.ok(
      loginList._selectedGuid,
      "there should be a selected guid after canceling create mode"
    );
    Assert.ok(
      ContentTaskUtils.isHidden(loginList._blankLoginListItem),
      "the blank login list item should be hidden after canceling create mode"
    );
  });
});

add_task(
  async function test_cancel_create_login_with_filter_showing_one_login() {
    const browser = gBrowser.selectedBrowser;
    await SpecialPowers.spawn(browser, [], async () => {
      const loginList = Cu.waiveXrays(
        content.document.querySelector("login-list")
      );

      const loginFilter = Cu.waiveXrays(
        loginList.shadowRoot.querySelector("login-filter")
      );
      loginFilter.value = "bugzilla.mozilla.org";
      Assert.equal(
        loginList._list.querySelectorAll(
          "login-list-item[data-guid]:not([hidden])"
        ).length,
        1,
        "filter should have one login showing"
      );
      let visibleLoginGuid = loginList.shadowRoot.querySelectorAll(
        "login-list-item[data-guid]:not([hidden])"
      )[0].dataset.guid;

      let createButton = loginList._createLoginButton;
      createButton.click();

      let loginItem = Cu.waiveXrays(
        content.document.querySelector("login-item")
      );
      let cancelButton = loginItem.shadowRoot.querySelector(".cancel-button");
      Assert.ok(
        ContentTaskUtils.isVisible(cancelButton),
        "cancel button should be visible in create mode with one login showing"
      );
      cancelButton.click();

      Assert.equal(
        loginFilter.value,
        "bugzilla.mozilla.org",
        "login-filter should not be cleared if there was a login in the list"
      );
      Assert.equal(
        loginList.shadowRoot.querySelectorAll(
          "login-list-item[data-guid]:not([hidden])"
        )[0].dataset.guid,
        visibleLoginGuid,
        "the same login should still be visible"
      );
    });
  }
);

add_task(async function test_cancel_create_login_with_logins_filtered_out() {
  const browser = gBrowser.selectedBrowser;
  await SpecialPowers.spawn(browser, [], async () => {
    const loginList = Cu.waiveXrays(
      content.document.querySelector("login-list")
    );
    const loginFilter = Cu.waiveXrays(
      loginList.shadowRoot.querySelector("login-filter")
    );
    loginFilter.value = "XXX-no-logins-should-match-this-XXX";
    await Promise.resolve();
    Assert.equal(
      loginList._list.querySelectorAll(
        "login-list-item[data-guid]:not([hidden])"
      ).length,
      0,
      "filter should have no logins showing"
    );

    let createButton = loginList._createLoginButton;
    createButton.click();

    let loginItem = Cu.waiveXrays(content.document.querySelector("login-item"));
    let cancelButton = loginItem.shadowRoot.querySelector(".cancel-button");
    Assert.ok(
      ContentTaskUtils.isVisible(cancelButton),
      "cancel button should be visible in create mode with no logins showing"
    );
    cancelButton.click();
    await Promise.resolve();

    Assert.equal(
      loginFilter.value,
      "",
      "login-filter should be cleared if there were no logins in the list"
    );
    let visibleLoginItems = loginList.shadowRoot.querySelectorAll(
      "login-list-item[data-guid]:not([hidden])"
    );
    Assert.equal(
      visibleLoginItems.length,
      5,
      "all logins should be visible with blank filter"
    );
    Assert.equal(
      loginList._selectedGuid,
      visibleLoginItems[0].dataset.guid,
      "the first item in the list should be selected"
    );
  });
});

add_task(async function test_create_duplicate_login() {
  if (!OSKeyStoreTestUtils.canTestOSKeyStoreLogin()) {
    return;
  }

  let browser = gBrowser.selectedBrowser;
  EXPECTED_ERROR_MESSAGE = "This login already exists.";
  await SpecialPowers.spawn(browser, [], async () => {
    let loginList = Cu.waiveXrays(content.document.querySelector("login-list"));
    let createButton = loginList._createLoginButton;
    createButton.click();

    let loginItem = Cu.waiveXrays(content.document.querySelector("login-item"));
    let originInput = loginItem.shadowRoot.querySelector(
      "input[name='origin']"
    );
    let usernameInput = loginItem.shadowRoot.querySelector(
      "input[name='username']"
    );
    let passwordInput = loginItem.shadowRoot.querySelector(
      "input[name='password']"
    );
    const EXISTING_USERNAME = "testuser2";
    const EXISTING_ORIGIN = "https://example.com";
    originInput.value = EXISTING_ORIGIN;
    usernameInput.value = EXISTING_USERNAME;
    passwordInput.value = "different password value";

    let saveChangesButton = loginItem.shadowRoot.querySelector(
      ".save-changes-button"
    );
    saveChangesButton.click();

    await ContentTaskUtils.waitForCondition(
      () => !loginItem._errorMessage.hidden,
      "waiting until the error message is visible"
    );
    let duplicatedGuid = Object.values(loginList._logins).find(
      v =>
        v.login.origin == EXISTING_ORIGIN &&
        v.login.username == EXISTING_USERNAME
    ).login.guid;
    Assert.equal(
      loginItem._errorMessageLink.dataset.errorGuid,
      duplicatedGuid,
      "Error message has GUID of existing duplicated login set on it"
    );

    let confirmationDialog = Cu.waiveXrays(
      content.document.querySelector("confirmation-dialog")
    );
    Assert.ok(
      confirmationDialog.hidden,
      "the discard-changes dialog should be hidden before clicking the error-message-text"
    );
    loginItem._errorMessageLink.querySelector("a").click();
    Assert.ok(
      !confirmationDialog.hidden,
      "the discard-changes dialog should be visible"
    );
    let discardChangesButton =
      confirmationDialog.shadowRoot.querySelector(".confirm-button");
    discardChangesButton.click();

    await ContentTaskUtils.waitForCondition(
      () =>
        Object.keys(loginItem._login).length > 1 &&
        loginItem._login.guid == duplicatedGuid,
      "waiting until the existing duplicated login is selected"
    );
    Assert.equal(
      loginList._selectedGuid,
      duplicatedGuid,
      "the duplicated login should be selected in the list"
    );
  });
  EXPECTED_ERROR_MESSAGE = null;
});
