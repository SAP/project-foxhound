/* -*- Mode: rust; rust-indent-offset: 4 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use std::fs::File;
use std::io::BufWriter;
use std::path::PathBuf;

fn main() -> std::io::Result<()> {
    let trust_anchors = "trust_anchors.pem";
    let test_trust_anchors = "test_trust_anchors";
    println!("cargo:rerun-if-changed={}", trust_anchors);
    println!("cargo:rerun-if-changed={}", test_trust_anchors);

    let out_path = PathBuf::from(std::env::var("OUT_DIR").expect("OUT_DIR should be set in env."));
    let mut out = BufWriter::new(
        File::create(out_path.join("trust_anchors.rs")).expect("Could not write trust_anchors.rs."),
    );

    trust_anchor_build_util::emit_trust_anchors(&mut out, "", trust_anchors)?;
    trust_anchor_build_util::emit_trust_anchors(&mut out, "TEST_", test_trust_anchors)?;

    Ok(())
}
