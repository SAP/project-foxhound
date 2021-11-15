// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

//! Important: consider this module unstable / experimental.
//!
//! The different metric types supported by the Glean SDK to handle data.

mod boolean;
mod counter;
mod custom_distribution;
mod datetime;
mod event;
mod jwe;
mod labeled;
mod memory_distribution;
mod ping;
mod quantity;
mod string;
mod string_list;
mod timespan;
mod timing_distribution;
mod uuid;

pub use crate::event_database::RecordedEvent;

pub use self::boolean::Boolean;
pub use self::counter::Counter;
pub use self::custom_distribution::CustomDistribution;
pub use self::datetime::Datetime;
pub use self::event::Event;
pub use self::jwe::Jwe;
pub use self::labeled::Labeled;
pub use self::memory_distribution::MemoryDistribution;
pub use self::ping::Ping;
pub use self::quantity::Quantity;
pub use self::string::String;
pub use self::string_list::StringList;
pub use self::timespan::Timespan;
pub use self::timing_distribution::TimingDistribution;
pub use self::uuid::Uuid;
pub use crate::histogram::HistogramType;
