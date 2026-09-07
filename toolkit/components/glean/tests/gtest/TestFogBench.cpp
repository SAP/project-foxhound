/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/MozGTestBench.h"
#include "gtest/gtest.h"
#include "mozilla/glean/GleanTestsTestMetrics.h"
#include "mozilla/glean/fog_ffi_generated.h"

using namespace mozilla::glean;
using namespace mozilla::glean::impl;

class FOGBench : public ::testing::Test {
 protected:
  FOGBench() = default;
  virtual void SetUp() {
    nsCString empty;
    ASSERT_EQ(NS_OK, fog_test_reset(&empty, &empty));
  }
};

static int gBenchIterations = 50000;

MOZ_GTEST_BENCH_F(FOGBench, RecordCounter, [] {
  // On CI this function is run multiple times without a reset. For validation
  // we check the before/after values.
  int oldValue = test_only::bad_code.TestGetValue().unwrap().valueOr(0);

  for (int i = 0; i < gBenchIterations; i++) {
    mozilla::glean::test_only::bad_code.Add(1);
  }

  ASSERT_EQ(oldValue + gBenchIterations,
            test_only::bad_code.TestGetValue().unwrap().ref());
});

MOZ_GTEST_BENCH_F(FOGBench, RecordLabeledCounter, [] {
  // On CI this function is run multiple times without a reset. For validation
  // we check the before/after values.
  int oldValue = test_only::mabels_kitchen_counters.Get("marble"_ns)
                     .TestGetValue()
                     .unwrap()
                     .valueOr(0);

  for (int i = 0; i < gBenchIterations; i++) {
    test_only::mabels_kitchen_counters.Get("marble"_ns).Add(1);
  }

  ASSERT_EQ(oldValue + gBenchIterations,
            test_only::mabels_kitchen_counters.Get("marble"_ns)
                .TestGetValue()
                .unwrap()
                .ref());
});
