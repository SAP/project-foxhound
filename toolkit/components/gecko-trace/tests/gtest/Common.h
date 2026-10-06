#ifndef GECKO_TRACE_GTEST_COMMON_H
#define GECKO_TRACE_GTEST_COMMON_H

#include "gtest/gtest.h"

#include "opentelemetry/exporters/memory/in_memory_span_exporter.h"
#include "opentelemetry/sdk/trace/simple_processor.h"
#include "opentelemetry/sdk/trace/tracer_provider_factory.h"
#include "opentelemetry/trace/provider.h"

namespace otel = opentelemetry;

namespace mozilla::gecko_trace::tests {

class TestWithInMemorySpanExporter : public ::testing::Test {
 protected:
  void SetUp() override {
    auto exporter =
        std::make_unique<otel::exporter::memory::InMemorySpanExporter>();
    mSpanData = exporter->GetData();
    auto processor = std::make_unique<otel::sdk::trace::SimpleSpanProcessor>(
        std::move(exporter));
    auto provider =
        otel::sdk::trace::TracerProviderFactory::Create(std::move(processor));

    otel::trace::Provider::SetTracerProvider(std::move(provider));
  }
  std::shared_ptr<otel::exporter::memory::InMemorySpanData> mSpanData;
};

}  // namespace mozilla::gecko_trace::tests

#endif  // GECKO_TRACE_GTEST_COMMON_H
