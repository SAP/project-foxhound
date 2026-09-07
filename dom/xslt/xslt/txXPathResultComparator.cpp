/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "txXPathResultComparator.h"

#include "mozilla/intl/Collator.h"
#include "mozilla/intl/LocaleService.h"
#include "nsComponentManagerUtils.h"
#include "nsRFPService.h"
#include "txCore.h"
#include "txExpr.h"

using namespace mozilla;
using Collator = mozilla::intl::Collator;

#define kAscending (1 << 0)
#define kUpperFirst (1 << 1)

txResultStringComparator::txResultStringComparator(bool aAscending,
                                                   bool aUpperFirst) {
  mSorting = 0;
  if (aAscending) mSorting |= kAscending;
  if (aUpperFirst) mSorting |= kUpperFirst;
}

nsresult txResultStringComparator::init(const nsACString& aLanguage,
                                        bool aResistFingerPrinting) {
  // TODO: Old code set sensitivity to Base, which is most likely a bug,
  // but let's fix the bug as a distinct follow-up changeset.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1978383
  //
  // TODO: The old code didn't pass through case-order:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1862626
  // Let's fix the bug as a distinct changeset.

  mozilla::intl::CollatorOptions options{};
  options.sensitivity = mozilla::intl::CollatorSensitivity::Base;

  auto result = mozilla::intl::Collator::TryCreate(aLanguage, options);
  if (result.isErr()) {
    // We come here if `aLanguage` didn't parse as a language tag,
    // including if `aLanguage` was empty. We fall back to the app
    // locale, unless we're resisting fingerprinting, in which case
    // we use the spoofed JS locale.
    nsAutoCStringN<32> appLocale;
    if (aResistFingerPrinting) {
      appLocale.Assign(nsRFPService::GetSpoofedJSLocale());
    } else {
      mozilla::intl::LocaleService::GetInstance()->GetAppLocaleAsBCP47(
          appLocale);
    }
    result = mozilla::intl::Collator::TryCreate(appLocale, options);
  }

  NS_ENSURE_TRUE(result.isOk(), NS_ERROR_FAILURE);
  mCollator = result.unwrap();
  return NS_OK;
}

std::pair<UniquePtr<txObject>, nsresult>
txResultStringComparator::createSortableValue(Expr* aExpr,
                                              txIEvalContext* aContext) {
  UniquePtr<nsString> string = MakeUnique<nsString>();
  nsresult rv = aExpr->evaluateToString(aContext, *string);
  return std::make_pair(MakeUnique<StringValue>(std::move(string)), rv);
}

int txResultStringComparator::compareValues(txObject* aVal1, txObject* aVal2) {
  nsString& dval1 = *((StringValue*)aVal1)->mString;
  nsString& dval2 = *((StringValue*)aVal2)->mString;

  int32_t result = mCollator->CompareUTF16(dval1, dval2);

  return (mSorting & kAscending) ? result : -result;
}

txResultNumberComparator::txResultNumberComparator(bool aAscending) {
  mAscending = aAscending ? 1 : -1;
}

std::pair<UniquePtr<txObject>, nsresult>
txResultNumberComparator::createSortableValue(Expr* aExpr,
                                              txIEvalContext* aContext) {
  RefPtr<txAExprResult> exprRes;
  nsresult rv = aExpr->evaluate(aContext, getter_AddRefs(exprRes));
  return std::make_pair(
      MakeUnique<NumberValue>(NS_SUCCEEDED(rv) ? exprRes->numberValue() : 0),
      rv);
}

int txResultNumberComparator::compareValues(txObject* aVal1, txObject* aVal2) {
  double dval1 = ((NumberValue*)aVal1)->mVal;
  double dval2 = ((NumberValue*)aVal2)->mVal;

  if (std::isnan(dval1)) return std::isnan(dval2) ? 0 : -mAscending;

  if (std::isnan(dval2)) return mAscending;

  if (dval1 == dval2) return 0;

  return (dval1 < dval2) ? -mAscending : mAscending;
}
