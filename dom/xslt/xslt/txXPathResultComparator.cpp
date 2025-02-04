/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/FloatingPoint.h"
#include "mozilla/intl/Collator.h"
#include "mozilla/intl/LocaleService.h"

#include "txXPathResultComparator.h"
#include "txExpr.h"
#include "nsComponentManagerUtils.h"
#include "txCore.h"

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

nsresult txResultStringComparator::init(const nsString& aLanguage) {
  auto result =
      aLanguage.IsEmpty()
          ? mozilla::intl::LocaleService::TryCreateComponent<Collator>()
          : mozilla::intl::LocaleService::TryCreateComponentWithLocale<
                Collator>(NS_ConvertUTF16toUTF8(aLanguage).get());

  NS_ENSURE_TRUE(result.isOk(), NS_ERROR_FAILURE);
  auto collator = result.unwrap();

  // Sort in a case-insensitive way, where "base" letters are considered
  // equal, e.g: a = á, a = A, a ≠ b.
  Collator::Options options{};
  options.sensitivity = Collator::Sensitivity::Base;
  auto optResult = collator->SetOptions(options);
  NS_ENSURE_TRUE(optResult.isOk(), NS_ERROR_FAILURE);

  mCollator = UniquePtr<const Collator>(collator.release());
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

  int32_t result = mCollator->CompareStrings(dval1, dval2);

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
