/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const {
  EAGER_EVALUATION_TOGGLE,
  GROUP_SIMILAR_MESSAGES_TOGGLE,
  AUTOCOMPLETE_TOGGLE,
} = require("resource://devtools/client/webconsole/constants.js");

const PrefState = overrides =>
  Object.freeze(
    Object.assign(
      {
        logLimit: 1000,
        sidebarToggle: false,
        groupSimilar: false,
        autocomplete: false,
        eagerEvaluation: false,
        historyCount: 50,
      },
      overrides
    )
  );

const dict = {
  [EAGER_EVALUATION_TOGGLE]: "eagerEvaluation",
  [GROUP_SIMILAR_MESSAGES_TOGGLE]: "groupSimilar",
  [AUTOCOMPLETE_TOGGLE]: "autocomplete",
};

function prefs(state = PrefState(), action) {
  const pref = dict[action.type];
  if (pref) {
    return {
      ...state,
      [pref]: !state[pref],
    };
  }

  return state;
}

module.exports = {
  PrefState,
  prefs,
};
