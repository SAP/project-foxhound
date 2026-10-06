/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_AutoProfilerStyleMarker_h
#define mozilla_AutoProfilerStyleMarker_h

#include "mozilla/Attributes.h"
#include "mozilla/ProfilerMarkers.h"
#include "mozilla/ServoTraversalStatistics.h"
#include "mozilla/TimeStamp.h"

namespace mozilla {

class MOZ_RAII AutoProfilerStyleMarker {
 public:
  explicit AutoProfilerStyleMarker(UniquePtr<ProfileChunkedBuffer> aCause,
                                   const Maybe<uint64_t>& aInnerWindowID)
      : mActive(profiler_thread_is_being_profiled_for_markers()),
        mCause(std::move(aCause)),
        mInnerWindowID(aInnerWindowID) {
    if (!mActive) {
      return;
    }
    mPreviousSingleton = ServoTraversalStatistics::sSingleton;
    ServoTraversalStatistics::sSingleton = &mStats;

    mStartTime = TimeStamp::Now();
  }

  ~AutoProfilerStyleMarker() {
    if (!mActive) {
      return;
    }

    struct StyleMarker {
      static constexpr mozilla::Span<const char> MarkerTypeName() {
        return mozilla::MakeStringSpan("Styles");
      }
      static void StreamJSONMarkerData(
          baseprofiler::SpliceableJSONWriter& aWriter,
          uint32_t aElementsTraversed, uint32_t aElementsStyled,
          uint32_t aElementsMatched, uint32_t aStylesShared,
          uint32_t aStylesReused) {
        aWriter.IntProperty("elementsTraversed", aElementsTraversed);
        aWriter.IntProperty("elementsStyled", aElementsStyled);
        aWriter.IntProperty("elementsMatched", aElementsMatched);
        aWriter.IntProperty("stylesShared", aStylesShared);
        aWriter.IntProperty("stylesReused", aStylesReused);
      }
      static MarkerSchema MarkerTypeDisplay() {
        using MS = MarkerSchema;
        MS schema{MS::Location::MarkerChart, MS::Location::MarkerTable,
                  MS::Location::TimelineOverview};
        schema.AddKeyLabelFormat("elementsTraversed", "Elements traversed",
                                 MS::Format::Integer);
        schema.AddKeyLabelFormat("elementsStyled", "Elements styled",
                                 MS::Format::Integer);
        schema.AddKeyLabelFormat("elementsMatched", "Elements matched",
                                 MS::Format::Integer);
        schema.AddKeyLabelFormat("stylesShared", "Styles shared",
                                 MS::Format::Integer);
        schema.AddKeyLabelFormat("stylesReused", "Styles reused",
                                 MS::Format::Integer);
        return schema;
      }
    };

    ServoTraversalStatistics::sSingleton = mPreviousSingleton;
    profiler_add_marker("Styles", geckoprofiler::category::LAYOUT,
                        {MarkerTiming::IntervalUntilNowFrom(mStartTime),
                         MarkerStack::TakeBacktrace(std::move(mCause)),
                         MarkerInnerWindowId(mInnerWindowID)},
                        StyleMarker{}, mStats.mElementsTraversed,
                        mStats.mElementsStyled, mStats.mElementsMatched,
                        mStats.mStylesShared, mStats.mStylesReused);
  }

 private:
  bool mActive;
  TimeStamp mStartTime;
  UniquePtr<ProfileChunkedBuffer> mCause;
  Maybe<uint64_t> mInnerWindowID;
  ServoTraversalStatistics mStats;
  ServoTraversalStatistics* mPreviousSingleton = nullptr;
};

}  // namespace mozilla

#endif  // mozilla_AutoProfilerStyleMarker_h
