
#include "gtest/gtest.h"

#include "Common.h"
#include "mozilla/GeckoTrace.h"

namespace mozilla::gecko_trace::tests {

class GeckoTraceAPITest : public TestWithInMemorySpanExporter {};

class TestEvent : public mozilla::gecko_trace::SpanEvent {
 public:
  bool ForEachKeyValue(std::function<bool(string_view, AttributeValue)>
                           aCallback) const override {
    return true;
  }

  string_view GetEventName() const override { return "manual.test"; }

  size_t Size() const override { return 0; }
};

TEST_F(GeckoTraceAPITest, NestedSpans) {
  {
    GECKO_TRACE_SCOPE("gtests", "outer span");

    TestEvent().Emit();

    {
      auto tracer = mozilla::gecko_trace::TracerProvider::GetTracer("test");
      auto innerSpan = tracer->StartSpan("inner span non macro");

      innerSpan->AddEvent(TestEvent());
    }

    TestEvent().Emit();
  }

  auto spans = mSpanData->GetSpans();

#ifdef GECKO_TRACE_ENABLE
  EXPECT_EQ(spans.size(), 2u) << "Expected exactly 2 spans (outer and inner)";

  // Verify span hierarchy - inner span should be child of outer span
  if (spans.size() >= 2) {
    // The spans should be ordered with inner span first (due to scope ending)
    // and outer span second
    const auto& innerSpan = spans[0];
    const auto& outerSpan = spans[1];

    EXPECT_EQ(innerSpan->GetName(), "inner span non macro");
    EXPECT_EQ(innerSpan->GetEvents().size(), 1u)
        << "Expected exactly 1 event in inner span";
    EXPECT_EQ(outerSpan->GetName(), "outer span");
    EXPECT_EQ(outerSpan->GetEvents().size(), 2u)
        << "Expected exactly 2 events in outer span";

    // Verify parent-child relationship
    EXPECT_EQ(innerSpan->GetParentSpanId(), outerSpan->GetSpanId());
  }
#else
  EXPECT_EQ(spans.size(), 0u) << "Expected exactly 0 spans";
#endif
}

}  // namespace mozilla::gecko_trace::tests
