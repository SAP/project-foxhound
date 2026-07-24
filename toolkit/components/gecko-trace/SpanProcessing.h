/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef GECKO_TRACE_SPAN_EXPORTERS_H
#define GECKO_TRACE_SPAN_EXPORTERS_H

#include "mozilla/AppShutdown.h"
#include "mozilla/Logging.h"
#include "mozilla/Mutex.h"
#include "mozilla/ipc/ByteBuf.h"
#include "nsTHashMap.h"

#include "opentelemetry/exporters/otlp/otlp_recordable.h"
#include "opentelemetry/exporters/otlp/otlp_recordable_utils.h"
#include "opentelemetry/proto/collector/trace/v1/trace_service.pb.h"
#include "opentelemetry/sdk/trace/exporter.h"
#include "opentelemetry/sdk/trace/processor.h"

namespace otel = opentelemetry;

namespace mozilla::gecko_trace {

namespace {
nsCString ToHex(const nsCString& aRawId) {
  nsCString hexId{};
  constexpr char kHex[] = "0123456789abcdef";
  for (size_t i = 0; i < aRawId.Length(); ++i) {
    hexId.Append(kHex[(aRawId[i] >> 4) & 0xF]);
    hexId.Append(kHex[(aRawId[i] >> 0) & 0xF]);
  }
  return hexId;
}
}  // namespace

extern LazyLogModule gLog;

// A `SpanExporter` that exports traces serialized using `protobuf`'s over IPC
// to the parent process.
//
// TODO: Make this export in batches
//		 See: https://phabricator.services.mozilla.com/D239700
class ProtobufExporter : public otel::sdk::trace::SpanExporter {
 public:
  using IPCExporter = std::function<bool(ipc::ByteBuf&&)>;

  explicit ProtobufExporter(IPCExporter&& aIPCExporter)
      : mIPCExporter(aIPCExporter) {}

  std::unique_ptr<otel::sdk::trace::Recordable> MakeRecordable() noexcept
      override {
    return std::make_unique<otel::exporter::otlp::OtlpRecordable>();
  }

  otel::sdk::common::ExportResult Export(
      const otel::nostd::span<std::unique_ptr<otel::sdk::trace::Recordable>>&
          spans) noexcept override {
    MOZ_ASSERT(
        !AppShutdown::IsInOrBeyond(ShutdownPhase::AppShutdownNetTeardown));

    otel::proto::collector::trace::v1::ExportTraceServiceRequest request;
    otel::exporter::otlp::OtlpRecordableUtils::PopulateRequest(spans, &request);

    ipc::ByteBuf buffer;
    const size_t size = request.ByteSizeLong();
    buffer.Allocate(size);

    if (!request.SerializeToArray(buffer.mData, int(size))) {
      return otel::sdk::common::ExportResult::kFailure;
    }

    if (!mIPCExporter(std::move(buffer))) {
      return otel::sdk::common::ExportResult::kFailure;
    }

    return otel::sdk::common::ExportResult::kSuccess;
  }

  bool ForceFlush(std::chrono::microseconds /* timeout */ =
                      std::chrono::microseconds::max()) noexcept override {
    // currently no-op
    return true;
  }

  bool Shutdown(std::chrono::microseconds /* timeout */ =
                    std::chrono::microseconds::max()) noexcept override {
    // currently no-op
    return true;
  }

 private:
  IPCExporter mIPCExporter;
};

// A tail sampling `SpanProcessor` that is aware of local traces.
//
// This class provides a local trace aware `SpanProcessor` that, for now, waits
// for traces to finish in one process before conditionally exporting them to
// the parent process.
//
// The only currently condition for exporting a trace to the parent process is
// that it has some event on it.
//
// In the future this `SpanProcessor` can be extended to incorporate the trace
// state as well as `InstrumentationScope` attributes to determine if it should
// export a trace/span.
class LocalSpanProcessor final : public otel::sdk::trace::SpanProcessor {
 public:
  explicit LocalSpanProcessor(std::unique_ptr<ProtobufExporter> exporter)
      : mExporter(std::move(exporter)) {}

  std::unique_ptr<otel::sdk::trace::Recordable> MakeRecordable() noexcept
      override {
    return mExporter->MakeRecordable();
  }

  void OnStart(otel::sdk::trace::Recordable& span,
               const otel::trace::SpanContext&) noexcept override {
    MutexAutoLock lock{mMutex};

    // The `Recordable` will be the same we handed out in the
    // `ProtobufExporter::MakeRecordable` call.
    auto& otlpSpan = static_cast<otel::exporter::otlp::OtlpRecordable&>(span);

    const nsCString traceId{otlpSpan.span().trace_id()};

    if (mShutDown) {
      const nsCString spanId{otlpSpan.span().span_id()};
      MOZ_LOG(gLog, LogLevel::Warning,
              ("[%s, %s]"
               "LocalSpanProcessor is shutdown, dropping span",
               ToHex(traceId).get(), ToHex(spanId).get()));
      return;
    }

    // Check if we already have an active traces for this trace id.
    auto& entry = mActiveTraces.LookupOrInsertWith(
        traceId, [&] { return ActiveTrace{}; });
    entry.activeSpans++;
  }

  void OnEnd(
      std::unique_ptr<otel::sdk::trace::Recordable>&& span) noexcept override {
    MutexAutoLock lock{mMutex};

    std::unique_ptr<otel::exporter::otlp::OtlpRecordable> otlpSpan{
        static_cast<otel::exporter::otlp::OtlpRecordable*>(span.release())};
    MOZ_ASSERT(otlpSpan);

    const nsCString traceId{otlpSpan->span().trace_id()};

    if (mShutDown) {
      const nsCString spanId{otlpSpan->span().span_id()};
      MOZ_LOG(gLog, LogLevel::Warning,
              ("[%s, %s]"
               "LocalSpanProcessor is shutdown, dropping span",
               ToHex(traceId).get(), ToHex(spanId).get()));
      return;
    }

    // This might fail if there was a remote span that was not started in
    // this process. We want to support this but for now we just drop the
    // span.
    //
    // TODO: Add support for remote spans and add a metric for edge cases.
    auto entry = mActiveTraces.Lookup(traceId);
    if (!entry) {
      return;
    }

    MOZ_ASSERT(entry->activeSpans > 0);
    entry->activeSpans--;
    entry->numberOfEvents += otlpSpan->span().events_size();
    entry->endedSpans.AppendElement(std::move(otlpSpan));

    // Check if all local spans of this trace have ended
    if (entry->activeSpans == 0) {
      MOZ_LOG(gLog, LogLevel::Debug,
              ("Ended trace with trace ID: %s", ToHex(traceId).get()));
      // We want to support more controllable parameters here but for now we
      // only check if we have any events on the span.
      //
      // TODO: Support for an override to always/sometimes export spans via
      //       `InstrumentationScope` attributes for performance tracing.
      if (entry->numberOfEvents > 0) {
        mExporter->Export(otel::nostd::span(entry->endedSpans.Elements(),
                                            entry->endedSpans.Length()));
      } else {
        MOZ_LOG(gLog, LogLevel::Debug,
                ("Trace ID: %s contained no events, dropping",
                 ToHex(traceId).get()));
      }
      mActiveTraces.Remove(traceId);
    }
  }

  bool ForceFlush(std::chrono::microseconds timeout =
                      std::chrono::microseconds::max()) noexcept override {
    // Forward to the exporter.
    return mExporter->ForceFlush(timeout);
  }

  bool Shutdown(std::chrono::microseconds /* timeout */ =
                    std::chrono::microseconds::max()) noexcept override {
    if (AppShutdown::IsInOrBeyond(ShutdownPhase::AppShutdownNetTeardown)) {
      // By this point any IPC connection to the parent process is severed and
      // we don't need to try to flush our remaining spans to the parent
      // process.
      return true;
    }

    MutexAutoLock lock{mMutex};

    if (mShutDown) {
      return true;
    }
    mShutDown = true;

    // Export everything still buffered.
    //
    // TODO: Consider merging these export calls into one
    for (auto iter = mActiveTraces.Iter(); !iter.Done(); iter.Next()) {
      auto& endedSpans = iter.Data().endedSpans;
      mExporter->Export(
          otel::nostd::span(endedSpans.Elements(), endedSpans.Length()));
      iter.Remove();
    }

    return mExporter->Shutdown();
  }

 private:
  struct ActiveTrace {
    nsTArray<std::unique_ptr<otel::sdk::trace::Recordable>> endedSpans;
    uint32_t activeSpans = 0;
    uint32_t numberOfEvents = 0;
  };

  Mutex mMutex{"LocalSpanProcessor::mMutex"};
  bool mShutDown MOZ_GUARDED_BY(mMutex){false};
  nsTHashMap<nsCString, ActiveTrace> mActiveTraces MOZ_GUARDED_BY(mMutex);
  const std::unique_ptr<otel::sdk::trace::SpanExporter> mExporter;
};

}  // namespace mozilla::gecko_trace

#endif  // GECKO_TRACE_SPAN_EXPORTERS_H
