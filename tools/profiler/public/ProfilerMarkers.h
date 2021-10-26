/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Markers are useful to delimit something important happening such as the first
// paint. Unlike labels, which are only recorded in the profile buffer if a
// sample is collected while the label is on the label stack, markers will
// always be recorded in the profile buffer.
//
// This header contains definitions necessary to add markers to the Gecko
// Profiler buffer.
//
// It #include's "mozilla/BaseProfilerMarkers.h", see that header for base
// definitions necessary to create marker types.
//
// If common marker types are needed, #include "ProfilerMarkerTypes.h" instead.
//
// But if you want to create your own marker type locally, you can #include this
// header only; look at ProfilerMarkerTypes.h for examples of how to define
// types.
//
// To then record markers:
// - Use `baseprofiler::AddMarker(...)` from mozglue or other libraries that are
//   outside of xul, especially if they may happen outside of xpcom's lifetime
//   (typically startup, shutdown, or tests).
// - Otherwise #include "ProfilerMarkers.h" instead, and use
//   `profiler_add_marker(...)`.
// See these functions for more details.

#ifndef ProfilerMarkers_h
#define ProfilerMarkers_h

#include "mozilla/BaseProfilerMarkers.h"
#include "mozilla/ProfilerMarkersDetail.h"

// TODO: Move common stuff to shared header instead.
#include "GeckoProfiler.h"

#ifndef MOZ_GECKO_PROFILER

#  define PROFILER_MARKER_UNTYPED(markerName, categoryName, ...)
#  define PROFILER_MARKER(markerName, categoryName, options, MarkerType, ...)
#  define PROFILER_MARKER_TEXT(markerName, categoryName, options, text)
#  define AUTO_PROFILER_MARKER_TEXT(markerName, categoryName, options, text)

#else  // ndef MOZ_GECKO_PROFILER

// Bring category names from Base Profiler into the geckoprofiler::category
// namespace, for consistency with other Gecko Profiler identifiers.
namespace geckoprofiler::category {
using namespace ::mozilla::baseprofiler::category;
}

// Add a marker to a given buffer. `AddMarker()` and related macros should be
// used in most cases, see below for more information about them and the
// paramters; This function may be useful when markers need to be recorded in a
// local buffer outside of the main profiler buffer.
template <typename MarkerType, typename... PayloadArguments>
mozilla::ProfileBufferBlockIndex AddMarkerToBuffer(
    mozilla::ProfileChunkedBuffer& aBuffer,
    const mozilla::ProfilerString8View& aName,
    const mozilla::MarkerCategory& aCategory, mozilla::MarkerOptions&& aOptions,
    MarkerType aMarkerType, const PayloadArguments&... aPayloadArguments) {
  mozilla::Unused << aMarkerType;  // Only the empty object type is useful.
  return mozilla::base_profiler_markers_detail::AddMarkerToBuffer<MarkerType>(
      aBuffer, aName, aCategory, std::move(aOptions),
      ::profiler_capture_backtrace_into, aPayloadArguments...);
}

// Add a marker (without payload) to a given buffer.
inline mozilla::ProfileBufferBlockIndex AddMarkerToBuffer(
    mozilla::ProfileChunkedBuffer& aBuffer,
    const mozilla::ProfilerString8View& aName,
    const mozilla::MarkerCategory& aCategory,
    mozilla::MarkerOptions&& aOptions = {}) {
  return AddMarkerToBuffer(aBuffer, aName, aCategory, std::move(aOptions),
                           mozilla::baseprofiler::markers::NoPayload{});
}

// Add a marker to the Gecko Profiler buffer.
// - aName: Main name of this marker.
// - aCategory: Category for this marker.
// - aOptions: Optional settings (such as timing, inner window id,
//   backtrace...), see `MarkerOptions` for details.
// - aMarkerType: Empty object that specifies the type of marker.
// - aPayloadArguments: Arguments expected by this marker type's
// ` StreamJSONMarkerData` function.
template <typename MarkerType, typename... PayloadArguments>
mozilla::ProfileBufferBlockIndex profiler_add_marker(
    const mozilla::ProfilerString8View& aName,
    const mozilla::MarkerCategory& aCategory, mozilla::MarkerOptions&& aOptions,
    MarkerType aMarkerType, const PayloadArguments&... aPayloadArguments) {
  if (!profiler_can_accept_markers()) {
    return {};
  }
  return ::AddMarkerToBuffer(profiler_markers_detail::CachedCoreBuffer(), aName,
                             aCategory, std::move(aOptions), aMarkerType,
                             aPayloadArguments...);
}

// Add a marker (without payload) to the Gecko Profiler buffer.
inline mozilla::ProfileBufferBlockIndex profiler_add_marker(
    const mozilla::ProfilerString8View& aName,
    const mozilla::MarkerCategory& aCategory,
    mozilla::MarkerOptions&& aOptions = {}) {
  return profiler_add_marker(aName, aCategory, std::move(aOptions),
                             mozilla::baseprofiler::markers::NoPayload{});
}

// Same as `profiler_add_marker()` (without payload). This macro is safe to use
// even if MOZ_GECKO_PROFILER is not #defined.
#  define PROFILER_MARKER_UNTYPED(markerName, categoryName, ...)               \
    do {                                                                       \
      AUTO_PROFILER_STATS(PROFILER_MARKER_UNTYPED);                            \
      ::profiler_add_marker(                                                   \
          markerName, ::geckoprofiler::category::categoryName, ##__VA_ARGS__); \
    } while (false)

// Same as `profiler_add_marker()` (with payload). This macro is safe to use
// even if MOZ_GECKO_PROFILER is not #defined.
#  define PROFILER_MARKER(markerName, categoryName, options, MarkerType, ...) \
    do {                                                                      \
      AUTO_PROFILER_STATS(PROFILER_MARKER_with_##MarkerType);                 \
      ::profiler_add_marker(                                                  \
          markerName, ::geckoprofiler::category::categoryName, options,       \
          ::geckoprofiler::markers::MarkerType{}, ##__VA_ARGS__);             \
    } while (false)

namespace geckoprofiler::markers {
// Most common marker type. Others are in ProfilerMarkerTypes.h.
using Text = ::mozilla::baseprofiler::markers::Text;
}  // namespace geckoprofiler::markers

// Add a text marker. This macro is safe to use even if MOZ_GECKO_PROFILER is
// not #defined.
#  define PROFILER_MARKER_TEXT(markerName, categoryName, options, text)       \
    do {                                                                      \
      AUTO_PROFILER_STATS(PROFILER_MARKER_TEXT);                              \
      ::profiler_add_marker(markerName,                                       \
                            ::geckoprofiler::category::categoryName, options, \
                            ::geckoprofiler::markers::Text{}, text);          \
    } while (false)

// RAII object that adds a PROFILER_MARKER_TEXT when destroyed; the marker's
// timing will be the interval from construction (unless an instant or start
// time is already specified in the provided options) until destruction.
class MOZ_RAII AutoProfilerTextMarker {
 public:
  AutoProfilerTextMarker(const char* aMarkerName,
                         const mozilla::MarkerCategory& aCategory,
                         mozilla::MarkerOptions&& aOptions,
                         const nsACString& aText)
      : mMarkerName(aMarkerName),
        mCategory(aCategory),
        mOptions(std::move(aOptions)),
        mText(aText) {
    MOZ_ASSERT(mOptions.Timing().EndTime().IsNull(),
               "AutoProfilerTextMarker options shouldn't have an end time");
    if (mOptions.Timing().StartTime().IsNull()) {
      mOptions.Set(mozilla::MarkerTiming::InstantNow());
    }
  }

  ~AutoProfilerTextMarker() {
    mOptions.TimingRef().SetIntervalEnd();
    AUTO_PROFILER_STATS(AUTO_PROFILER_MARKER_TEXT);
    profiler_add_marker(
        mozilla::ProfilerString8View::WrapNullTerminatedString(mMarkerName),
        mCategory, std::move(mOptions), geckoprofiler::markers::Text{}, mText);
  }

 protected:
  const char* mMarkerName;
  mozilla::MarkerCategory mCategory;
  mozilla::MarkerOptions mOptions;
  nsCString mText;
};

// Creates an AutoProfilerTextMarker RAII object.  This macro is safe to use
// even if MOZ_GECKO_PROFILER is not #defined.
#  define AUTO_PROFILER_MARKER_TEXT(markerName, categoryName, options, text)  \
    AutoProfilerTextMarker PROFILER_RAII(                                     \
        markerName, ::mozilla::baseprofiler::category::categoryName, options, \
        text)

#endif  // nfed MOZ_GECKO_PROFILER else

#endif  // ProfilerMarkers_h
