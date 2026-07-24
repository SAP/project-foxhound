/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.contextual-password-manager.enabled", true],
      ["signon.rememberSignons", true],
    ],
  });
  registerCleanupFunction(LoginTestUtils.clearData);
});

const getShadowBtn = (el, selector) =>
  el.querySelector(selector).shadowRoot.querySelector("button");

async function openLoginForm(megalist, isFromMenuDropdown = true) {
  info("Opening login form.");

  let button = null;
  if (isFromMenuDropdown) {
    await BrowserTestUtils.waitForCondition(
      () => megalist.querySelector("#more-options-menubutton"),
      "menu button failed to render"
    );

    const menu = megalist.querySelector("panel-list");

    const menuButton = megalist.querySelector("#more-options-menubutton");
    menuButton.click();
    await BrowserTestUtils.waitForEvent(menu, "shown");
    button = getShadowBtn(menu, "[action='add-password']");
  } else {
    button = megalist.querySelector(".empty-state-add-password");
  }

  const loginFormPromise = BrowserTestUtils.waitForCondition(
    () => megalist.querySelector("login-form"),
    "Login form failed to load."
  );
  button.click();
  return loginFormPromise;
}

function addLogin(megalist, { origin, username, password }) {
  const loginForm = megalist.querySelector("login-form");
  setInputValue(loginForm, "login-origin-field", origin);
  setInputValue(loginForm, "login-username-field", username);
  setInputValue(loginForm, "login-password-field", password);
  const saveButton = loginForm.shadowRoot.querySelector(
    "moz-button[type=primary]"
  );
  info("Submitting form.");
  saveButton.buttonEl.click();
}

function waitForPopup(megalist, element) {
  info(`Wait for ${element} popup`);
  const loginForm = megalist.querySelector("login-form");
  const popupPromise = BrowserTestUtils.waitForCondition(
    () =>
      loginForm.shadowRoot
        .querySelector(`${element}`)
        .classList.contains("invalid-input"),
    `${element} popup did not render.`
  );
  return popupPromise;
}

function waitForRecords(count) {
  info(`Wait for records to reach expected amount ${count}.`);
  const sidebar = document.getElementById("sidebar");
  const megalistComponent =
    sidebar.contentDocument.querySelector("megalist-alpha");
  return BrowserTestUtils.waitForCondition(
    () => megalistComponent.records.length == count,
    `records did not he ${count} elements`
  );
}

function getScrollPromise(megalist) {
  const scrollingElement = megalist.ownerDocument.scrollingElement;
  const scrollPromise = BrowserTestUtils.waitForCondition(
    () => scrollingElement.scrollTopMax == scrollingElement.scrollTop,
    "Did not scroll to new login."
  );
  return scrollPromise;
}

add_task(async function test_add_login_success() {
  Services.fog.testResetFOG();
  await Services.fog.testFlushAllChildren();

  const megalist = await openPasswordsSidebar();
  await waitForSnapshots();
  await openLoginForm(megalist, false);

  let toolbarEvents = Glean.contextualManager.toolbarAction.testGetValue();
  Assert.equal(toolbarEvents.length, 1, "Recorded add password once.");
  assertCPMGleanEvent(toolbarEvents[0], {
    trigger: "empty_state_card",
    option_name: "add_new",
  });

  addLogin(megalist, TEST_LOGIN_1);
  const notifMsgBar = await checkNotificationAndTelemetry(
    megalist,
    "add-login-success"
  );

  await checkAllLoginsRendered(megalist);

  checkNotificationInteractionTelemetry(notifMsgBar, "primary-action", {
    notification_detail: "add_login_success",
    action_type: "nav_record",
  });

  let updateEvents = Glean.contextualManager.recordsUpdate.testGetValue();
  Assert.equal(updateEvents.length, 1, "Recorded manual add password once.");
  assertCPMGleanEvent(updateEvents[0], {
    change_type: "add",
  });

  LoginTestUtils.clearData();
});

add_task(async function test_add_duplicate_login() {
  Services.fog.testResetFOG();
  await Services.fog.testFlushAllChildren();

  await addMockPasswords();

  const megalist = await openPasswordsSidebar();
  await waitForRecords(3);
  await openLoginForm(megalist);
  addLogin(megalist, TEST_LOGIN_1);
  const notifMsgBar = await checkNotificationAndTelemetry(
    megalist,
    "login-already-exists-warning"
  );
  checkNotificationInteractionTelemetry(notifMsgBar, "primary-action", {
    notification_detail: "login_already_exists_warning",
    action_type: "nav_record",
  });

  LoginTestUtils.clearData();
});

add_task(async function test_add_login_empty_origin() {
  Services.fog.testResetFOG();
  await Services.fog.testFlushAllChildren();

  const megalist = await openPasswordsSidebar();
  await waitForSnapshots();
  await openLoginForm(megalist);
  addLogin(megalist, {
    ...TEST_LOGIN_1,
    origin: "",
  });
  await waitForPopup(megalist, "origin-warning");

  const logins = await Services.logins.getAllLogins();
  is(logins.length, 0, "No login was added after submitting form.");

  LoginTestUtils.clearData();
  info("Closing the sidebar");
  SidebarController.hide();
});

add_task(async function test_add_login_empty_password_and_resubmit() {
  const megalist = await openPasswordsSidebar();
  await waitForSnapshots();
  await openLoginForm(megalist, false);
  const loginForm = megalist.querySelector("login-form");
  setInputValue(loginForm, "login-origin-field", TEST_LOGIN_1.origin);
  setInputValue(loginForm, "login-username-field", TEST_LOGIN_1.username);
  setInputValue(loginForm, "login-password-field", "");

  const saveButton = loginForm.shadowRoot.querySelector(
    "moz-button[type=primary]"
  );
  info("Submitting empty password once.");
  saveButton.buttonEl.click();

  await waitForPopup(megalist, "password-warning");
  ok(
    !loginForm.shadowRoot
      .querySelector("origin-warning")
      .classList.contains("invalid-input"),
    "Origin field should not be marked invalid when only the password is empty."
  );

  info("Submitting empty password a second time without changing value.");
  saveButton.buttonEl.click();
  await waitForPopup(megalist, "password-warning");
  ok(
    loginForm.isConnected,
    "Login form remains open after repeated invalid submissions."
  );

  const logins = await Services.logins.getAllLogins();
  is(logins.length, 0, "No login was added after submitting form.");

  info("Entering a valid password clears the warning.");
  setInputValue(loginForm, "login-password-field", TEST_LOGIN_1.password);
  await BrowserTestUtils.waitForCondition(
    () =>
      !loginForm.shadowRoot
        .querySelector("password-warning")
        .classList.contains("invalid-input"),
    "Password warning should be removed after entering a valid password."
  );

  LoginTestUtils.clearData();
  info("Closing the sidebar");
  SidebarController.hide();
});

add_task(async function test_edit_login_empty_password_requires_new_value() {
  const login = TEST_LOGIN_1;
  await LoginTestUtils.addLogin(login);

  const megalist = await openPasswordsSidebar();
  await checkAllLoginsRendered(megalist);

  const passwordCard = megalist.querySelector("password-card");
  await waitForReauth(() => passwordCard.editBtn.click());
  await BrowserTestUtils.waitForCondition(
    () => megalist.querySelector("login-form"),
    "Login form failed to render in edit mode."
  );

  let loginForm = megalist.querySelector("login-form");
  setInputValue(loginForm, "login-password-field", "");

  const saveButton = loginForm.shadowRoot.querySelector(
    "moz-button[type=primary]"
  );
  info("Submitting edit form with empty password.");
  saveButton.buttonEl.click();
  await waitForPopup(megalist, "password-warning");

  const passwordField = loginForm.shadowRoot.querySelector(
    "login-password-field"
  );
  await BrowserTestUtils.waitForCondition(
    () => passwordField.input.value === "",
    "Password input should remain empty after an invalid submission."
  );
  is(passwordField.value, "", "Password component state cleared.");

  info("Trying to save again after the first error.");
  saveButton.buttonEl.click();
  await BrowserTestUtils.waitForCondition(() => {
    const form = megalist.querySelector("login-form");
    return (
      form &&
      form.shadowRoot
        .querySelector("password-warning")
        .classList.contains("invalid-input")
    );
  }, "Password warning should persist after repeated invalid edits.");

  loginForm = megalist.querySelector("login-form");
  ok(loginForm, "Login form remains open after invalid edit submissions.");

  const logins = await Services.logins.getAllLogins();
  Assert.equal(logins.length, 1, "Stored login count unchanged.");
  Assert.equal(
    logins[0].password,
    login.password,
    "Existing login password not overwritten with empty value."
  );

  LoginTestUtils.clearData();
  info("Closing the sidebar");
  SidebarController.hide();
  const closeWithoutSavingButton = await BrowserTestUtils.waitForCondition(() =>
    megalist
      .querySelector("notification-message-bar")
      ?.shadowRoot.querySelector("moz-message-bar")
      ?.querySelector("#primary-action")
  );
  info("Closing without saving");
  closeWithoutSavingButton.buttonEl.click();
});

add_task(async function test_view_login_command() {
  Services.fog.testResetFOG();
  await Services.fog.testFlushAllChildren();
  await addMockPasswords();

  const megalist = await openPasswordsSidebar();
  await waitForSnapshots();
  await openLoginForm(megalist);
  addLogin(megalist, {
    ...TEST_LOGIN_1,
    origin: "https://zzz.com",
  });

  const notifMsgBar = await checkNotificationAndTelemetry(
    megalist,
    "add-login-success"
  );
  await checkAllLoginsRendered(megalist);
  const scrollPromise = getScrollPromise(megalist);
  checkNotificationInteractionTelemetry(notifMsgBar, "primary-action", {
    notification_detail: "add_login_success",
    action_type: "nav_record",
  });
  await scrollPromise;
  LoginTestUtils.clearData();
});

add_task(async function test_passwords_add_password_empty_state() {
  Services.fog.testResetFOG();
  await Services.fog.testFlushAllChildren();

  const megalist = await openPasswordsSidebar();
  await checkEmptyState(".no-logins-card-content", megalist);
  ok(true, "Empty state rendered.");

  info("Add a password via empty state");
  await openLoginForm(megalist, false);
  let events = Glean.contextualManager.toolbarAction.testGetValue();
  assertCPMGleanEvent(events[0], {
    trigger: "empty_state_card",
    option_name: "add_new",
  });
  addLogin(megalist, TEST_LOGIN_1);
  const notifMsgBar = await waitForNotification(megalist, "add-login-success");
  await checkAllLoginsRendered(megalist);
  checkNotificationInteractionTelemetry(notifMsgBar, "primary-action", {
    notification_detail: "add_login_success",
    action_type: "nav_record",
  });

  LoginTestUtils.clearData();

  info("Closing the sidebar");
  SidebarController.hide();
});
