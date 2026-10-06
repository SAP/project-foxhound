/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Stub crate. mls-rs only references `spin::Mutex` / `MutexGuard` under
// `cfg(not(feature = "std"))`, which Gecko never enables; the real
// implementation is unreachable here.
