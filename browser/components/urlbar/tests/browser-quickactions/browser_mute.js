/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the mute quick action.
 */

"use strict";

const TEST_ROOT = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);
const AUDIO_FILE =
  "https://example.com/browser/toolkit/content/tests/browser/audio.ogg";

const assertAction = async name => {
  await BrowserTestUtils.waitForMutationCondition(
    window.document.getElementById("urlbar-results"),
    { childList: true, subtree: true },
    () =>
      window.document.querySelector(
        `.urlbarView-action-btn[data-action=${name}]`
      )
  );
  Assert.ok(true, `We found action "${name}"`);
};

async function waitForTabSoundIndicatorAppears(tab) {
  if (!tab.soundPlaying) {
    info("Tab sound indicator doesn't appear yet");
    await BrowserTestUtils.waitForMutationCondition(
      tab,
      { attributeFilter: ["soundplaying"] },
      () => tab.hasAttribute("soundplaying")
    );
  }
  ok(tab.soundPlaying, "Tab sound indicator appears");
}

async function createTabWithAudio() {
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );
  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [AUDIO_FILE],
    async audioFile => {
      const audio = content.document.createElement("audio");
      audio.src = audioFile;
      audio.loop = true;
      content.document.body.appendChild(audio);
      content.testAudio = audio;
    }
  );
  return tab;
}

async function playTabAudio(tab) {
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    await content.testAudio.play();
  });
}

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.quickactions.enabled", true],
      ["browser.urlbar.quickactions.timesShownOnboardingLabel", 0],
    ],
  });
});

add_task(async function test_mute_not_visible_without_audio() {
  info("Search for the mute action with no audio playing");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "mute",
  });

  Assert.ok(
    !window.document.querySelector(".urlbarView-action-btn[data-action=mute]"),
    "Mute action is not shown when no audio is playing"
  );

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });
});

add_task(async function test_mute_not_visible_when_all_playing_tabs_muted() {
  info("Create tabs playing audio in multiple windows");
  const audioTab1 = await createTabWithAudio();
  const newWindow = await BrowserTestUtils.openNewBrowserWindow();
  const audioTab2 = await BrowserTestUtils.openNewForegroundTab(
    newWindow.gBrowser,
    "about:blank"
  );
  await SpecialPowers.spawn(
    audioTab2.linkedBrowser,
    [AUDIO_FILE],
    async audioFile => {
      const audio = content.document.createElement("audio");
      audio.src = audioFile;
      audio.loop = true;
      content.document.body.appendChild(audio);
      content.testAudio = audio;
    }
  );

  await playTabAudio(audioTab1);
  await waitForTabSoundIndicatorAppears(audioTab1);
  await SpecialPowers.spawn(audioTab2.linkedBrowser, [], async () => {
    await content.testAudio.play();
  });
  await waitForTabSoundIndicatorAppears(audioTab2);

  info("Mute all playing tabs");
  audioTab1.toggleMuteAudio();
  audioTab2.toggleMuteAudio();
  await BrowserTestUtils.waitForMutationCondition(
    gBrowser.tabContainer,
    { attributeFilter: ["muted"], subtree: true },
    () => audioTab1.muted && audioTab2.muted,
    "Both tabs should be muted"
  );

  info("Search for the mute action — should not appear");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "mute",
  });

  Assert.ok(
    !window.document.querySelector(".urlbarView-action-btn[data-action=mute]"),
    "Mute action is not shown when all playing tabs are already muted"
  );

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  BrowserTestUtils.removeTab(audioTab1);
  await BrowserTestUtils.closeWindow(newWindow);
});

add_task(async function test_mute_single_tab() {
  info("Create a tab playing audio");
  const audioTab = await createTabWithAudio();

  info("Start playing audio");
  await playTabAudio(audioTab);
  await waitForTabSoundIndicatorAppears(audioTab);

  info("Verify tab is not muted");
  Assert.ok(!audioTab.muted, "Tab is not muted initially");

  info("Search for the mute quick action");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "mute",
  });

  await assertAction("mute");

  info("Trigger the mute action");
  EventUtils.synthesizeKey("KEY_Tab", {}, window);
  EventUtils.synthesizeKey("KEY_Enter", {}, window);

  info("Wait for tab to be muted");
  await BrowserTestUtils.waitForMutationCondition(
    audioTab,
    { attributeFilter: ["muted"] },
    () => audioTab.muted
  );

  Assert.ok(audioTab.muted, "Tab is now muted");

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  BrowserTestUtils.removeTab(audioTab);
});

add_task(async function test_mute_multiple_tabs() {
  info("Create multiple tabs playing audio");
  const audioTab1 = await createTabWithAudio();
  const audioTab2 = await createTabWithAudio();
  const audioTab3 = await createTabWithAudio();

  info("Start playing audio in all tabs");
  await playTabAudio(audioTab1);
  await waitForTabSoundIndicatorAppears(audioTab1);
  await playTabAudio(audioTab2);
  await waitForTabSoundIndicatorAppears(audioTab2);
  await playTabAudio(audioTab3);
  await waitForTabSoundIndicatorAppears(audioTab3);

  info("Verify tabs are not muted");
  Assert.ok(!audioTab1.muted, "Tab 1 is not muted initially");
  Assert.ok(!audioTab2.muted, "Tab 2 is not muted initially");
  Assert.ok(!audioTab3.muted, "Tab 3 is not muted initially");

  info("Search for the mute quick action");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "mute",
  });

  await assertAction("mute");

  info("Trigger the mute action");
  EventUtils.synthesizeKey("KEY_Tab", {}, window);
  EventUtils.synthesizeKey("KEY_Enter", {}, window);

  info("Wait for all tabs to be muted");
  await BrowserTestUtils.waitForMutationCondition(
    gBrowser.tabContainer,
    { attributeFilter: ["muted"], subtree: true },
    () => audioTab1.muted && audioTab2.muted && audioTab3.muted
  );

  Assert.ok(audioTab1.muted, "Tab 1 is now muted");
  Assert.ok(audioTab2.muted, "Tab 2 is now muted");
  Assert.ok(audioTab3.muted, "Tab 3 is now muted");

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  BrowserTestUtils.removeTab(audioTab1);
  BrowserTestUtils.removeTab(audioTab2);
  BrowserTestUtils.removeTab(audioTab3);
});

add_task(async function test_mute_skips_already_muted_tabs() {
  info("Create multiple tabs playing audio");
  const audioTab1 = await createTabWithAudio();
  const audioTab2 = await createTabWithAudio();

  info("Start playing audio in all tabs");
  await playTabAudio(audioTab1);
  await waitForTabSoundIndicatorAppears(audioTab1);
  await playTabAudio(audioTab2);
  await waitForTabSoundIndicatorAppears(audioTab2);

  info("Manually mute tab 1");
  audioTab1.toggleMuteAudio();
  await BrowserTestUtils.waitForMutationCondition(
    audioTab1,
    { attributeFilter: ["muted"] },
    () => audioTab1.muted
  );

  info("Verify initial mute states");
  Assert.ok(audioTab1.muted, "Tab 1 is muted");
  Assert.ok(!audioTab2.muted, "Tab 2 is not muted");

  info("Search for the mute quick action");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "mute",
  });

  await assertAction("mute");

  info("Trigger the mute action");
  EventUtils.synthesizeKey("KEY_Tab", {}, window);
  EventUtils.synthesizeKey("KEY_Enter", {}, window);

  info("Wait for tab 2 to be muted");
  await BrowserTestUtils.waitForMutationCondition(
    gBrowser.tabContainer,
    { attributeFilter: ["muted"], subtree: true },
    () => audioTab2.muted
  );

  Assert.ok(audioTab1.muted, "Tab 1 is still muted");
  Assert.ok(audioTab2.muted, "Tab 2 is now muted");

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  BrowserTestUtils.removeTab(audioTab1);
  BrowserTestUtils.removeTab(audioTab2);
});

add_task(async function test_mute_tabs_across_windows() {
  info("Create a new window");
  const newWindow = await BrowserTestUtils.openNewBrowserWindow();

  info("Create tabs playing audio in both windows");
  const audioTab1 = await createTabWithAudio();
  const audioTab2 = await BrowserTestUtils.openNewForegroundTab(
    newWindow.gBrowser,
    "about:blank"
  );

  await SpecialPowers.spawn(
    audioTab2.linkedBrowser,
    [AUDIO_FILE],
    async audioFile => {
      const audio = content.document.createElement("audio");
      audio.src = audioFile;
      audio.loop = true;
      content.document.body.appendChild(audio);
      content.testAudio = audio;
    }
  );

  info("Start playing audio in both tabs");
  await playTabAudio(audioTab1);
  await waitForTabSoundIndicatorAppears(audioTab1);

  await SpecialPowers.spawn(audioTab2.linkedBrowser, [], async () => {
    await content.testAudio.play();
  });
  await waitForTabSoundIndicatorAppears(audioTab2);

  info("Verify tabs are not muted");
  Assert.ok(!audioTab1.muted, "Tab in window 1 is not muted initially");
  Assert.ok(!audioTab2.muted, "Tab in window 2 is not muted initially");

  info("Search for the mute quick action in the first window");
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "mute",
  });

  await assertAction("mute");

  info("Trigger the mute action");
  EventUtils.synthesizeKey("KEY_Tab", {}, window);
  EventUtils.synthesizeKey("KEY_Enter", {}, window);

  info("Wait for all tabs in both windows to be muted");
  await BrowserTestUtils.waitForMutationCondition(
    gBrowser.tabContainer,
    { attributeFilter: ["muted"], subtree: true },
    () => audioTab1.muted && audioTab2.muted
  );

  Assert.ok(audioTab1.muted, "Tab in window 1 is now muted");
  Assert.ok(audioTab2.muted, "Tab in window 2 is now muted");

  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Escape");
  });

  BrowserTestUtils.removeTab(audioTab1);
  await BrowserTestUtils.closeWindow(newWindow);
});
