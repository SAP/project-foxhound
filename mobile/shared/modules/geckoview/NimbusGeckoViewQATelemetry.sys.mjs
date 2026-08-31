/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function getPrefValue(branch, pref, type) {
  switch (type) {
    case Ci.nsIPrefBranch.PREF_STRING:
      return branch.getStringPref(pref);

    case Ci.nsIPrefBranch.PREF_INT:
      return branch.getIntPref(pref);

    case Ci.nsIPrefBranch.PREF_BOOL:
      return branch.getBoolPref(pref);

    default:
      // Unreachable.
      return undefined;
  }
}

const Branches = Object.freeze({
  USER: Services.prefs,
  DEFAULT: Services.prefs.getDefaultBranch(null),
});

function getPrefValues(pref, type) {
  const rv = {};

  if (Services.prefs.prefHasUserValue(pref)) {
    rv.user_branch_value = getPrefValue(Branches.USER, pref, type);
  }

  if (Services.prefs.prefHasDefaultValue(pref)) {
    rv.default_branch_value = getPrefValue(Branches.DEFAULT, pref, type);
  }

  return rv;
}

const PREF_MAP = Object.freeze({
  "nimbus.qa.pref-string-default": {
    metric: "stringDefault",
    type: Ci.nsIPrefBranch.PREF_STRING,
  },
  "nimbus.qa.pref-string-user": {
    metric: "stringUser",
    type: Ci.nsIPrefBranch.PREF_STRING,
  },
  "nimbus.qa.pref-int-default": {
    metric: "intDefault",
    type: Ci.nsIPrefBranch.PREF_INT,
  },
  "nimbus.qa.pref-int-user": {
    metric: "intUser",
    type: Ci.nsIPrefBranch.PREF_INT,
  },
  "nimbus.qa.pref-bool-default": {
    metric: "boolDefault",
    type: Ci.nsIPrefBranch.PREF_BOOL,
  },
  "nimbus.qa.pref-bool-user": {
    metric: "boolUser",
    type: Ci.nsIPrefBranch.PREF_BOOL,
  },
});

export const NimbusGeckoViewQATelemetry = new (class {
  constructor() {
    this.observe = this.observe.bind(this);
  }

  init() {
    for (const pref of Object.keys(PREF_MAP)) {
      Services.prefs.addObserver(pref, this);

      this.#recordPref(pref);
    }
  }

  observe(_subject, topic, data) {
    if (topic === "nsPref:changed" && Object.hasOwn(PREF_MAP, data)) {
      this.#recordPref(data);
    }
  }

  #recordPref(pref) {
    const { metric, type } = PREF_MAP[pref];

    try {
      const value = getPrefValues(pref, type);

      Glean.nimbusQaPrefs[metric].set(value);
    } catch (e) {
      Glean.nimbusQaPrefs.prefTypeErrors[pref].add();
    }
  }
})();
