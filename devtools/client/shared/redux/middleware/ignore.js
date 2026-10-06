/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const IGNORING = Symbol("IGNORING");
const START_IGNORE_ACTION = "START_IGNORE_ACTION";

/**
 * A middleware that prevents any action of being called once it is activated.
 * This is useful to apply while destroying a given panel, as it will ignore all calls
 * to actions, where we usually make our client -> server communications.
 * This middleware should be declared before any other middleware to  to effectively
 * ignore every actions.
 */
function ignore({ getState }) {
  return next => action => {
    if (action.type === START_IGNORE_ACTION) {
      getState()[IGNORING] = true;
      return null;
    }

    if (getState()[IGNORING]) {
      // Throw to stop execution from the callsite and prevent any further code from running
      throw new Error(
        "[REDUX_MIDDLEWARE_IGNORED_REDUX_ACTION] Dispatching '" +
          (action.type || action) +
          "' action after panel's closing"
      );
    }

    return next(action);
  };
}

module.exports = {
  ignore,

  isIgnoringActions(state) {
    return state[IGNORING];
  },

  START_IGNORE_ACTION: { type: START_IGNORE_ACTION },
};
