/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef GECKO_TRACE_H
#define GECKO_TRACE_H

#include "mozilla/Logging.h"

#include "mozilla/GeckoTraceEvents.h"

#define GECKO_TRACE_SCOPE(component, span_name)                  \
  auto GECKO_TRACE_SCOPE_##__COUNTER__ =                         \
      mozilla::gecko_trace::TracerProvider::GetTracer(component) \
          ->StartSpan(span_name)                                 \
          ->Enter();

namespace mozilla::gecko_trace {

using string_view = std::string_view;

#ifdef GECKO_TRACE_ENABLE

class Scope {
 public:
  virtual ~Scope() = default;
};

class Span {
 public:
  virtual ~Span() = default;

  virtual void AddEvent(const SpanEvent& aEvent) = 0;

  [[nodiscard]] virtual std::shared_ptr<Scope> Enter() = 0;
};

class Tracer {
 public:
  virtual ~Tracer() = default;

  [[nodiscard]] virtual std::shared_ptr<Span> StartSpan(string_view aName) = 0;

  [[nodiscard]] static std::shared_ptr<Span> GetCurrentSpan();
};

class TracerProvider {
 public:
  [[nodiscard]] static std::shared_ptr<Tracer> GetTracer(string_view /*aName*/);
};

/**
 * Sets the OpenTelemetry internal log level to match the Mozilla logging
 * system.
 */
void SetOpenTelemetryInternalLogLevel(LogLevel aLogLevel);

/**
 * Initializes the GeckoTrace component and sets up OpenTelemetry integration.
 */
void Init();

#else  // !GECKO_TRACE_ENABLE

// Minimal, no-op implementation for when gecko-trace is disabled.
// Only provides API compatibility for when gecko-trace is disabled.

class Scope {
 public:
  constexpr Scope() = default;
};

class Span {
 public:
  constexpr Span() = default;
  constexpr void AddEvent(const SpanEvent&) const {}
  [[nodiscard]] inline std::shared_ptr<Scope> Enter() const {
    // Use thread_local to ensure each thread gets its own instance, avoiding
    // reference-counting and contention on a global control block.
    //
    // https://github.com/open-telemetry/opentelemetry-cpp/pull/3037#issuecomment-2380002451
    static thread_local auto sNoopScope = std::make_shared<Scope>();
    return sNoopScope;
  }
};

class Tracer {
 public:
  constexpr Tracer() = default;
  [[nodiscard]] inline std::shared_ptr<Span> StartSpan(
      string_view /*aName*/) const {
    return GetNoopSpan();
  }
  [[nodiscard]] inline std::shared_ptr<Span> GetCurrentSpan() const {
    return GetNoopSpan();
  }

 private:
  static std::shared_ptr<Span> GetNoopSpan() {
    static thread_local auto sNoopSpan =
        std::make_shared<Span>();  // See comment above regarding thread_local
                                   // usage
    return sNoopSpan;
  }
};

class TracerProvider {
 public:
  [[nodiscard]] static inline std::shared_ptr<Tracer> GetTracer(
      string_view /*aName*/) {
    static thread_local auto sNoopTracer =
        std::make_shared<Tracer>();  // See comment above regarding thread_local
                                     // usage
    return sNoopTracer;
  }
};

constexpr void SetOpenTelemetryInternalLogLevel(LogLevel /*aLogLevel*/) {}

constexpr void Init() {}

#endif  // GECKO_TRACE_ENABLE

}  // namespace mozilla::gecko_trace

#ifdef GECKO_TRACE_ENABLE
extern "C" {
void recv_gecko_trace_export(const uint8_t* buffer, uintptr_t length);
}
#else
inline constexpr void recv_gecko_trace_export(const uint8_t* /*buffer*/,
                                              uintptr_t /*length*/) {}
#endif

#endif  // GECKO_TRACE_H
