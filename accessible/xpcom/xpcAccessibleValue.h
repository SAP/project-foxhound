/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_a11y_xpcAccessibleValue_h_
#define mozilla_a11y_xpcAccessibleValue_h_

#include "nsIAccessibleValue.h"

namespace mozilla {
namespace a11y {

class LocalAccessible;

/**
 * XPCOM nsIAccessibleValue interface implementation, used by
 * xpcAccessibleGeneric class.
 */
class xpcAccessibleValue : public nsIAccessibleValue {
 public:
  xpcAccessibleValue(const xpcAccessibleValue&) = delete;
  xpcAccessibleValue& operator=(const xpcAccessibleValue&) = delete;

  NS_IMETHOD GetMaximumValue(double* aValue) final;
  NS_IMETHOD GetMinimumValue(double* aValue) final;
  NS_IMETHOD GetCurrentValue(double* aValue) final;
  NS_IMETHOD SetCurrentValue(double aValue) final;
  NS_IMETHOD GetMinimumIncrement(double* aMinIncrement) final;

 protected:
  xpcAccessibleValue() = default;
  virtual ~xpcAccessibleValue() = default;

 private:
  Accessible* Intl();
};

}  // namespace a11y
}  // namespace mozilla
#endif
