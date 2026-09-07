/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Stub crate. mls-rs only depends on portable-atomic on targets without
// atomic-ptr support (`cfg(not(target_has_atomic = "ptr"))`); Gecko targets
// always have atomic-ptr support, so this crate is unreachable.
