/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// In the Jest test environment, Node's require is available and handles
// module resolution via babel transforms and moduleNameMapper, so we
// re-export it as the loader's require.
module.exports = { require };
