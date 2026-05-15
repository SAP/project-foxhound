/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "GeckoTrace.h"

#include "mozilla/Logging.h"
#include "mozilla/StaticPrefs_toolkit.h"
#include "mozilla/dom/ContentChild.h"
#include "mozilla/ipc/UtilityProcessChild.h"
#include "mozilla/net/SocketProcessChild.h"

#include "opentelemetry/context/runtime_context.h"
#include "opentelemetry/sdk/common/global_log_handler.h"
#include "opentelemetry/sdk/trace/random_id_generator_factory.h"
#include "opentelemetry/sdk/trace/samplers/always_on_factory.h"
#include "opentelemetry/sdk/trace/tracer_provider.h"
#include "opentelemetry/semconv/service_attributes.h"
#include "opentelemetry/trace/provider.h"

#include "SemanticConventions.h"
#include "SpanProcessing.h"

namespace otel = opentelemetry;
namespace otel_sdk_log = opentelemetry::sdk::common::internal_log;

namespace mozilla::gecko_trace {

LazyLogModule gLog("gecko-trace");

namespace {

static otel_sdk_log::LogLevel ToOTelLevel(mozilla::LogLevel aMozLevel) {
  using OTelLevel = otel_sdk_log::LogLevel;
  using MozLevel = mozilla::LogLevel;

  switch (aMozLevel) {
    case MozLevel::Error:
      return OTelLevel::Error;
    case MozLevel::Warning:
      return OTelLevel::Warning;
    case MozLevel::Info:
      return OTelLevel::Info;
    case MozLevel::Debug:
      // OpenTelemetry does not differentiate between debug and verbose.
      [[fallthrough]];
    case MozLevel::Verbose:
      return OTelLevel::Debug;
    case MozLevel::Disabled:
      [[fallthrough]];
    default:
      return OTelLevel::None;
  }
}

static mozilla::LogLevel ToMozLevel(otel_sdk_log::LogLevel aOTelLevel) {
  using OTelLevel = otel_sdk_log::LogLevel;
  using MozLevel = mozilla::LogLevel;

  switch (aOTelLevel) {
    case OTelLevel::Error:
      return MozLevel::Error;
    case OTelLevel::Warning:
      return MozLevel::Warning;
    case OTelLevel::Info:
      return MozLevel::Info;
    case OTelLevel::Debug:
      return MozLevel::Debug;
    default:
      return MozLevel::Disabled;
  }
}

class OTelScopeAdapter final : public Scope {
 public:
  explicit OTelScopeAdapter(std::unique_ptr<otel::context::Token> token)
      : mToken(std::move(token)) {}

 private:
  std::unique_ptr<otel::context::Token> mToken;
};

class OTelSpanAdapter final : public Span {
 public:
  explicit OTelSpanAdapter(std::shared_ptr<otel::trace::Span> span)
      : mSpan(std::move(span)) {}

  void AddEvent(const SpanEvent& aEvent) override {
    // Helper class to adapt SpanEvent attributes to OpenTelemetry format
    class KeyValueAdapter : public otel::common::KeyValueIterable {
     public:
      explicit KeyValueAdapter(const SpanEvent& aEvent) : mEvent(aEvent) {}

      bool ForEachKeyValue(otel::nostd::function_ref<
                           bool(string_view, otel::common::AttributeValue)>
                               callback) const noexcept override {
        return mEvent.ForEachKeyValue(
            [&](string_view aName, const AttributeValue& aValue) {
              return aValue.match(
                  [&](bool aBool) { return callback(aName, aBool); },
                  [&](int64_t aInt) { return callback(aName, aInt); },
                  [&](string_view aStr) { return callback(aName, aStr); },
                  [&](mozilla::Span<const bool> aBoolSpan) {
                    return callback(aName, aBoolSpan);
                  },
                  [&](mozilla::Span<const int64_t> aIntSpan) {
                    return callback(aName, aIntSpan);
                  },
                  [&](mozilla::Span<const string_view> aStringSpan) {
                    return callback(aName, aStringSpan);
                  });
            });
      }

      size_t size() const noexcept override { return mEvent.Size(); }

     private:
      const SpanEvent& mEvent;
    };

    KeyValueAdapter adapter(aEvent);
    mSpan->AddEvent(aEvent.GetEventName(), adapter);
  }

  std::shared_ptr<Scope> Enter() override {
    auto token = otel::context::RuntimeContext::Attach(
        otel::context::RuntimeContext::GetCurrent().SetValue(
            otel::trace::kSpanKey, mSpan));
    return std::make_shared<OTelScopeAdapter>(std::move(token));
  }

 private:
  std::shared_ptr<otel::trace::Span> mSpan;
};

class OTelTracerAdapter final : public Tracer {
 public:
  explicit OTelTracerAdapter(std::shared_ptr<otel::trace::Tracer> tracer)
      : mTracer(std::move(tracer)) {}

  std::shared_ptr<Span> StartSpan(string_view aName) override {
    return std::make_shared<OTelSpanAdapter>(mTracer->StartSpan(aName));
  }

 private:
  std::shared_ptr<otel::trace::Tracer> mTracer;
};

// Log handler that forwards OpenTelemetry logs to Mozilla logging system
class OTelToMozLogHandler final : public otel_sdk_log::LogHandler {
 public:
  void Handle(otel_sdk_log::LogLevel aLevel, const char* aFile, int aLine,
              const char* aMsg,
              const otel::sdk::common::AttributeMap&) noexcept override {
    static LazyLogModule sOTelLog("opentelemetry");
    MOZ_LOG(sOTelLog, ToMozLevel(aLevel), ("%s", aMsg));
  }
};

}  // namespace

void SpanEvent::Emit() { Tracer::GetCurrentSpan()->AddEvent(*this); }

std::shared_ptr<gecko_trace::Span> Tracer::GetCurrentSpan() {
  auto active = otel::context::RuntimeContext::GetValue(otel::trace::kSpanKey);

  if (std::holds_alternative<std::shared_ptr<otel::trace::Span>>(active)) {
    return std::make_shared<OTelSpanAdapter>(
        std::get<std::shared_ptr<otel::trace::Span>>(active));
  }

  // Use thread_local to ensure each thread gets its own instance, avoiding
  // atomic reference counting and contention on the global control block.
  //
  // This optimization addresses performance concerns in the OpenTelemetry C++
  // library where the original GetSpan() implementation would allocate a new
  // DefaultSpan each time no active span was found.
  //
  // This is particularly important for Firefox integration where instrumented
  // libraries may be used in non-instrumented applications, causing frequent
  // calls to GetCurrentSpan() when no root span exists.
  //
  // See GitHub discussion for detailed rationale and performance analysis:
  // https://github.com/open-telemetry/opentelemetry-cpp/pull/3037
  static thread_local auto sDefaultOTelSpan = std::make_shared<OTelSpanAdapter>(
      std::make_shared<otel::trace::DefaultSpan>(
          otel::trace::SpanContext::GetInvalid()));

  return sDefaultOTelSpan;
}

std::shared_ptr<Tracer> TracerProvider::GetTracer(string_view aComponentName) {
  auto otelTracer =
      otel::trace::Provider::GetTracerProvider()->GetTracer(aComponentName);
  return std::make_shared<OTelTracerAdapter>(otelTracer);
}

void SetOpenTelemetryInternalLogLevel(mozilla::LogLevel aLogLevel) {
  otel_sdk_log::GlobalLogHandler::SetLogLevel(ToOTelLevel(aLogLevel));
}

void InitializeTracerProvider() {
  switch (XRE_GetProcessType()) {
    case GeckoProcessType_Default:
      [[fallthrough]];
    case GeckoProcessType_Content:
      [[fallthrough]];
    case GeckoProcessType_Socket:
      [[fallthrough]];
    case GeckoProcessType_Utility:
      break;
    default:
      MOZ_LOG(gLog, LogLevel::Warning,
              ("InitializeTracerProvider: Unsupported process type %s - "
               "tracing disabled",
               XRE_GetProcessTypeString()));
      return;
  }

  auto processor = std::make_unique<LocalSpanProcessor>(
      std::make_unique<ProtobufExporter>([](ipc::ByteBuf&& aBuffer) {
        switch (XRE_GetProcessType()) {
          case GeckoProcessType_Default:
            recv_gecko_trace_export(aBuffer.mData, aBuffer.mLen);
            return true;
          case GeckoProcessType_Content:
            return mozilla::dom::ContentChild::GetSingleton()
                ->SendGeckoTraceExport(std::move(aBuffer));
          case GeckoProcessType_Socket:
            return net::SocketProcessChild::GetSingleton()
                ->SendGeckoTraceExport(std::move(aBuffer));
          case GeckoProcessType_Utility:
            // TODO: Add more process types when needed.
            return ipc::UtilityProcessChild::GetSingleton()
                ->SendGeckoTraceExport(std::move(aBuffer));
          default:
            MOZ_LOG(gLog, LogLevel::Error, ("unsupported process type"));
            return false;
        }
      }));

  std::vector<std::unique_ptr<otel::sdk::trace::SpanProcessor>> processors{};
  processors.push_back(std::move(processor));

  auto resource = otel::sdk::resource::Resource::Create({
      {otel::semconv::service::kServiceName, "Firefox"},
      {semantic_conventions::kProcessID, XRE_GetChildID()},
      {semantic_conventions::kProcessType, XRE_GetProcessTypeString()},
  });

  bool tracingEnabled = StaticPrefs::toolkit_gecko_trace_enable();

  auto configurator =
      otel::sdk::instrumentationscope::
          ScopeConfigurator<otel::sdk::trace::TracerConfig>::Builder(
              tracingEnabled ? otel::sdk::trace::TracerConfig::Enabled()
                             : otel::sdk::trace::TracerConfig::Disabled())
              .Build();

  auto context = std::make_unique<otel::sdk::trace::TracerContext>(
      std::move(processors), resource,
      otel::sdk::trace::AlwaysOnSamplerFactory::Create(),
      otel::sdk::trace::RandomIdGeneratorFactory::Create(),
      std::make_unique<otel::sdk::instrumentationscope::ScopeConfigurator<
          otel::sdk::trace::TracerConfig>>(configurator));

  auto tracerProvider =
      std::make_shared<otel::sdk::trace::TracerProvider>(std::move(context));

  otel::trace::Provider::SetTracerProvider(tracerProvider);
}

void InitializeShutdownHandlers() {
  const auto shutdownTracerProvider = [] {
    MOZ_LOG(gLog, LogLevel::Info, ("Shutting down tracer provider"));

    // This will trigger `Shutdown` to be called on all configured
    // `SpanProcessor`s (currently just `LocalSpanProcessor`).
    //
    // After this point any traces that are started will no longer be recorded.
    otel::trace::Provider::SetTracerProvider(
        std::make_shared<otel::trace::NoopTracerProvider>());
  };

  switch (XRE_GetProcessType()) {
    case GeckoProcessType_Default:
      // If we are in the parent process, we want to submit a final ping to
      // Glean just before the browser shuts down in `XPCOMShutdown`.
      //
      // See:
      // https://searchfox.org/firefox-main/rev/e02959386f6f89c1476edba10b3902f4e4f3ed4c/toolkit/components/glean/xpcom/FOG.cpp#91-116
      //
      // The Rust side of the component shutdown observer will also be triggered
      // on `XPCOMWillShutdown`, but since it is an `nsIObserver`, this will
      // always happen after the shutdown handlers inserted using
      // `RunOnShutdown` run.
      //
      // See:
      // https://searchfox.org/firefox-main/rev/3c23ce1368431d49bae08e8e211f7f2bf4e4829d/xpcom/base/AppShutdown.cpp#425-451
      RunOnShutdown(shutdownTracerProvider, ShutdownPhase::XPCOMWillShutdown);
      break;
    case GeckoProcessType_Content:
      // We will be notified of AppShutdownConfirmed before the IPC connection
      // to the parent process is terminated.
      RunOnShutdown(shutdownTracerProvider,
                    ShutdownPhase::AppShutdownConfirmed);
      break;
    default:
      // Other child process types (as well as content processes on Android)
      // perform shut down by directly closing the IPC connection without any
      // async shutdown steps. This means there is no opportunity to transfer
      // incomplete span information on shutdown in these process types.
      //
      // We still register a shutdown listener, as it is required to clean up
      // the tracer provider object and satisfy leak-check.
      //
      // See: Bug 1985333
      RunOnShutdown(shutdownTracerProvider, ShutdownPhase::XPCOMShutdownFinal);
      break;
  }
}

void Init() {
  // Set up log forwarding from OpenTelemetry to Mozilla logging
  otel_sdk_log::GlobalLogHandler::SetLogHandler(
      std::make_shared<OTelToMozLogHandler>());

  InitializeTracerProvider();
  InitializeShutdownHandlers();
}

}  // namespace mozilla::gecko_trace
