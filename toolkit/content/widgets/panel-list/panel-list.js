/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @backward-compat {version 151}
 *
 * Make panel-list.js available for train-hopping newtab until
 * panel-list.mjs makes it to the release channel.
 * Once that's the case, we should replace all imports of the .js by the .mjs.
 */

import("chrome://global/content/elements/panel-list.mjs").catch(e => {
  // Realm-teardown aborts surface as bare undefined; ignore those.
  if (e !== undefined) {
    console.error("panel-list.mjs failed to load:", e);
  }
});
