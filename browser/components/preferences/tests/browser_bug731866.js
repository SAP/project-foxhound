/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const browserContainersGroupDisabled = !SpecialPowers.getBoolPref(
  "privacy.userContext.ui.enabled"
);
const cookieBannerHandlingDisabled = !SpecialPowers.getBoolPref(
  "cookiebanners.ui.desktop.enabled"
);
const backupSectionDisabled = !(
  SpecialPowers.getBoolPref("browser.backup.archive.enabled") ||
  SpecialPowers.getBoolPref("browser.backup.restore.enabled")
);
const ipProtectionEnabled = SpecialPowers.getBoolPref(
  "browser.ipProtection.enabled",
  false
);
const profilesGroupDisabled = !SelectableProfileService.isEnabled;
const updatePrefContainers = ["updatesCategory", "updateApp"];
const updateContainersGroupDisabled =
  AppConstants.platform === "win" &&
  Services.sysinfo.getProperty("hasWinPackageId");

function test() {
  waitForExplicitFinish();
  open_preferences(runTest);
}

var gElements;

function checkElements(expectedPane) {
  for (let element of gElements) {
    // keyset elements fail is_element_visible checks because they are never visible.
    // special-case the drmGroup item because its visibility depends on pref + OS version
    if (element.nodeName == "keyset" || element.id === "drmGroup") {
      continue;
    }

    // The browserContainersGroup is still only pref-on on Nightly
    if (
      element.id == "browserContainersGroup" &&
      browserContainersGroupDisabled
    ) {
      is_element_hidden(
        element,
        "Disabled browserContainersGroup should be hidden"
      );
      continue;
    }

    // Cookie Banner Handling is currently disabled by default (bug 1800679)
    if (
      element.id == "cookieBannerHandlingGroup" &&
      cookieBannerHandlingDisabled
    ) {
      is_element_hidden(
        element,
        "Disabled cookieBannerHandlingGroup should be hidden"
      );
      continue;
    }

    // Update prefs are hidden when running an MSIX build
    if (
      updatePrefContainers.includes(element.id) &&
      updateContainersGroupDisabled
    ) {
      is_element_hidden(element, "Disabled " + element + " should be hidden");
      continue;
    }

    // Backup is currently disabled by default. (bug 1895791)
    if (
      (element.id == "dataBackupGroup" || element.id == "backupCategory") &&
      backupSectionDisabled
    ) {
      is_element_hidden(element, "Disabled dataBackupSection should be hidden");
      continue;
    }

    // Profiles is only enabled in Nightly by default (bug 1947633)
    if (element.id === "profilesGroup" && profilesGroupDisabled) {
      is_element_hidden(element, "Disabled profilesGroup should be hidden");
      continue;
    }

    // IP Protection section is gated by browser.ipProtection.enabled
    if (element.id === "dataIPProtectionGroup" && !ipProtectionEnabled) {
      is_element_hidden(element, "Disabled ipProtection should be hidden");
      continue;
    }

    if (element.getAttribute("data-hidden-from-search") == "true") {
      is_element_hidden(element, "Hidden from search element should be hidden");
      continue;
    }

    let attributeValue = element.getAttribute("data-category");
    let suffix = " (id=" + element.id + ")";
    if (attributeValue == "pane" + expectedPane) {
      is_element_visible(
        element,
        expectedPane + " elements should be visible" + suffix
      );
    } else {
      is_element_hidden(
        element,
        "Elements not in " + expectedPane + " should be hidden" + suffix
      );
    }
  }
}

async function runTest(win) {
  is(gBrowser.currentURI.spec, "about:preferences", "about:preferences loaded");

  let tab = win.document;
  gElements = tab.getElementById("mainPrefPane").children;

  let panes = ["General", "Search", "Privacy", "Sync"];

  for (let pane of panes) {
    await win.gotoPref("pane" + pane);
    checkElements(pane);
  }

  gBrowser.removeCurrentTab();
  win.close();
  finish();
}
