/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
#include "gtest/gtest.h"
#include "mozilla/dom/ReportingHeader.h"
#include "nsIURI.h"
#include "nsNetUtil.h"

using namespace mozilla;
using namespace mozilla::dom;

TEST(ReportingEndpointsParser, Basic)
{
  nsCOMPtr<nsIURI> uri1;
  nsCOMPtr<nsIURI> uri2;

  nsresult rv =
      NS_NewURI(getter_AddRefs(uri1), "https://example.com/csp-reports");
  ASSERT_EQ(NS_OK, rv);
  rv = NS_NewURI(getter_AddRefs(uri2), "https://example.com/hpkp-reports");
  ASSERT_EQ(NS_OK, rv);

  bool urlEqual = false;

  // Empty header
  EndpointsList endpoints;

  auto endpointConstructor = [&endpoints](const nsAString& aKey,
                                          nsCOMPtr<nsIURI> aEndpointURL) {
    endpoints.mData.EmplaceBack(
        ReportingHeader::Endpoint::Create(aEndpointURL.forget(), aKey));
  };

  size_t count = ReportingHeader::ParseReportingEndpointsHeader(
      ""_ns, uri1, endpointConstructor);
  ASSERT_EQ(count, 0u);

  // Empty header
  count = ReportingHeader::ParseReportingEndpointsHeader("     "_ns, uri1,
                                                         endpointConstructor);
  ASSERT_EQ(count, 0u);

  // Single client
  count = ReportingHeader::ParseReportingEndpointsHeader(
      "csp-endpoint=\"https://example.com/csp-reports\""_ns, uri1,
      endpointConstructor);
  ASSERT_EQ(count, 1u);
  ASSERT_EQ(1u, endpoints.mData.Length());
  ASSERT_TRUE(
      endpoints.mData.ElementAt(0).mEndpointName.EqualsLiteral("csp-endpoint"));
  ASSERT_EQ(1u, endpoints.mData.Length());
  ASSERT_TRUE(NS_SUCCEEDED(
                  endpoints.mData.ElementAt(0).mUrl->Equals(uri1, &urlEqual)) &&
              urlEqual);

  // 2 clients, different group names
  endpoints.mData.Clear();

  count = ReportingHeader::ParseReportingEndpointsHeader(
      "csp-endpoint=\"https://example.com/csp-reports\",\thpkp-endpoint=\"https://example.com/hpkp-reports\""_ns,
      uri1, endpointConstructor);
  ASSERT_EQ(count, 2u);
  ASSERT_TRUE(
      endpoints.mData.ElementAt(0).mEndpointName.EqualsLiteral("csp-endpoint"));

  ASSERT_TRUE(NS_SUCCEEDED(
                  endpoints.mData.ElementAt(0).mUrl->Equals(uri1, &urlEqual)) &&
              urlEqual);
  ASSERT_TRUE(endpoints.mData.ElementAt(1).mEndpointName.EqualsLiteral(
      "hpkp-endpoint"));

  ASSERT_TRUE(NS_SUCCEEDED(
                  endpoints.mData.ElementAt(1).mUrl->Equals(uri2, &urlEqual)) &&
              urlEqual);

  // Single client, passed in as an inner list with parameters to ignore
  endpoints.mData.Clear();
  count = ReportingHeader::ParseReportingEndpointsHeader(
      "csp-endpoint=(\"https://example.com/csp-reports\" 5);valid"_ns, uri1,
      endpointConstructor);
  ASSERT_EQ(1u, count);
  ASSERT_TRUE(
      endpoints.mData.ElementAt(0).mEndpointName.EqualsLiteral("csp-endpoint"));
  ASSERT_EQ(1u, endpoints.mData.Length());
  ASSERT_TRUE(NS_SUCCEEDED(
                  endpoints.mData.ElementAt(0).mUrl->Equals(uri1, &urlEqual)) &&
              urlEqual);

  endpoints.mData.Clear();
  // Single client, key's value is an empty string. Providing base url makes
  // final result relative
  count = ReportingHeader::ParseReportingEndpointsHeader(
      "csp-endpoint=\"   \""_ns, uri1, endpointConstructor);
  ASSERT_EQ(count, 1u);

  // Single client, key's value is a non-URL string. Providing base url makes
  // final result relative
  count = ReportingHeader::ParseReportingEndpointsHeader(
      "csp-endpoint=\"Not URL syntax\""_ns, uri1, endpointConstructor);
  ASSERT_EQ(count, 1u);

  // Single client, key's value cannot be translated to a String SFVItem
  count = ReportingHeader::ParseReportingEndpointsHeader(
      "csp-endpoint=1"_ns, uri1, endpointConstructor);

  ASSERT_EQ(count, 0u);
}
