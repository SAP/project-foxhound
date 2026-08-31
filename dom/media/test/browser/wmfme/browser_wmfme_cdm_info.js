/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Exercises ChromeUtils.getWMFContentDecryptionModuleInformation(), which
 * dispatches through UtilityMediaServiceChild::GetKeySystemCapabilities and
 * populates dom::CDMInformation entries.
 *
 * MFCDMParent::GetAllKeySystemsCapabilities enumerates a compile-time-fixed
 * table of key systems, each tagged SecureLevel::Software or
 * SecureLevel::Hardware. That tag becomes capabilities.isHardwareDecryption()
 * over IPDL. This test mirrors that table and asserts every reported CDM's
 * isHardwareDecryption matches its static tag, so the assertion holds across
 * hosts that expose different subsets of key systems (CI without hardware
 * DRM, developer hosts with hardware-backed PlayReady, hardware-only
 * configurations).
 */

// Mirror of dom/media/ipc/MFCDMParent.cpp GetAllKeySystemsCapabilities key
// system table. Keep in sync with the SecureLevel tags assigned there.
const kExpectedIsHardwareDecryption = new Map([
  ["com.microsoft.playready.recommendation", false],
  ["com.microsoft.playready.recommendation.3000", true],
  ["com.microsoft.playready.recommendation.3000.clearlead", true],
]);

add_task(async function setupTestingPref() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["media.wmf.media-engine.enabled", 1],
      ["media.eme.playready.enabled", true],
    ],
  });
});

add_task(async function test_cdm_isHardwareDecryption_initialized() {
  // The CDM info chrome API doesn't need a content page, but doing the
  // assertions inside an explicit about:blank tab gives the initial
  // about:newtab inner window a clean lifecycle (opened, used, removed)
  // before the leak checker runs. Without this, about:newtab can
  // intermittently survive past shutdown.
  await BrowserTestUtils.withNewTab("about:blank", async () => {
    const cdms = await ChromeUtils.getWMFContentDecryptionModuleInformation();
    for (const cdm of cdms) {
      Assert.ok(
        kExpectedIsHardwareDecryption.has(cdm.keySystemName),
        `${cdm.keySystemName}: known WMF key system (update test mirror if intentional)`
      );
      is(
        cdm.isHardwareDecryption,
        kExpectedIsHardwareDecryption.get(cdm.keySystemName),
        `${cdm.keySystemName}: isHardwareDecryption matches MFCDMParent SecureLevel tag`
      );
    }
  });
});
