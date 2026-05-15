/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use minidump_analyzer::MinidumpAnalyzer;
use serde_json::Value;

fn main() {
    env_logger::init();
    let mut all_threads = false;
    let mut minidump_path = None;
    for arg in std::env::args_os().skip(1) {
        if arg == "--all" {
            all_threads = true;
        } else if minidump_path.is_none() {
            minidump_path = Some(arg);
        } else {
            panic!("unexpected argument: {arg:?}");
        }
    }
    let Some(minidump_path) = minidump_path else {
        panic!("no minidump argument provided");
    };

    let analyzer =
        MinidumpAnalyzer::new(std::path::Path::new(&minidump_path)).all_threads(all_threads);

    let mut json = Value::Object(Default::default());
    analyzer.analyze_json(&mut json).expect("analyze failed");

    serde_json::to_writer_pretty(std::io::stdout(), &json).expect("failed to write json");
}
