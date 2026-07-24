/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function init() {
  document
    .getElementById("goBack")
    .addEventListener("click", onReturnButtonClick);

  const voluntary = RPMGetBoolPref("security.restrict_to_adults.always", false);
  if (voluntary) {
    document
      .getElementById("errorShortDesc2")
      .setAttribute("data-l10n-id", "restricted-page-explain-why-always");
  }
  try {
    const outerURL = URL.parse(document.documentURI);
    const innerURL = outerURL.searchParams.get("u");
    const url = URL.parse(innerURL);
    const host = url.host;
    if (host && (url.protocol == "http:" || url.protocol == "https:")) {
      let description = document.getElementById("errorShortDesc");
      document.l10n.setAttributes(
        description,
        "restricted-page-explain-what-named",
        { host }
      );
    }
  } catch (_) {}
  document.dispatchEvent(
    new CustomEvent("AboutRestrictedLoad", { bubbles: true })
  );
}

function onReturnButtonClick() {
  RPMSendAsyncMessage("goBack");
}

init();
