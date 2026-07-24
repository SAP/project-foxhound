/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <ostream>

#include "gtest/gtest-param-test.h"
#include "gtest/gtest.h"

#include "nsNetUtil.h"

using namespace mozilla;
using namespace mozilla::net;

struct SAParseTestData {
  nsCString header;
  nsresult result;

  ActivateStorageAccessVariant variant;
  // only set if variant == ActivateOrigin, otherwise asserted to be empty
  nsCString origin;

  friend void PrintTo(const SAParseTestData& aData, std::ostream* aOs) {
    *aOs << "(header=" << aData.header << ", result=" << (int)aData.result
         << ", variant=" << aData.variant << ", origin=" << aData.origin << ")";
  }
};

class SAParseTest : public ::testing::TestWithParam<SAParseTestData> {};

TEST_P(SAParseTest, Simple) {
  const SAParseTestData test = GetParam();

  Result<ActivateStorageAccess, nsresult> activate =
      ParseActivateStorageAccess(test.header);

  (void)activate
      .map([&test](const ActivateStorageAccess& got) {
        EXPECT_EQ(test.result, NS_OK);
        EXPECT_EQ(test.variant, got.variant);
        EXPECT_EQ(test.origin, got.origin);
        if (got.variant != ActivateStorageAccessVariant::RetryOrigin) {
          // origin only gets set in the RetryOrigin variant
          EXPECT_EQ(got.origin, ""_ns);
        }
        return 0;
      })
      .mapErr([&test](nsresult gotResult) {
        EXPECT_EQ(test.result, gotResult);
        EXPECT_EQ(test.origin, ""_ns);

        return gotResult;
      });
}

MOZ_RUNINIT const SAParseTestData sa_parse_tests[] = {
    {"load"_ns, NS_OK, ActivateStorageAccessVariant::Load, ""_ns},
    {"retry; allowed-origin=*"_ns, NS_OK,
     ActivateStorageAccessVariant::RetryAny, ""_ns},
    {"retry; allowed-origin=\"https://example.com\""_ns, NS_OK,
     ActivateStorageAccessVariant::RetryOrigin, "https://example.com"_ns},
    {"retry; allowed-origin=\"*\""_ns, NS_OK,
     ActivateStorageAccessVariant::RetryOrigin, "*"_ns},
    {"retry ;allowed-origin=*"_ns, NS_ERROR_FAILURE,
     ActivateStorageAccessVariant::Load, ""_ns},
    {"retry; allowed-origin = *"_ns, NS_ERROR_FAILURE,
     ActivateStorageAccessVariant::Load, ""_ns},
    {"retry=value; allowed-origin=\"*\""_ns, NS_ERROR_FAILURE,
     ActivateStorageAccessVariant::Load, ""_ns},
    {"retry=value;allowed-origin=\"*\""_ns, NS_ERROR_FAILURE,
     ActivateStorageAccessVariant::Load, ""_ns},
    {"retry;allowed-origin=*;allowed-origin=\"https://example.com\""_ns, NS_OK,
     ActivateStorageAccessVariant::RetryOrigin, "https://example.com"_ns},
    {"retry;allowed-origin=\"https://example.com\";allowed-origin=*;"_ns,
     NS_ERROR_FAILURE, ActivateStorageAccessVariant::Load, ""_ns},
    {"retry;allowed-origin=\"https://example.net\";allowed-origin=\"https://example.com\""_ns,
     NS_OK, ActivateStorageAccessVariant::RetryOrigin,
     "https://example.com"_ns},
    {"retry;allowed-origin=\"https://example.com\";allowed-origin=*;"_ns,
     NS_ERROR_FAILURE, ActivateStorageAccessVariant::Load, ""_ns},
    {"\"load\""_ns, NS_ERROR_FAILURE, ActivateStorageAccessVariant::Load,
     ""_ns},
    {"something-else"_ns, NS_ERROR_FAILURE, ActivateStorageAccessVariant::Load,
     ""_ns},
};

INSTANTIATE_TEST_SUITE_P(TestStorageAccessHeader, SAParseTest,
                         testing::ValuesIn(sa_parse_tests));
