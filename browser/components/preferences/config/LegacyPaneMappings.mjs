/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Keys use the non-`pane` friendly form ("search", not "paneSearch").
// `resolveLegacyCategory` strips the `pane` prefix before lookup, so
// callers passing either form resolve to the same entry.
// Key names mirror the legacy anchor IDs exactly. There is no enforced
// convention, so they mix camelCase ("dnsOverHttps") and kebab-case
// ("migrate-autoclose"). When adding an entry, use the anchor ID form
// from the legacy caller verbatim.
export const LEGACY_PANE_MAPPINGS = new Map([
  ["privacy-permissions", { category: "permissionsData" }],

  ["privacy-sitedata", { category: "privacy", subcategory: "sitedata" }],
  ["privacy-vpn", { category: "privacy", subcategory: "vpn" }],
  [
    "privacy-trackingprotection",
    { category: "privacy", subcategory: "etpStatus" },
  ],
  ["privacy-doh", { category: "privacy", subcategory: "dnsOverHttps" }],
  ["search-firefoxSuggest", { category: "search", subcategory: "locationBar" }],

  ["general", { category: "sync" }],
  ["general-layout", { category: "appearance", subcategory: "layout" }],
  [
    "general-update-box-group",
    { category: "about", subcategory: "update-box-group" },
  ],
  ["general-update-state", { category: "about", subcategory: "update-state" }],

  ["general-cfraddons", { category: "tabsBrowsing", subcategory: "cfraddons" }],
  [
    "general-cfrfeatures",
    { category: "tabsBrowsing", subcategory: "cfrfeatures" },
  ],
  ["general-layout", { category: "tabsBrowsing", subcategory: "layout" }],
  [
    "general-link-preview",
    { category: "tabsBrowsing", subcategory: "link-preview" },
  ],

  ["general-migrate", { category: "sync", subcategory: "migrate" }],
  [
    "general-migrate-autoclose",
    { category: "sync", subcategory: "migrate-autoclose" },
  ],

  ["general-drm", { category: "tabsBrowsing", subcategory: "drm" }],

  [
    "general-fxtranslations",
    { category: "languages", subcategory: "translations" },
  ],
  [
    "general-translations",
    { category: "languages", subcategory: "translations" },
  ],
  ["general-netsettings", { category: "privacy", subcategory: "netsettings" }],

  [
    "privacy-permissions-block-popups",
    { category: "permissionsData", subcategory: "permissions-block-popups" },
  ],
  ["privacy-reports", { category: "permissionsData", subcategory: "reports" }],
  ["privacy-privacy-segmentation", { category: "privacy" }],

  ["privacy-logins", { category: "passwordsAutofill", subcategory: "logins" }],
  [
    "privacy-payment-methods-autofill",
    {
      category: "passwordsAutofill",
      subcategory: "payment-methods-autofill",
    },
  ],
  [
    "privacy-credit-card-autofill",
    { category: "passwordsAutofill", subcategory: "credit-card-autofill" },
  ],
  // Both legacy anchor IDs are intentional: the setting-group declares
  // data-subcategory="addresses-autofill address-autofill" and
  // responds to both. This preserves the original mapping for downstream
  // consumers that match on either ID.
  [
    "privacy-addresses-autofill",
    { category: "passwordsAutofill", subcategory: "addresses-autofill" },
  ],
  [
    "privacy-address-autofill",
    { category: "passwordsAutofill", subcategory: "address-autofill" },
  ],
  ["privacy-logins", { category: "passwordsAutofill", subcategory: "logins" }],
]);

/**
 * Resolves a legacy category/subcategory pair (as produced by the hash split
 * in `gotoPref()`) to its destination in the redesigned preferences when
 * `browser.settings-redesign.enabled` is true. If no mapping exists, returns
 * the input unchanged.
 *
 * @param {string} category
 *   The category name. Accepts either the `paneXyz` form or the friendly
 *   `xyz` form — the `pane` prefix is stripped before lookup.
 * @param {string|null|undefined} subcategory
 *   The subcategory name, or a falsy value if there is no subcategory.
 * @returns {{ category: string, subcategory: string|null }}
 *   The resolved category/subcategory pair. `subcategory` is `null` when
 *   the destination has no subcategory.
 */
export function resolveLegacyCategory(category, subcategory) {
  // Only strip the `paneXxx` -> `xxx` form.
  if (/^pane[A-Z]/.test(category)) {
    category = category[4].toLowerCase() + category.slice(5);
  }
  let key = subcategory ? `${category}-${subcategory}` : category;
  let dest =
    LEGACY_PANE_MAPPINGS.get(key) ?? LEGACY_PANE_MAPPINGS.get(category);
  if (!dest) {
    return { category, subcategory: subcategory ?? null };
  }
  return { category: dest.category, subcategory: dest.subcategory ?? null };
}
