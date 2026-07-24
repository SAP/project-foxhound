/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

//! An entry point for sending a crash ping.

use crate::std::{env, io::stdin};
use crate::{glean, logging, net::ping};

pub fn main() {
    logging::init();

    let mut args = env::args_os().skip(2);
    let data_path = args.next().expect("no data path provided");
    let reason = args.next().expect("no crash reason provided");

    let extra: serde_json::Value =
        serde_json::from_reader(stdin()).expect("failed to read extra data from stdin");

    let _glean_handle = glean::InitOptions {
        data_dir: data_path.into(),
        locale: None,
    }
    .init()
    .expect("failed to acquire Glean store");

    ping::CrashPing {
        extra: &extra,
        reason: reason.to_str(),
        legacy_telemetry: None,
    }
    .send();

    // Increase our chances of sending the ping immediately by explicitly shutting down Glean.
    ::glean::shutdown();
}
