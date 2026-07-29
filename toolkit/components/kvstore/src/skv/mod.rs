/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! # Skv: SQLite Key-Value Store
//!
//! Re-exports the vendored skv crate and adds gecko-specific glue
//! modules (interface and importer).

pub use skv::*;

pub mod importer;
pub mod interface;
