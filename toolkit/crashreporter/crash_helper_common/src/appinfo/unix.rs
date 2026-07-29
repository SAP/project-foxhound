/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use nix::unistd::getuid;

use super::ApplicationInfo;

impl ApplicationInfo {
    pub fn get_user_id() -> Option<u64> {
        let uid = getuid();
        Some(uid.as_raw() as u64)
    }
}
