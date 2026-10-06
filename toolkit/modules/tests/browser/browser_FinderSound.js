/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const kEnabledPref = "accessibility.typeaheadfind.enablesound";
const kSoundURLPref = "accessibility.typeaheadfind.soundURL";
const kWrappedSoundURLPref = "accessibility.typeaheadfind.wrappedSoundURL";

const { resetSound, playSound } = ChromeUtils.importESModule(
  "resource://gre/modules/FinderSound.sys.mjs"
);

const MockSound = SpecialPowers.MockSound;

add_setup(() => {
  MockSound.init();
  resetSound();
  registerCleanupFunction(() => MockSound.cleanup());
});

add_task(async function test_notfound_sound_with_preferences() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [kSoundURLPref, "beep"],
      [kWrappedSoundURLPref, ""],
      [kEnabledPref, true],
    ],
  }); // default value

  MockSound.reset();
  playSound("not-found");
  SimpleTest.isDeeply(MockSound.played, ["beep"], '"beep" notfound sound');

  await SpecialPowers.pushPrefEnv({
    set: [[kSoundURLPref, ""]],
  });
  MockSound.reset();
  playSound("not-found");
  SimpleTest.isDeeply(
    MockSound.played,
    [],
    "Empty notfound sound plays nothing"
  );

  await SpecialPowers.pushPrefEnv({
    set: [
      [kSoundURLPref, "beep"],
      [kEnabledPref, false],
    ],
  });
  MockSound.reset();
  playSound("not-found");
  SimpleTest.isDeeply(
    MockSound.played,
    [],
    "Disable sound completely (testing: not-found)"
  );
});

add_task(async function test_wrapped_sound_with_preferences() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [kSoundURLPref, "beep"],
      [kWrappedSoundURLPref, ""],
      [kEnabledPref, true],
    ],
  }); // default value

  MockSound.reset();
  playSound("wrapped");
  SimpleTest.isDeeply(MockSound.played, [], "No wrapped sound by default");

  await SpecialPowers.pushPrefEnv({
    set: [[kWrappedSoundURLPref, "beep"]],
  });
  MockSound.reset();
  playSound("wrapped");
  SimpleTest.isDeeply(MockSound.played, ["beep"], '"beep" wrapped sound');

  await SpecialPowers.pushPrefEnv({
    set: [[kWrappedSoundURLPref, ""]],
  });
  MockSound.reset();
  playSound("wrapped");
  SimpleTest.isDeeply(
    MockSound.played,
    [],
    "Empty wrapped sound plays nothing"
  );

  await SpecialPowers.pushPrefEnv({
    set: [
      [kWrappedSoundURLPref, "beep"],
      [kEnabledPref, false],
    ],
  });
  MockSound.reset();
  playSound("wrapped");
  SimpleTest.isDeeply(
    MockSound.played,
    [],
    "Disable sound completely (testing: wrapped)"
  );
});
