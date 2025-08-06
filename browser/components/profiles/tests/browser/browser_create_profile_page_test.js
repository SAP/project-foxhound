/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const NEW_PROFILE_NAME = "This is a new profile name";

add_task(async function test_create_profile_name() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.profiles.profile-name.updated", false]],
  });

  await initGroupDatabase();
  let profile = SelectableProfileService.currentProfile;
  Assert.ok(profile, "Should have a profile now");

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: "about:newprofile",
    },
    async browser => {
      await SpecialPowers.spawn(
        browser,
        [NEW_PROFILE_NAME],
        async newProfileName => {
          let newProfileCard =
            content.document.querySelector("new-profile-card").wrappedJSObject;

          await ContentTaskUtils.waitForCondition(
            () => newProfileCard.initialized,
            "Waiting for new-profile-card to be initialized"
          );

          await newProfileCard.updateComplete;
          await newProfileCard.mozCard.updateComplete;

          let nameInput = newProfileCard.nameInput;
          Assert.equal(nameInput.value, "", "Profile is empty to start");

          nameInput.value = newProfileName;
          nameInput.dispatchEvent(new content.Event("input"));

          await ContentTaskUtils.waitForCondition(() => {
            let savedMessage =
              newProfileCard.shadowRoot.querySelector("#saved-message");
            return ContentTaskUtils.isVisible(savedMessage);
          });
        }
      );

      let curProfile = await SelectableProfileService.getProfile(profile.id);

      Assert.equal(
        curProfile.name,
        NEW_PROFILE_NAME,
        "Profile name was updated in database"
      );

      Assert.equal(
        SelectableProfileService.currentProfile.name,
        NEW_PROFILE_NAME,
        "Current profile name was updated"
      );
    }
  );

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_new_profile_avatar() {
  if (!AppConstants.MOZ_SELECTABLE_PROFILES) {
    // `mochitest-browser` suite `add_task` does not yet support
    // `properties.skip_if`.
    ok(true, "Skipping because !AppConstants.MOZ_SELECTABLE_PROFILES");
    return;
  }

  let profile = SelectableProfileService.currentProfile;
  Assert.ok(profile, "Should have a profile now");

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: "about:newprofile",
    },
    async browser => {
      await SpecialPowers.spawn(browser, [], async () => {
        let newProfileCard =
          content.document.querySelector("new-profile-card").wrappedJSObject;

        await ContentTaskUtils.waitForCondition(
          () => newProfileCard.initialized,
          "Waiting for new-profile-card to be initialized"
        );

        await newProfileCard.updateComplete;
        await newProfileCard.mozCard.updateComplete;

        let avatars = newProfileCard.avatars;
        avatars[0].click();
      });

      let curProfile = await SelectableProfileService.getProfile(profile.id);

      Assert.equal(
        curProfile.avatar,
        "book",
        "Profile avatar was updated in database"
      );

      Assert.equal(
        SelectableProfileService.currentProfile.avatar,
        "book",
        "Current profile avatar was updated"
      );
    }
  );
});
