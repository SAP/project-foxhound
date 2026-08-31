/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"

#include "mozilla/Components.h"
#include "mozilla/Preferences.h"
#include "nsIURLQueryStringStripper.h"
#include "nsIURLQueryStrippingListService.h"
#include "nsNetUtil.h"

using namespace mozilla;

static const char kPrefQueryStrippingOnShareEnabled[] =
    "privacy.query_stripping.strip_on_share.enabled";

TEST(TestURLStripOnShare, NoGlobalRule)
{
  Preferences::SetBool(kPrefQueryStrippingOnShareEnabled, true);

  nsresult rv;
  nsCOMPtr<nsIURLQueryStringStripper> queryStripper =
      components::URLQueryStringStripper::Service(&rv);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  // Provide only a site-specific rule so mStripOnShareGlobal stays Nothing.
  nsCOMPtr<nsIURLQueryStrippingListObserver> listObserver =
      do_QueryInterface(queryStripper);
  ASSERT_TRUE(listObserver);

  nsTArray<nsString> rules;
  rules.AppendElement(
      u"{\"origins\":[\"example.com\"],\"queryParams\":[\"testparam\"]}"_ns);
  rv = listObserver->OnStripOnShareUpdate(rules, nullptr);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  nsCOMPtr<nsIURI> testURI;
  NS_NewURI(getter_AddRefs(testURI), "https://example.com/?testparam=1"_ns);
  ASSERT_TRUE(testURI);

  nsCOMPtr<nsIURI> strippedURI;
  rv = queryStripper->StripForCopyOrShare(testURI, getter_AddRefs(strippedURI));
  EXPECT_TRUE(NS_SUCCEEDED(rv));
  // The site-specific rule should still strip testparam even with no global
  // rule.
  ASSERT_TRUE(strippedURI);
  EXPECT_TRUE(
      strippedURI->GetSpecOrDefault().Equals("https://example.com/"_ns));
}
