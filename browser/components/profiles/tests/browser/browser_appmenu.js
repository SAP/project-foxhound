/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

add_setup(async () => {
  await initGroupDatabase();
  let profile = SelectableProfileService.currentProfile;
  Assert.ok(profile, "Should have a profile now");

  // Mock the executable process so we don't launch a new process
  sinon.stub(SelectableProfileService, "execProcess");

  registerCleanupFunction(() => {
    sinon.restore();
  });
});

// Opens the subview, clicking either of the two app menu profiles buttons
// to open the subview.
async function promiseSubViewOpened() {
  let promiseViewShown = BrowserTestUtils.waitForEvent(
    PanelUI.panel,
    "ViewShown"
  );
  PanelUI.show();
  await promiseViewShown;

  let panel = PanelMultiView.getViewNode(document, "PanelUI-profiles");
  let emptyButton = document.getElementById("appMenu-empty-profiles-button");
  let button = document.getElementById("appMenu-profiles-button");
  let visibleButton = button.hidden ? emptyButton : button;
  EventUtils.synthesizeMouseAtCenter(visibleButton, {});
  return BrowserTestUtils.waitForCondition(() =>
    BrowserTestUtils.isVisible(panel)
  );
}

function getElements() {
  const editButton = PanelMultiView.getViewNode(
    document,
    "profiles-edit-this-profile-button"
  );
  const newProfileButton = PanelMultiView.getViewNode(
    document,
    "profiles-create-profile-button"
  );
  const copyProfileButton = PanelMultiView.getViewNode(
    document,
    "profiles-copy-profile-button"
  );
  const manageProfilesButton = PanelMultiView.getViewNode(
    document,
    "profiles-manage-profiles-button"
  );
  const subview = PanelMultiView.getViewNode(document, "PanelUI-profiles");
  const subviewBody = subview.querySelector(".panel-subview-body");

  return {
    editButton,
    newProfileButton,
    copyProfileButton,
    manageProfilesButton,
    subviewBody,
  };
}

add_task(async function test_appmenu_layout_no_profiles() {
  await SelectableProfileService.init();
  await promiseSubViewOpened();
  let {
    editButton,
    newProfileButton,
    copyProfileButton,
    manageProfilesButton,
    subviewBody,
  } = getElements();

  Assert.ok(BrowserTestUtils.isHidden(editButton));
  Assert.ok(BrowserTestUtils.isVisible(newProfileButton));
  Assert.ok(BrowserTestUtils.isVisible(copyProfileButton));
  Assert.ok(BrowserTestUtils.isVisible(manageProfilesButton));
  Assert.ok(!subviewBody.contains(newProfileButton));
  Assert.ok(!subviewBody.contains(copyProfileButton));
  Assert.ok(!subviewBody.contains(manageProfilesButton));
  Assert.strictEqual(
    subviewBody.compareDocumentPosition(newProfileButton),
    2,
    "The new profile button should precede the subview body"
  );
  Assert.strictEqual(
    subviewBody.compareDocumentPosition(copyProfileButton),
    2,
    "The copy profile button should precede the subview body"
  );
  Assert.strictEqual(
    subviewBody.compareDocumentPosition(manageProfilesButton),
    2,
    "The manage profiles button should precede the subview body"
  );

  await PanelUI.hide();
});

add_task(async function test_appmenu_layout_two_profiles() {
  await SelectableProfileService.init();

  await SelectableProfileService.createNewProfile();

  await promiseSubViewOpened();
  let {
    editButton,
    newProfileButton,
    copyProfileButton,
    manageProfilesButton,
    subviewBody,
  } = getElements();

  Assert.ok(BrowserTestUtils.isVisible(editButton));
  Assert.ok(BrowserTestUtils.isVisible(newProfileButton));
  Assert.ok(BrowserTestUtils.isVisible(copyProfileButton));
  Assert.ok(BrowserTestUtils.isVisible(manageProfilesButton));
  Assert.strictEqual(
    subviewBody.compareDocumentPosition(newProfileButton),
    4,
    "The new profile button should follow the subview body"
  );
  Assert.strictEqual(
    subviewBody.compareDocumentPosition(copyProfileButton),
    4,
    "The copy profile button should follow the subview body"
  );
  Assert.strictEqual(
    subviewBody.compareDocumentPosition(manageProfilesButton),
    4,
    "The manage profiles button should follow the subview body"
  );

  await PanelUI.hide();
});
