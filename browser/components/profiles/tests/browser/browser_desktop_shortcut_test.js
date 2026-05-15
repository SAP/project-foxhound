/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const setup = async () => {
  await initGroupDatabase();
  let profile = SelectableProfileService.currentProfile;
  Assert.ok(profile, "Should have a profile now");

  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
  Services.telemetry.clearEvents();
  return profile;
};

add_task(async function test_create_shortcut() {
  if (!AppConstants.MOZ_SELECTABLE_PROFILES) {
    // `mochitest-browser` suite `add_task` does not yet support
    // `properties.skip_if`.
    ok(true, "Skipping because !AppConstants.MOZ_SELECTABLE_PROFILES");
    return;
  }
  const profile = await setup();
  const sandbox = sinon.createSandbox();
  let createShortcutCalled = false;
  sandbox.stub(profile, "getWindowsShellService").returns({
    createShortcut: () => {
      // Stub out the existence check so the toggle can update.
      sandbox.stub(profile, "hasDesktopShortcut").returns(true);
      createShortcutCalled = true;
      return Promise.resolve();
    },
  });

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: "about:editprofile",
    },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        let editProfileCard =
          content.document.querySelector("edit-profile-card").wrappedJSObject;
        await ContentTaskUtils.waitForCondition(
          () => editProfileCard.initialized,
          "Waiting for edit-profile-card to be initialized"
        );
        await editProfileCard.updateComplete;

        let shortcutToggle = editProfileCard.shortcutToggle;

        Assert.equal(
          shortcutToggle.buttonEl.getAttribute("aria-label"),
          "Create desktop shortcut",
          "The desktop shortcut toggle should have the expected aria-label"
        );

        Assert.ok(
          !shortcutToggle.pressed,
          "The desktop shortcut toggle should initially be in the off position"
        );

        EventUtils.synthesizeMouseAtCenter(shortcutToggle, {}, content);

        await ContentTaskUtils.waitForCondition(
          () => shortcutToggle.pressed,
          "The shortcut toggle should flip its state"
        );
      });
    }
  );

  Assert.ok(
    createShortcutCalled,
    "ShellService.createShortcut should have been called"
  );

  await assertGlean("profiles", "existing", "shortcut", "create");

  sandbox.restore();
});

add_task(async function test_delete_shortcut() {
  if (!AppConstants.MOZ_SELECTABLE_PROFILES) {
    // `mochitest-browser` suite `add_task` does not yet support
    // `properties.skip_if`.
    ok(true, "Skipping because !AppConstants.MOZ_SELECTABLE_PROFILES");
    return;
  }
  const profile = await setup();
  const sandbox = sinon.createSandbox();

  // Stub out the existence check so the toggle can update.
  sandbox.stub(profile, "hasDesktopShortcut").returns(true);

  let deleteShortcutCalled = false;
  sandbox.stub(profile, "getWindowsShellService").returns({
    deleteShortcut: () => {
      deleteShortcutCalled = true;
      profile.hasDesktopShortcut.restore();
      sandbox.stub(profile, "hasDesktopShortcut").returns(false);
      return Promise.resolve();
    },
  });

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: "about:editprofile",
    },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        let editProfileCard =
          content.document.querySelector("edit-profile-card").wrappedJSObject;
        await ContentTaskUtils.waitForCondition(
          () => editProfileCard.initialized,
          "Waiting for edit-profile-card to be initialized"
        );
        await editProfileCard.updateComplete;

        let shortcutToggle = editProfileCard.shortcutToggle;
        Assert.ok(
          shortcutToggle.pressed,
          "The desktop shortcut toggle should initially be in the on position"
        );

        EventUtils.synthesizeMouseAtCenter(shortcutToggle, {}, content);

        await ContentTaskUtils.waitForCondition(
          () => !shortcutToggle.pressed,
          "The shortcut toggle should flip its state"
        );
      });
    }
  );

  Assert.ok(
    deleteShortcutCalled,
    "ShellService.deleteShortcut should have been called"
  );

  await assertGlean("profiles", "existing", "shortcut", "delete");

  sandbox.restore();
});
