/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/Preferences.h"
#include "mozilla/dom/IntegrityPolicy.h"
#include "nsCOMPtr.h"
#include "nsLiteralString.h"
#include "nsSerializationHelper.h"

using namespace mozilla;
using namespace mozilla::dom;

void AssertSerializationForHeadersForIntegrityPolicy(
    const nsCString& aEnforcementHeader, const nsCString& aReportOnlyHeader,
    const nsCString& aSerializedString) {
  // Test policy serialization
  RefPtr<IntegrityPolicy> policy;
  IntegrityPolicy::ParseHeaders(aEnforcementHeader, aReportOnlyHeader,
                                getter_AddRefs(policy));
  ASSERT_TRUE(policy);

  nsCOMPtr<nsISerializable> serializable =
      static_cast<nsISerializable*>(policy.get());

  nsCString str;
  nsresult rv = NS_SerializeToString(serializable, str);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  ASSERT_STREQ(str.get(), aSerializedString.get());

  // Test policy deserialization
  nsCOMPtr<nsISupports> deserialized;
  rv = NS_DeserializeObject(aSerializedString, getter_AddRefs(deserialized));
  ASSERT_TRUE(NS_SUCCEEDED(rv));
  ASSERT_TRUE(deserialized);

  nsCOMPtr<nsIIntegrityPolicy> deserializedPolicy =
      do_QueryInterface(deserialized);
  ASSERT_TRUE(deserializedPolicy);

  RefPtr<IntegrityPolicy> deserializedIntegrityPolicy =
      IntegrityPolicy::Cast(deserializedPolicy);

  ASSERT_TRUE(IntegrityPolicy::Equals(policy, deserializedIntegrityPolicy));
}

TEST(IntegrityPolicy, Serialization)
{
  // Test serialization for an empty policy
  AssertSerializationForHeadersForIntegrityPolicy(
      ""_ns, ""_ns, "SBL/Mhv/QjuX/EClaW2tIgAAAAAAAAAAwAAAAAAAAEYAAAABAAA="_ns);

  // Test serialization for a policy with a enforced blocked destination
  AssertSerializationForHeadersForIntegrityPolicy(
      "blocked-destinations=(script)"_ns, ""_ns,
      "SBL/Mhv/QjuX/EClaW2tIgAAAAAAAAAAwAAAAAAAAEYAAAABAQAAAAEAAAABAAAAAAA="_ns);

  // Test serialization for a policy with a report-only blocked destination
  AssertSerializationForHeadersForIntegrityPolicy(
      ""_ns, "blocked-destinations=(script)"_ns,
      "SBL/Mhv/QjuX/EClaW2tIgAAAAAAAAAAwAAAAAAAAEYAAAABAAEAAAABAAAAAQAAAAA="_ns);

  // Test serialization for a policy with endpoints in enforcement header
  AssertSerializationForHeadersForIntegrityPolicy(
      "blocked-destinations=(script), endpoints=(endpoint1 endpoint2)"_ns,
      ""_ns,
      "SBL/Mhv/QjuX/EClaW2tIgAAAAAAAAAAwAAAAAAAAEYAAAABAQAAAAEAAAABAAAAAgAAAAllbmRwb2ludDEAAAAJZW5kcG9pbnQyAA=="_ns);

  // Test serialization for a policy with endpoints in enforcement header
  AssertSerializationForHeadersForIntegrityPolicy(
      ""_ns,
      "blocked-destinations=(script), endpoints=(endpoint1 endpoint2)"_ns,
      "SBL/Mhv/QjuX/EClaW2tIgAAAAAAAAAAwAAAAAAAAEYAAAABAAEAAAABAAAAAQAAAAIAAAAJZW5kcG9pbnQxAAAACWVuZHBvaW50Mg=="_ns);

  // Test serialization for a policy with both enforced and report-only blocked
  // destinations and endpoints
  AssertSerializationForHeadersForIntegrityPolicy(
      "blocked-destinations=(script), endpoints=(endpoint1 endpoint2)"_ns,
      "blocked-destinations=(script), endpoints=(endpoint1 endpoint2)"_ns,
      "SBL/Mhv/QjuX/EClaW2tIgAAAAAAAAAAwAAAAAAAAEYAAAABAQAAAAEAAAABAAAAAgAAAAllbmRwb2ludDEAAAAJZW5kcG9pbnQyAQAAAAEAAAABAAAAAgAAAAllbmRwb2ludDEAAAAJZW5kcG9pbnQy"_ns);
}
