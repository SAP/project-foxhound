/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  SitePolicyUtils: "resource://gre/modules/SitePolicyUtils.sys.mjs",
});

function fetchSitePolicies() {
  let cloned = Services.cpmm.sharedData.get("EnterprisePolicies:SitePolicies");

  if (!cloned) {
    return [];
  }

  return cloned.map(policy => ({
    match: new MatchPatternSet(policy.match),
    exceptions: new MatchPatternSet(policy.exceptions),
    features: policy.features,
  }));
}

export class EnterprisePoliciesManagerContent {
  #sitePolicies = null;

  get sitePolicies() {
    if (this.#sitePolicies === null) {
      this.#sitePolicies = fetchSitePolicies();

      Services.cpmm.sharedData.addEventListener("change", this);
    }

    return this.#sitePolicies;
  }

  handleEvent(event) {
    switch (event.type) {
      case "change": {
        if (!event.changedKeys.includes("EnterprisePolicies:SitePolicies")) {
          return;
        }
        this.#sitePolicies = fetchSitePolicies();
        break;
      }
    }
  }

  get status() {
    return (
      Services.cpmm.sharedData.get("EnterprisePolicies:Status") ||
      Ci.nsIEnterprisePolicies.INACTIVE
    );
  }

  isAllowed(feature) {
    let disallowedFeatures = Services.cpmm.sharedData.get(
      "EnterprisePolicies:DisallowedFeatures"
    );
    return !(disallowedFeatures && disallowedFeatures.has(feature));
  }

  isAllowedForURI(feature, uri) {
    return lazy.SitePolicyUtils.isAllowedForURI(
      this,
      this.sitePolicies,
      feature,
      uri
    );
  }
}

EnterprisePoliciesManagerContent.prototype.QueryInterface =
  ChromeUtils.generateQI(["nsIEnterprisePolicies"]);
