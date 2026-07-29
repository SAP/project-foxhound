/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! # Skv: SQLite Key-Value Store
//!
//! This module implements a key-value storage interface that's
//! backed by SQLite.

pub mod abort;
pub mod checker;
pub mod connection;
pub mod coordinator;
pub mod database;
pub mod functions;
pub mod key;
pub mod maintenance;
pub mod schema;
pub mod sql;
pub mod store;
pub mod value;
