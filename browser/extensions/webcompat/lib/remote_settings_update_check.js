/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals browser, module, onMessageFromTab */

let currentVersion = browser.runtime.getManifest().version;

function isUpdateWanted(update) {
  if (!update) {
    return false;
  }

  if (!update?.version || (!update?.interventions && !update.shims)) {
    console.error(
      "Received invalid WebCompat interventions update from Remote Settings",
      update
    );
    return false;
  }

  if (!this.isNewerVersion(update.version, currentVersion)) {
    console.error(
      "Ignoring latest WebCompat Remote Settings update",
      update.version,
      "<=",
      currentVersion
    );
    return false;
  }

  return true;
}

function isNewerVersion(a_raw, b_raw) {
  function num(n) {
    const i = parseInt(n);
    return isNaN(i) ? 0 : i;
  }
  const a_comp = a_raw.split(".");
  const b_comp = b_raw.split(".");
  const a = [num(a_comp[0]), num(a_comp[1]), num(a_comp[2]), num(a_comp[3])];
  const b = [num(b_comp[0]), num(b_comp[1]), num(b_comp[2]), num(b_comp[3])];
  for (let i = 0; i < 4; ++i) {
    if (a[i] > b[i]) {
      return true;
    }
    if (a[i] < b[i]) {
      return false;
    }
  }
  return false;
}

function listenForRemoteSettingsUpdates(interventions, shims) {
  browser.remoteSettings.onRemoteSettingsUpdate.addListener(async update => {
    if (!isUpdateWanted(update)) {
      console.info(
        "Ignoring older version of webcompat interventions",
        update.version
      );
      window.latestReceivedUpdate = update.version;
      return;
    }

    console.info("Received update to webcompat interventions", update.version);
    currentVersion = update.version;

    if (update.interventions) {
      await interventions.onRemoteSettingsUpdate(update.interventions);
    }

    if (update.shims) {
      await shims.onRemoteSettingsUpdate(update.shims);
    }

    window.latestUpdate = update.version;
    window.latestReceivedUpdate = update.version;
  });

  window._downgradeForTesting = async () => {
    currentVersion = browser.runtime.getManifest().version;
    await interventions.resetToDefaultInterventions();
    await shims._resetToDefaultShims();
  };
}
