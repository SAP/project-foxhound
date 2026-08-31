/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* eslint-disable no-unused-vars */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);
const { LangPackMatcher } = ChromeUtils.importESModule(
  "resource://gre/modules/LangPackMatcher.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

/**
 * @param {string} locale BCP-47 locale tag.
 * @returns {string} The synthetic langpack add-on id for locale.
 */
function langpackId(locale) {
  return `langpack-${locale}@firefox.mozilla.org`;
}

/**
 * Builds a WebExtension langpack manifest for the given locale.
 *
 * @param {string} locale BCP-47 locale tag.
 * @param {string} [version] Manifest version field.
 * @returns {object} A langpack manifest suitable for AddonTestUtils.
 */
function getLangpackManifest(locale, version = "2.0") {
  return {
    langpack_id: locale,
    name: `${locale} Language Pack`,
    description: `${locale} Language pack`,
    languages: {
      [locale]: {
        chrome_resources: {
          branding: `browser/chrome/${locale}/locale/branding/`,
        },
        version: "1",
      },
    },
    browser_specific_settings: {
      gecko: {
        id: langpackId(locale),
        strict_min_version: AppConstants.MOZ_APP_VERSION,
        strict_max_version: AppConstants.MOZ_APP_VERSION,
      },
    },
    version,
    manifest_version: 2,
    sources: {
      browser: {
        base_path: "browser/",
      },
    },
    author: "Mozilla",
  };
}

/**
 * Creates a temporary XPI file containing a langpack for locale.
 *
 * @param {string} locale BCP-47 locale tag.
 * @param {string} [version] Manifest `version` field.
 * @returns {nsIFile} A temporary XPI file.
 */
function createLangpack(locale, version) {
  return AddonTestUtils.createTempXPIFile({
    "manifest.json": getLangpackManifest(locale, version),
    [`browser/${locale}/branding/brand.ftl`]: "-brand-short-name = Firefox",
  });
}

/**
 * Builds and installs a langpack XPI for locale.
 *
 * @param {string} locale BCP-47 locale tag.
 * @returns {Promise<AddonWrapper>} The installed add-on.
 */
async function installLangpack(locale) {
  let xpi = createLangpack(locale);
  let install = await AddonTestUtils.promiseInstallFile(xpi);
  return install.addon;
}

/**
 * @param {string[]} locales BCP-47 locale tags.
 * @returns {Promise<AddonWrapper[]>} The installed add-ons.
 */
function installLangpacks(locales) {
  return Promise.all(locales.map(installLangpack));
}

/**
 * Opens the preferences pane that hosts the language UI and leaves the tab open.
 *
 * @returns {Promise<Document>} The preferences document.
 */
async function openLanguagesPrefs() {
  await openPreferencesViaOpenPreferencesAPI(
    SRD_PREF_VALUE ? "paneLanguages" : "paneGeneral",
    { leaveOpen: true }
  );
  return gBrowser.contentDocument;
}

/**
 * @param {string} locale BCP-47 locale tag.
 * @returns {{target_locale: string, hash: string, url: string}} A descriptor
 *   shaped like an entry returned by the AMO langpack API, pointing at a
 *   mochitest-served XPI URL.
 */
function createRemoteLangpack(locale) {
  return {
    target_locale: locale,
    hash: locale,
    url: `http://mochi.test:8888/${locale}.xpi`,
  };
}

// --- UI helpers: abstract the differences between legacy and SRD UIs ---

/**
 * Waits until the preferred-language UI has been populated.
 *
 * @param {Document} doc The preferences document.
 * @returns {Promise<void>}
 */
async function waitForLanguageUI(doc) {
  if (SRD_PREF_VALUE) {
    let sc = getSettingControl("browserLanguagePreferred", doc.defaultView);
    if (!sc?.controlEl?.children?.length) {
      await waitForSettingControlChange(sc);
    }
    return;
  }
  let box = doc.getElementById("browserLanguagesBox");
  if (box.hidden) {
    await BrowserTestUtils.waitForMutationCondition(
      box,
      { attributes: true, attributeFilter: ["hidden"] },
      () => !box.hidden
    );
  }
}

/**
 * Waits until the setting control with settingId is not hidden.
 *
 * @param {string} settingId The id passed to getSettingControl.
 * @param {Window} win The preferences window.
 * @returns {Promise<void>}
 */
async function waitForSettingVisible(settingId, win) {
  let sc = getSettingControl(settingId, win);
  if (!sc.hidden) {
    return;
  }
  await BrowserTestUtils.waitForMutationCondition(
    sc,
    { attributes: true, attributeFilter: ["hidden"] },
    () => !sc.hidden
  );
}

/**
 * Returns the locales currently offered by the primary-browser-language
 * picker, in display order.
 *
 * @param {Document} doc The preferences document.
 * @returns {string[]} BCP-47 locale tags.
 */
function getAvailableLocales(doc) {
  if (SRD_PREF_VALUE) {
    let sc = getSettingControl("browserLanguagePreferred", doc.defaultView);
    return Array.from(sc.controlEl.children).map(opt => opt.value);
  }
  return Array.from(
    doc.getElementById("primaryBrowserLocale").querySelector("menupopup")
      .children
  ).map(item => item.value);
}

/**
 * Selects locale in the primary-browser-language picker.
 *
 * @param {Document} doc The preferences document.
 * @param {string} locale BCP-47 locale tag; must already be available in the picker.
 * @returns {Promise<void>}
 */
async function changeLocale(doc, locale) {
  if (SRD_PREF_VALUE) {
    let sc = getSettingControl("browserLanguagePreferred", doc.defaultView);
    await changeMozSelectValue(sc.controlEl, locale);
    return;
  }
  let menulist = doc.getElementById("primaryBrowserLocale");
  let menupopup = menulist.querySelector("menupopup");
  let item = menupopup.querySelector(`[value="${locale}"]`);
  ok(item, `Found menuitem for locale "${locale}"`);
  // SelectionChangedMenulist fires the handler on popuphiding, so dispatch
  // "command" first to set lastEvent, then "popuphiding" to invoke it.
  item.dispatchEvent(new Event("command", { bubbles: true }));
  menupopup.dispatchEvent(new Event("popuphiding"));
}

/**
 * Waits for the "restart required to apply the new language" message to
 * become visible.
 *
 * @param {Document} doc The preferences document.
 * @returns {Promise<void>}
 */
async function waitForRestartMessage(doc) {
  let target = SRD_PREF_VALUE
    ? getSettingControl("browserLanguageMessage", doc.defaultView)
    : doc.getElementById("confirmBrowserLanguage");
  await BrowserTestUtils.waitForMutationCondition(
    target,
    { attributes: true, attributeFilter: ["hidden"] },
    () => !target.hidden
  );
}

/**
 * Asserts the restart-required message is currently hidden.
 *
 * @param {Document} doc The preferences document.
 */
function assertRestartMessageHidden(doc) {
  let target = SRD_PREF_VALUE
    ? getSettingControl("browserLanguageMessage", doc.defaultView)
    : doc.getElementById("confirmBrowserLanguage");
  is(target.hidden, true, "Restart message is hidden");
}

/**
 * Waits until the preferred-language picker has appended the <hr> separator
 * that divides installed locales from remote (downloadable) ones.
 *
 * @param {Window} win The preferences window.
 * @returns {Promise<void>}
 */
async function waitForRemoteSeparator(win) {
  let sc = getSettingControl("browserLanguagePreferred", win);
  if (Array.from(sc.controlEl.children).some(el => el.localName === "hr")) {
    return;
  }
  await waitForSettingControlChange(sc);
}
