/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for the following data of abandonment telemetry.
// - window

add_setup(async function () {
  await initSapTest();
});

add_task(async function urlbar_newtab() {
  await doUrlbarNewTabTest({
    trigger: () => doBlur(),
    assert: () => assertAbandonmentTelemetry([{ window_mode: "classic" }]),
  });
});

add_task(async function urlbar() {
  await doUrlbarTest({
    trigger: () => doBlur(),
    assert: () => assertAbandonmentTelemetry([{ window_mode: "classic" }]),
  });
});

add_task(async function searchbar() {
  await doSearchbarTest({
    trigger: () => doBlur(SearchbarTestUtils),
    assert: () => assertAbandonmentTelemetry([{ window_mode: "classic" }]),
  });
});

add_task(async function handoff() {
  await doHandoffTest({
    trigger: () => doBlur(),
    assert: () => assertAbandonmentTelemetry([{ window_mode: "classic" }]),
  });
});

add_task(async function urlbar_addonpage() {
  await doUrlbarAddonpageTest({
    trigger: () => doBlur(),
    assert: () => assertAbandonmentTelemetry([{ window_mode: "classic" }]),
  });
});

add_task(async function urlbar_private_window() {
  await doUrlbarNewTabTest({
    trigger: win => doBlur(UrlbarTestUtils, win),
    assert: () => assertAbandonmentTelemetry([{ window_mode: "private" }]),
    private: true,
  });
});

add_task(async function searchbar_private_window() {
  await doSearchbarTest({
    trigger: win => doBlur(SearchbarTestUtils, win),
    assert: () => assertAbandonmentTelemetry([{ window_mode: "private" }]),
    private: true,
  });
});

add_task(async function handoff_private_window() {
  await doHandoffTest({
    trigger: win => doBlur(UrlbarTestUtils, win),
    assert: () => assertAbandonmentTelemetry([{ window_mode: "private" }]),
    private: true,
  });
});

add_task(async function urlbar_addonpage_private_window() {
  await doUrlbarAddonpageTest({
    trigger: win => doBlur(UrlbarTestUtils, win),
    assert: () => assertAbandonmentTelemetry([{ window_mode: "private" }]),
    private: true,
  });
});
