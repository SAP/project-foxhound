/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_a11y_xpcAccessibleTextLeafRange_h_
#define mozilla_a11y_xpcAccessibleTextLeafRange_h_

#include "nsIAccessibleTextLeafRange.h"

namespace mozilla {
namespace a11y {

class TextLeafPoint;

class xpcAccessibleTextLeafPoint final : public nsIAccessibleTextLeafPoint {
 public:
  xpcAccessibleTextLeafPoint(nsIAccessible* aAccessible, int32_t aOffset);

  xpcAccessibleTextLeafPoint() = delete;
  xpcAccessibleTextLeafPoint& operator=(const xpcAccessibleTextLeafPoint&) =
      delete;

  NS_DECL_ISUPPORTS
  NS_DECL_NSIACCESSIBLETEXTLEAFPOINT

 private:
  ~xpcAccessibleTextLeafPoint() = default;

  TextLeafPoint ToPoint();

  // We can't hold a strong reference to an Accessible, but XPCOM needs strong
  // references. Thus, instead of holding a TextLeafPoint here, we hold
  // an nsIAccessible references and create the TextLeafPoint for each call
  // using ToPoint().
  RefPtr<nsIAccessible> mAccessible;
  int32_t mOffset;
};

}  // namespace a11y
}  // namespace mozilla

#endif
