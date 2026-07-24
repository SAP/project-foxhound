/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

//! Gecko profiler state.

#[cfg(feature = "enabled")]
use crate::gecko_bindings::structs::ThreadProfilingFeatures;

/// Whether the Gecko profiler is currently active.
/// A typical use of this API:
/// ```rust
/// if gecko_profiler::is_active() {
///   // do something.
/// }
/// ```
///
/// This implementation must be kept in sync with
/// `mozilla::profiler::detail::RacyFeatures::IsActive`.
#[cfg(feature = "enabled")]
#[inline]
pub fn is_active() -> bool {
    use crate::gecko_bindings::structs::mozilla::profiler::detail;

    let active_and_features = get_active_and_features();
    (active_and_features & detail::RacyFeatures_Active) != 0
}

/// Always false when MOZ_GECKO_PROFILER is not defined.
#[cfg(not(feature = "enabled"))]
#[inline]
pub fn is_active() -> bool {
    false
}

/// Whether the Gecko profiler is currently active and unpaused.
/// A typical use of this API:
/// ```rust
/// if gecko_profiler::is_active_and_unpaused() {
///   // do something.
/// }
/// ```
///
/// This implementation must be kept in sync with
/// `mozilla::profiler::detail::RacyFeatures::IsActiveAndUnpaused`.
#[cfg(feature = "enabled")]
#[inline]
pub fn is_active_and_unpaused() -> bool {
    use crate::gecko_bindings::structs::mozilla::profiler::detail;

    let active_and_features = get_active_and_features();
    (active_and_features & detail::RacyFeatures_Active) != 0
        && (active_and_features & detail::RacyFeatures_Paused) == 0
}

/// Always false when MOZ_GECKO_PROFILER is not defined.
#[cfg(not(feature = "enabled"))]
#[inline]
pub fn is_active_and_unpaused() -> bool {
    false
}

/// Whether the Gecko Profiler can accept markers.
/// This should be used before doing some potentially-expensive work that's used in a marker. E.g.:
/// ```rust
/// if gecko_profiler::current_thread_is_being_profiled_for_markers() {
///   // Do something expensive and add the marker with that data.
/// }
/// ```
///
/// This implementation must be kept in sync with
/// ProfilerMarkers.h:profiler_thread_is_being_profiled_for_markers
#[cfg(feature = "enabled")]
#[inline]
pub fn current_thread_is_being_profiled_for_markers() -> bool {
    current_thread_is_being_profiled(ThreadProfilingFeatures::Markers)
        || is_etw_collecting_markers()
        || is_perfetto_tracing()
}

/// Always false when MOZ_GECKO_PROFILER is not defined.
#[cfg(not(feature = "enabled"))]
#[inline]
pub fn current_thread_is_being_profiled_for_markers() -> bool {
    false
}

/// Returns the value of atomic `RacyFeatures::sActiveAndFeatures` from the C++ side.
#[cfg(feature = "enabled")]
#[inline]
fn get_active_and_features() -> u32 {
    use crate::gecko_bindings::structs::mozilla::profiler::detail;
    use std::sync::atomic::{AtomicU32, Ordering};

    // This is reaching for the C++ atomic value instead of calling an FFI
    // function to return this value. Because, calling an FFI function is much
    // more expensive compared to this method. That's why it's worth to go with
    // this solution for performance. But it's crucial to keep the implementation
    // of this and the callers in sync with the C++ counterparts.
    let active_and_features: &AtomicU32 = unsafe {
        let ptr: *const u32 = std::ptr::addr_of!(detail::RacyFeatures_sActiveAndFeatures);
        // TODO: Switch this to use `AtomicU32::from_ptr` once our Rust MSRV is at least 1.75.0
        &*ptr.cast()
    };
    active_and_features.load(Ordering::Relaxed)
}

/// This implementation must be kept in sync with
/// `mozilla::profiler::detail::RacyFeatures::IsETWCollecting`.
#[cfg(feature = "enabled")]
#[inline]
fn is_etw_collecting_markers() -> bool {
    use crate::gecko_bindings::structs::mozilla::profiler::detail;

    let active_and_features = get_active_and_features();
    (active_and_features & detail::RacyFeatures_ETWCollectionEnabled) != 0
}

/// This implementation must be kept in sync with
/// `mozilla::profiler::detail::RacyFeatures::IsPerfettoTracing`.
#[cfg(feature = "enabled")]
#[inline]
fn is_perfetto_tracing() -> bool {
    use crate::gecko_bindings::structs::mozilla::profiler::detail;

    let active_and_features = get_active_and_features();
    (active_and_features & detail::RacyFeatures_PerfettoTracingEnabled) != 0
}

/// This implementation must be kept in sync with
/// `ProfilerThreadState.h:profiler_thread_is_being_profiled`
#[cfg(feature = "enabled")]
#[inline]
fn current_thread_is_being_profiled(thread_profiling_features: ThreadProfilingFeatures) -> bool {
    if !is_active_and_unpaused() {
        return false;
    }

    use crate::gecko_bindings::bindings;
    unsafe { bindings::gecko_profiler_current_thread_is_registered(thread_profiling_features) }
}
