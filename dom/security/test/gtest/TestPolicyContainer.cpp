/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/NullPrincipal.h"
#include "mozilla/Preferences.h"
#include "mozilla/dom/IntegrityPolicy.h"
#include "mozilla/dom/PolicyContainer.h"
#include "mozilla/dom/nsCSPContext.h"
#include "nsCOMPtr.h"
#include "nsLiteralString.h"
#include "nsNetUtil.h"
#include "nsSerializationHelper.h"

using namespace mozilla;
using namespace mozilla::dom;

void AssertSerializationForHeadersForPolicyContainer(
    const nsCString& aCSPHeader, const nsCString& aIntegrityPolicyHeader,
    const nsCString& aSerializedString) {
  // Test container serialization
  RefPtr<PolicyContainer> container = new PolicyContainer();

  if (!aIntegrityPolicyHeader.IsVoid()) {
    RefPtr<IntegrityPolicy> integrityPolicy;
    nsresult rv = IntegrityPolicy::ParseHeaders(
        aIntegrityPolicyHeader, ""_ns, getter_AddRefs(integrityPolicy));
    ASSERT_TRUE(NS_SUCCEEDED(rv));
    ASSERT_TRUE(integrityPolicy);

    container->SetIntegrityPolicy(integrityPolicy);
  }

  if (!aCSPHeader.IsVoid()) {
    RefPtr<nsCSPContext> csp = new nsCSPContext();

    nsCOMPtr<nsIPrincipal> principal = nsContentUtils::GetSystemPrincipal();
    nsCOMPtr<nsIURI> uri;
    NS_NewURI(getter_AddRefs(uri), "http://example.com"_ns);
    nsresult rv = csp->SetRequestContextWithPrincipal(principal, uri, ""_ns, 0);
    ASSERT_TRUE(NS_SUCCEEDED(rv));

    rv = csp->AppendPolicy(NS_ConvertUTF8toUTF16(aCSPHeader), false, true);
    ASSERT_TRUE(NS_SUCCEEDED(rv));

    container->SetCSP(csp);
  }

  nsCOMPtr<nsISerializable> serializable =
      static_cast<nsISerializable*>(container.get());

  nsCString str;
  nsresult rv = NS_SerializeToString(serializable, str);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  ASSERT_STREQ(str.get(), aSerializedString.get());

  // Test container deserialization
  nsCOMPtr<nsISupports> deserialized;
  rv = NS_DeserializeObject(aSerializedString, getter_AddRefs(deserialized));
  ASSERT_TRUE(NS_SUCCEEDED(rv));
  ASSERT_TRUE(deserialized);

  nsCOMPtr<nsIPolicyContainer> deserializedContainer =
      do_QueryInterface(deserialized);
  ASSERT_TRUE(deserializedContainer);

  RefPtr<PolicyContainer> deserializedPolicyContainer =
      PolicyContainer::Cast(deserializedContainer);

  ASSERT_TRUE(PolicyContainer::Equals(container, deserializedPolicyContainer));
}

TEST(PolicyContainer, Serialization)
{
  // Test serialization with no headers
  AssertSerializationForHeadersForPolicyContainer(
      VoidCString(), VoidCString(),
      "ydqGXsPXSqGicQ9XHwE8MAAAAAAAAAAAwAAAAAAAAEYAAAABAAA="_ns);

  // Test serialization with empty headers
  AssertSerializationForHeadersForPolicyContainer(
      ""_ns, ""_ns,
      "ydqGXsPXSqGicQ9XHwE8MAAAAAAAAAAAwAAAAAAAAEYAAAABAQnZ7Rrl1EAEv+Anzrkj2awdYyAIbJdIrqUcFuLaoPT2Ad6UctCANBHTk5kAEEug/UCSBzpUbXhPMJE6uHGBMgjGAAAAAv////8AAABQAQAAABNodHRwOi8vZXhhbXBsZS5jb20vAAAAAAAAAAQAAAAHAAAACwAAAAf/////AAAAB/////8AAAAHAAAACwAAABIAAAABAAAAEgAAAAEAAAASAAAAAQAAABMAAAAAAAAAAP////8AAAAA/////wAAAAD/////AAAAAP////8BAAAAAAAAAAAACHsiMyI6e319AAAAAAFIEv8yG/9CO5f8QKVpba0iSBL/Mhv/QjuX/EClaW2tIgAAAAEAAA=="_ns);

  // Test serialization with all headers
  AssertSerializationForHeadersForPolicyContainer(
      "default-src 'self'"_ns, "blocked-destinations=(script)"_ns,
      "ydqGXsPXSqGicQ9XHwE8MAAAAAAAAAAAwAAAAAAAAEYAAAABAQnZ7Rrl1EAEv+Anzrkj2awdYyAIbJdIrqUcFuLaoPT2Ad6UctCANBHTk5kAEEug/UCSBzpUbXhPMJE6uHGBMgjGAAAAAv////8AAABQAQAAABNodHRwOi8vZXhhbXBsZS5jb20vAAAAAAAAAAQAAAAHAAAACwAAAAf/////AAAAB/////8AAAAHAAAACwAAABIAAAABAAAAEgAAAAEAAAASAAAAAQAAABMAAAAAAAAAAP////8AAAAA/////wAAAAD/////AAAAAP////8BAAAAAAAAAAAACHsiMyI6e319AAAAAQAAABIAZABlAGYAYQB1AGwAdAAtAHMAcgBjACAAJwBzAGUAbABmACcAAQABSBL/Mhv/QjuX/EClaW2tIkgS/zIb/0I7l/xApWltrSIAAAABAQAAAAEAAAABAAAAAAA="_ns);
}
