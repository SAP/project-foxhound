/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for the following data of engagement telemetry.
// - window

add_setup(async function () {
  await initSapTest();
});

add_task(async function urlbar_newtab() {
  await doUrlbarNewTabTest({
    trigger: win => doEnter({}, win),
    assert: () => assertEngagementTelemetry([{ window_mode: "classic" }]),
  });
});

add_task(async function urlbar() {
  await doUrlbarTest({
    trigger: () => doEnter(),
    assert: () =>
      assertEngagementTelemetry([
        { window_mode: "classic" },
        { window_mode: "classic" },
      ]),
  });
});

add_task(async function searchbar() {
  await doSearchbarTest({
    trigger: () => doEnter(),
    assert: () =>
      assertEngagementTelemetry([
        { window_mode: "classic" },
        { window_mode: "classic" },
      ]),
  });
});

add_task(async function handoff() {
  await doHandoffTest({
    trigger: () => doEnter(),
    assert: () => assertEngagementTelemetry([{ window_mode: "classic" }]),
  });
});

add_task(async function urlbar_addonpage() {
  await doUrlbarAddonpageTest({
    trigger: () => doEnter(),
    assert: () => assertEngagementTelemetry([{ window_mode: "classic" }]),
  });
});

add_task(async function urlbar_private_window() {
  await doUrlbarNewTabTest({
    trigger: win => doEnter({}, win),
    assert: () => assertEngagementTelemetry([{ window_mode: "private" }]),
    private: true,
  });
});

add_task(async function searchbar_private_window() {
  await doSearchbarTest({
    trigger: win => doEnter({}, win),
    assert: () =>
      assertEngagementTelemetry([
        { window_mode: "private" },
        { window_mode: "private" },
      ]),
    private: true,
  });
});

add_task(async function handoff_private_window() {
  await doHandoffTest({
    trigger: win => doEnter({}, win),
    assert: () => assertEngagementTelemetry([{ window_mode: "private" }]),
    private: true,
  });
});

add_task(async function urlbar_addonpage_private_window() {
  await doUrlbarAddonpageTest({
    trigger: win => doEnter({}, win),
    assert: () => assertEngagementTelemetry([{ window_mode: "private" }]),
    private: true,
  });
});
