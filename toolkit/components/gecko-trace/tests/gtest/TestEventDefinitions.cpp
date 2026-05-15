#include <memory>
#include <set>

#include <gtest/gtest.h>

#include "opentelemetry/sdk/common/attribute_utils.h"

#include "Common.h"
#include "TestGeckoTraceEvents.h"
#include "mozilla/GeckoTrace.h"

namespace mozilla::gecko_trace::tests {

class GeckoTraceEventDefinitionsTest : public TestWithInMemorySpanExporter {};

using AttributeMap =
    std::unordered_map<std::string, otel::sdk::common::OwnedAttributeValue>;

[[maybe_unused]] static AttributeMap GetEventAttributes(
    const std::shared_ptr<otel::exporter::memory::InMemorySpanData>& spanData) {
  auto spans = spanData->GetSpans();
  EXPECT_EQ(spans.size(), 1u) << "Expected exactly 1 span";
  const auto& span = spans[0];
  auto events = span->GetEvents();
  EXPECT_EQ(events.size(), 1u);
  return events[0].GetAttributes();
}

[[maybe_unused]] static void AssertOnlyKeys(
    const AttributeMap& attrs, const std::set<std::string>& expected) {
  std::set<std::string> actual;
  for (const auto& [k, _] : attrs) actual.insert(k);
  EXPECT_EQ(actual, expected);
}

TEST_F(GeckoTraceEventDefinitionsTest, SimpleEventAttributes) {
  // Test with all attributes set
  {
    GECKO_TRACE_SCOPE("gtests", "Test simple event")

    event::TestSimple()
        .WithTestString("test_value")
        .WithTestInteger(42)
        .WithTestBoolean(true)
        .Emit();
  }

#ifdef GECKO_TRACE_ENABLE
  auto attrs = GetEventAttributes(mSpanData);
  AssertOnlyKeys(attrs, {"test_string", "test_integer", "test_boolean"});
  EXPECT_EQ(std::get<std::string>(attrs["test_string"]), "test_value");
  EXPECT_EQ(std::get<int64_t>(attrs["test_integer"]), 42);
  EXPECT_EQ(std::get<bool>(attrs["test_boolean"]), true);
#else
  EXPECT_EQ(mSpanData->GetSpans().size(), 0u) << "Expected exactly 0 spans";
#endif
}

TEST_F(GeckoTraceEventDefinitionsTest, SimpleEventMissingAttributes) {
  // Test with only one attribute set
  {
    GECKO_TRACE_SCOPE("gtests", "Test simple event with missing attributes")

    event::TestSimple().WithTestInteger(-1).Emit();
  }

#ifdef GECKO_TRACE_ENABLE
  auto attrs = GetEventAttributes(mSpanData);
  AssertOnlyKeys(attrs, {"test_integer"});
  EXPECT_EQ(std::get<int64_t>(attrs["test_integer"]), -1);
#else
  EXPECT_EQ(mSpanData->GetSpans().size(), 0u) << "Expected exactly 0 spans";
#endif
}

TEST_F(GeckoTraceEventDefinitionsTest, ComplexEventAllAttributes) {
  // Test multi-level inheritance with all attributes set
  {
    GECKO_TRACE_SCOPE("gtests", "Test complex event")

    event::TestComplex()
        .WithTestString("test_value")
        .WithTestInteger(42)
        .WithTestBoolean(true)
        .WithTestData("additional_data")
        .WithRetryCount(3)
        .Emit();
  }

#ifdef GECKO_TRACE_ENABLE
  auto attrs = GetEventAttributes(mSpanData);
  AssertOnlyKeys(attrs, {"test_string", "test_integer", "test_boolean",
                         "test_data", "retry.count"});
  EXPECT_EQ(std::get<std::string>(attrs["test_string"]), "test_value");
  EXPECT_EQ(std::get<int64_t>(attrs["test_integer"]), 42);
  EXPECT_EQ(std::get<bool>(attrs["test_boolean"]), true);
  EXPECT_EQ(std::get<std::string>(attrs["test_data"]), "additional_data");
  EXPECT_EQ(std::get<int64_t>(attrs["retry.count"]), 3);
#else
  EXPECT_EQ(mSpanData->GetSpans().size(), 0u) << "Expected exactly 0 spans";
#endif
}

TEST_F(GeckoTraceEventDefinitionsTest, ComplexEventPartialAttributes) {
  // Test multi-level inheritance with only some attributes set
  {
    GECKO_TRACE_SCOPE("gtests", "Test complex event with partial attributes")

    event::TestComplex().WithTestString("x").WithRetryCount(-5).Emit();
  }

#ifdef GECKO_TRACE_ENABLE
  auto attrs = GetEventAttributes(mSpanData);
  AssertOnlyKeys(attrs, {"test_string", "retry.count"});
  EXPECT_EQ(std::get<std::string>(attrs["test_string"]), "x");
  EXPECT_EQ(std::get<int64_t>(attrs["retry.count"]), -5);
#else
  EXPECT_EQ(mSpanData->GetSpans().size(), 0u) << "Expected exactly 0 spans";
#endif
}

TEST_F(GeckoTraceEventDefinitionsTest, DeepInheritanceEvent) {
  {
    GECKO_TRACE_SCOPE("gtests", "Test deep inheritance event")

    event::TestDeepInheritance()
        .WithTestString("test_value")
        .WithTestInteger(42)
        .WithTestBoolean(true)
        .WithTestData("additional_data")
        .WithRetryCount(3)
        .WithExtraInfo("deep_inheritance_info")
        .Emit();
  }

#ifdef GECKO_TRACE_ENABLE
  auto attrs = GetEventAttributes(mSpanData);
  AssertOnlyKeys(attrs, {"test_string", "test_integer", "test_boolean",
                         "test_data", "retry.count", "extra.info"});
  EXPECT_EQ(std::get<std::string>(attrs["test_string"]), "test_value");
  EXPECT_EQ(std::get<int64_t>(attrs["test_integer"]), 42);
  EXPECT_EQ(std::get<bool>(attrs["test_boolean"]), true);
  EXPECT_EQ(std::get<std::string>(attrs["test_data"]), "additional_data");
  EXPECT_EQ(std::get<int64_t>(attrs["retry.count"]), 3);
  EXPECT_EQ(std::get<std::string>(attrs["extra.info"]),
            "deep_inheritance_info");
#else
  EXPECT_EQ(mSpanData->GetSpans().size(), 0u) << "Expected exactly 0 spans";
#endif
}

}  // namespace mozilla::gecko_trace::tests
