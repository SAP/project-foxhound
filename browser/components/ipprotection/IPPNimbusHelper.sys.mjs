/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Note: If you add or modify the list of helpers, make sure to update the
 * corresponding documentation in the `docs` folder as well.
 */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPProtectionService:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  NimbusFeatures: "resource://nimbus/ExperimentAPI.sys.mjs",
});
/**
 * This class monitors the eligibility flag from Nimbus
 */
class IPPNimbusHelperSingleton {
  init() {}

  initOnStartupCompleted() {
    lazy.NimbusFeatures.ipProtection.onUpdate(
      lazy.IPProtectionService.updateState
    );
  }

  uninit() {
    lazy.NimbusFeatures.ipProtection.offUpdate(
      lazy.IPProtectionService.updateState
    );
  }

  /**
   * Check that this device is not in the control branch of an experiment.
   *
   * @returns {boolean}
   */
  get isEligible() {
    let inExperiment = lazy.NimbusFeatures.ipProtection.getEnrollmentMetadata();

    if (inExperiment) {
      lazy.NimbusFeatures.ipProtection.recordExposureEvent({
        once: true,
      });

      return inExperiment.branch !== "control";
    }

    return true;
  }
}

const IPPNimbusHelper = new IPPNimbusHelperSingleton();

export { IPPNimbusHelper };
