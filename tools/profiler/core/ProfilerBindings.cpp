/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* FFI functions for Profiler Rust API to call into profiler */

#include "ProfilerBindings.h"

#include "GeckoProfiler.h"

#include <set>
#include <type_traits>

void gecko_profiler_register_thread(const char* aName) {
  PROFILER_REGISTER_THREAD(aName);
}

void gecko_profiler_unregister_thread() { PROFILER_UNREGISTER_THREAD(); }

bool gecko_profiler_current_thread_is_registered(
    ThreadProfilingFeatures aThreadProfilingFeatures) {
  return mozilla::profiler::ThreadRegistration::WithOnThreadRefOr(
      [aThreadProfilingFeatures](
          mozilla::profiler::ThreadRegistration::OnThreadRef aTR) {
        return DoFeaturesIntersect(
            aTR.UnlockedConstReaderAndAtomicRWCRef().ProfilingFeatures(),
            aThreadProfilingFeatures);
      },
      false);
}

void gecko_profiler_construct_label(mozilla::AutoProfilerLabel* aAutoLabel,
                                    JS::ProfilingCategoryPair aCategoryPair) {
  new (aAutoLabel) mozilla::AutoProfilerLabel(
      "", nullptr, aCategoryPair,
      uint32_t(
          js::ProfilingStackFrame::Flags::LABEL_DETERMINED_BY_CATEGORY_PAIR));
}

void gecko_profiler_destruct_label(mozilla::AutoProfilerLabel* aAutoLabel) {
  aAutoLabel->~AutoProfilerLabel();
}

void gecko_profiler_construct_timestamp_now(mozilla::TimeStamp* aTimeStamp) {
  new (aTimeStamp) mozilla::TimeStamp(mozilla::TimeStamp::Now());
}

void gecko_profiler_clone_timestamp(const mozilla::TimeStamp* aSrcTimeStamp,
                                    mozilla::TimeStamp* aDestTimeStamp) {
  new (aDestTimeStamp) mozilla::TimeStamp(*aSrcTimeStamp);
}

void gecko_profiler_destruct_timestamp(mozilla::TimeStamp* aTimeStamp) {
  aTimeStamp->~TimeStamp();
}

void gecko_profiler_add_timestamp(const mozilla::TimeStamp* aTimeStamp,
                                  mozilla::TimeStamp* aDestTimeStamp,
                                  double aMicroseconds) {
  new (aDestTimeStamp) mozilla::TimeStamp(
      *aTimeStamp + mozilla::TimeDuration::FromMicroseconds(aMicroseconds));
}

void gecko_profiler_subtract_timestamp(const mozilla::TimeStamp* aTimeStamp,
                                       mozilla::TimeStamp* aDestTimeStamp,
                                       double aMicroseconds) {
  new (aDestTimeStamp) mozilla::TimeStamp(
      *aTimeStamp - mozilla::TimeDuration::FromMicroseconds(aMicroseconds));
}

void gecko_profiler_construct_marker_timing_instant_at(
    mozilla::MarkerTiming* aMarkerTiming, const mozilla::TimeStamp* aTime) {
  static_assert(std::is_trivially_copyable_v<mozilla::MarkerTiming>);
  mozilla::MarkerTiming::UnsafeConstruct(aMarkerTiming, *aTime,
                                         mozilla::TimeStamp{},
                                         mozilla::MarkerTiming::Phase::Instant);
}

void gecko_profiler_construct_marker_timing_instant_now(
    mozilla::MarkerTiming* aMarkerTiming) {
  static_assert(std::is_trivially_copyable_v<mozilla::MarkerTiming>);
  mozilla::MarkerTiming::UnsafeConstruct(
      aMarkerTiming, mozilla::TimeStamp::Now(), mozilla::TimeStamp{},
      mozilla::MarkerTiming::Phase::Instant);
}

void gecko_profiler_construct_marker_timing_interval(
    mozilla::MarkerTiming* aMarkerTiming, const mozilla::TimeStamp* aStartTime,
    const mozilla::TimeStamp* aEndTime) {
  static_assert(std::is_trivially_copyable_v<mozilla::MarkerTiming>);
  mozilla::MarkerTiming::UnsafeConstruct(
      aMarkerTiming, *aStartTime, *aEndTime,
      mozilla::MarkerTiming::Phase::Interval);
}

void gecko_profiler_construct_marker_timing_interval_until_now_from(
    mozilla::MarkerTiming* aMarkerTiming,
    const mozilla::TimeStamp* aStartTime) {
  static_assert(std::is_trivially_copyable_v<mozilla::MarkerTiming>);
  mozilla::MarkerTiming::UnsafeConstruct(
      aMarkerTiming, *aStartTime, mozilla::TimeStamp::Now(),
      mozilla::MarkerTiming::Phase::Interval);
}

void gecko_profiler_construct_marker_timing_interval_start(
    mozilla::MarkerTiming* aMarkerTiming, const mozilla::TimeStamp* aTime) {
  static_assert(std::is_trivially_copyable_v<mozilla::MarkerTiming>);
  mozilla::MarkerTiming::UnsafeConstruct(
      aMarkerTiming, *aTime, mozilla::TimeStamp{},
      mozilla::MarkerTiming::Phase::IntervalStart);
}

void gecko_profiler_construct_marker_timing_interval_end(
    mozilla::MarkerTiming* aMarkerTiming, const mozilla::TimeStamp* aTime) {
  static_assert(std::is_trivially_copyable_v<mozilla::MarkerTiming>);
  mozilla::MarkerTiming::UnsafeConstruct(
      aMarkerTiming, mozilla::TimeStamp{}, *aTime,
      mozilla::MarkerTiming::Phase::IntervalEnd);
}

void gecko_profiler_destruct_marker_timing(
    mozilla::MarkerTiming* aMarkerTiming) {
  aMarkerTiming->~MarkerTiming();
}

mozilla::MarkerSchema* gecko_profiler_construct_marker_schema(
    const mozilla::MarkerSchema::Location* aLocations, size_t aLength) {
  return new mozilla::MarkerSchema(aLocations, aLength);
}

mozilla::MarkerSchema*
gecko_profiler_construct_marker_schema_with_special_front_end_location() {
  return new mozilla::MarkerSchema(
      mozilla::MarkerSchema::SpecialFrontendLocation{});
}

void gecko_profiler_destruct_marker_schema(
    mozilla::MarkerSchema* aMarkerSchema) {
  delete aMarkerSchema;
}

void gecko_profiler_marker_schema_set_chart_label(
    mozilla::MarkerSchema* aSchema, const char* aLabel, size_t aLabelLength) {
  aSchema->SetChartLabel(std::string(aLabel, aLabelLength));
}

void gecko_profiler_marker_schema_set_tooltip_label(
    mozilla::MarkerSchema* aSchema, const char* aLabel, size_t aLabelLength) {
  aSchema->SetTooltipLabel(std::string(aLabel, aLabelLength));
}

void gecko_profiler_marker_schema_set_table_label(
    mozilla::MarkerSchema* aSchema, const char* aLabel, size_t aLabelLength) {
  aSchema->SetTableLabel(std::string(aLabel, aLabelLength));
}

void gecko_profiler_marker_schema_set_all_labels(mozilla::MarkerSchema* aSchema,
                                                 const char* aLabel,
                                                 size_t aLabelLength) {
  aSchema->SetAllLabels(std::string(aLabel, aLabelLength));
}

void gecko_profiler_marker_schema_set_stack_based(
    mozilla::MarkerSchema* aSchema) {
  aSchema->SetIsStackBased();
}

void gecko_profiler_marker_schema_add_key_format(
    mozilla::MarkerSchema* aSchema, const char* aKey, size_t aKeyLength,
    mozilla::MarkerSchema::Format aFormat) {
  aSchema->AddKeyFormat(std::string(aKey, aKeyLength), aFormat);
}

void gecko_profiler_marker_schema_add_key_label_format(
    mozilla::MarkerSchema* aSchema, const char* aKey, size_t aKeyLength,
    const char* aLabel, size_t aLabelLength,
    mozilla::MarkerSchema::Format aFormat) {
  aSchema->AddKeyLabelFormat(std::string(aKey, aKeyLength),
                             std::string(aLabel, aLabelLength), aFormat);
}

void gecko_profiler_marker_schema_add_key_format_with_flags(
    mozilla::MarkerSchema* aSchema, const char* aKey, size_t aKeyLength,
    mozilla::MarkerSchema::Format aFormat,
    mozilla::MarkerSchema::PayloadFlags aPayloadFlags) {
  aSchema->AddKeyFormat(std::string(aKey, aKeyLength), aFormat, aPayloadFlags);
}

void gecko_profiler_marker_schema_add_key_label_format_with_flags(
    mozilla::MarkerSchema* aSchema, const char* aKey, size_t aKeyLength,
    const char* aLabel, size_t aLabelLength,
    mozilla::MarkerSchema::Format aFormat,
    mozilla::MarkerSchema::PayloadFlags aPayloadFlags) {
  aSchema->AddKeyLabelFormat(std::string(aKey, aKeyLength),
                             std::string(aLabel, aLabelLength), aFormat,
                             aPayloadFlags);
}

void gecko_profiler_marker_schema_add_static_label_value(
    mozilla::MarkerSchema* aSchema, const char* aLabel, size_t aLabelLength,
    const char* aValue, size_t aValueLength) {
  aSchema->AddStaticLabelValue(std::string(aLabel, aLabelLength),
                               std::string(aValue, aValueLength));
}

void gecko_profiler_marker_schema_stream(
    mozilla::baseprofiler::SpliceableJSONWriter* aWriter, const char* aName,
    size_t aNameLength, mozilla::MarkerSchema* aMarkerSchema,
    void* aStreamedNamesSet) {
  auto* streamedNames = static_cast<std::set<std::string>*>(aStreamedNamesSet);
  // std::set.insert(T&&) returns a pair, its `second` is true if the element
  // was actually inserted (i.e., it was not there yet.).
  const bool didInsert =
      streamedNames->insert(std::string(aName, aNameLength)).second;
  if (didInsert) {
    std::move(*aMarkerSchema)
        .Stream(*aWriter, mozilla::Span(aName, aNameLength));
  }
}

void gecko_profiler_json_writer_int_property(
    mozilla::baseprofiler::SpliceableJSONWriter* aWriter, const char* aName,
    size_t aNameLength, int64_t aValue) {
  aWriter->IntProperty(mozilla::Span(aName, aNameLength), aValue);
}

void gecko_profiler_json_writer_float_property(
    mozilla::baseprofiler::SpliceableJSONWriter* aWriter, const char* aName,
    size_t aNameLength, double aValue) {
  aWriter->DoubleProperty(mozilla::Span(aName, aNameLength), aValue);
}

void gecko_profiler_json_writer_bool_property(
    mozilla::baseprofiler::SpliceableJSONWriter* aWriter, const char* aName,
    size_t aNameLength, bool aValue) {
  aWriter->BoolProperty(mozilla::Span(aName, aNameLength), aValue);
}
void gecko_profiler_json_writer_string_property(
    mozilla::baseprofiler::SpliceableJSONWriter* aWriter, const char* aName,
    size_t aNameLength, const char* aValue, size_t aValueLength) {
  aWriter->StringProperty(mozilla::Span(aName, aNameLength),
                          mozilla::Span(aValue, aValueLength));
}

void gecko_profiler_json_writer_unique_string_property(
    mozilla::baseprofiler::SpliceableJSONWriter* aWriter, const char* aName,
    size_t aNameLength, const char* aValue, size_t aValueLength) {
  aWriter->UniqueStringProperty(mozilla::Span(aName, aNameLength),
                                mozilla::Span(aValue, aValueLength));
}

void gecko_profiler_json_writer_null_property(
    mozilla::baseprofiler::SpliceableJSONWriter* aWriter, const char* aName,
    size_t aNameLength) {
  aWriter->NullProperty(mozilla::Span(aName, aNameLength));
}

void gecko_profiler_add_marker_untyped(
    const char* aName, size_t aNameLength,
    mozilla::baseprofiler::ProfilingCategoryPair aCategoryPair,
    mozilla::MarkerTiming* aMarkerTiming,
    mozilla::StackCaptureOptions aStackCaptureOptions) {
  profiler_add_marker(
      mozilla::ProfilerString8View(aName, aNameLength),
      mozilla::MarkerCategory{aCategoryPair},
      mozilla::MarkerOptions(
          std::move(*aMarkerTiming),
          mozilla::MarkerStack::WithCaptureOptions(aStackCaptureOptions)));
}

void gecko_profiler_add_marker_text(
    const char* aName, size_t aNameLength,
    mozilla::baseprofiler::ProfilingCategoryPair aCategoryPair,
    mozilla::MarkerTiming* aMarkerTiming,
    mozilla::StackCaptureOptions aStackCaptureOptions, const char* aText,
    size_t aTextLength) {
  profiler_add_marker(
      mozilla::ProfilerString8View(aName, aNameLength),
      mozilla::MarkerCategory{aCategoryPair},
      mozilla::MarkerOptions(
          std::move(*aMarkerTiming),
          mozilla::MarkerStack::WithCaptureOptions(aStackCaptureOptions)),
      geckoprofiler::markers::TextMarker{},
      mozilla::ProfilerString8View(aText, aTextLength));
}

void gecko_profiler_add_marker(
    const char* aName, size_t aNameLength,
    mozilla::baseprofiler::ProfilingCategoryPair aCategoryPair,
    mozilla::MarkerTiming* aMarkerTiming,
    mozilla::StackCaptureOptions aStackCaptureOptions, uint8_t aMarkerTag,
    const uint8_t* aPayload, size_t aPayloadSize) {
  // Copy the marker timing and create the marker option.
  mozilla::MarkerOptions markerOptions(
      std::move(*aMarkerTiming),
      mozilla::MarkerStack::WithCaptureOptions(aStackCaptureOptions));

  // Currently it's not possible to add a threadId option, but we will
  // have it soon.
  if (markerOptions.ThreadId().IsUnspecified()) {
    // If yet unspecified, set thread to this thread where the marker is added.
    markerOptions.Set(mozilla::MarkerThreadId::CurrentThread());
  }

  auto& buffer = profiler_get_core_buffer();
  mozilla::Span payload(aPayload, aPayloadSize);

  mozilla::StackCaptureOptions captureOptions =
      markerOptions.Stack().CaptureOptions();
  if (captureOptions != mozilla::StackCaptureOptions::NoStack &&
      // Do not capture a stack if the NoMarkerStacks feature is set.
      profiler_active_without_feature(ProfilerFeature::NoMarkerStacks)) {
    // A capture was requested, let's attempt to do it here&now. This avoids a
    // lot of allocations that would be necessary if capturing a backtrace
    // separately.
    // TODO use a local on-stack byte buffer to remove last allocation.
    // TODO reduce internal profiler stack levels, see bug 1659872.
    mozilla::ProfileBufferChunkManagerSingle chunkManager(
        mozilla::ProfileBufferChunkManager::scExpectedMaximumStackSize);
    mozilla::ProfileChunkedBuffer chunkedBuffer(
        mozilla::ProfileChunkedBuffer::ThreadSafety::WithoutMutex,
        chunkManager);
    markerOptions.StackRef().UseRequestedBacktrace(
        profiler_capture_backtrace_into(chunkedBuffer, captureOptions)
            ? &chunkedBuffer
            : nullptr);

    // This call must be made from here, while chunkedBuffer is in scope.
    buffer.PutObjects(
        mozilla::ProfileBufferEntryKind::Marker, markerOptions,
        mozilla::ProfilerString8View(aName, aNameLength),
        mozilla::MarkerCategory{aCategoryPair},
        mozilla::base_profiler_markers_detail::Streaming::DeserializerTag(
            aMarkerTag),
        mozilla::MarkerPayloadType::Rust, payload);
    return;
  }

  buffer.PutObjects(
      mozilla::ProfileBufferEntryKind::Marker, markerOptions,
      mozilla::ProfilerString8View(aName, aNameLength),
      mozilla::MarkerCategory{aCategoryPair},
      mozilla::base_profiler_markers_detail::Streaming::DeserializerTag(
          aMarkerTag),
      mozilla::MarkerPayloadType::Rust, payload);
}
