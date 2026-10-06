/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_a11y_xpcAccessibleHyperText_h_
#define mozilla_a11y_xpcAccessibleHyperText_h_

#include "nsIAccessibleText.h"
#include "nsIAccessibleHyperText.h"
#include "nsIAccessibleEditableText.h"

#include "HyperTextAccessible.h"
#include "xpcAccessibleGeneric.h"

namespace mozilla {
namespace a11y {

class xpcAccessibleHyperText : public xpcAccessibleGeneric,
                               public nsIAccessibleText,
                               public nsIAccessibleEditableText,
                               public nsIAccessibleHyperText {
 public:
  explicit xpcAccessibleHyperText(Accessible* aIntl)
      : xpcAccessibleGeneric(aIntl) {
    if (aIntl->IsHyperText() && aIntl->IsTextRole()) mSupportedIfaces |= eText;
  }

  xpcAccessibleHyperText(const xpcAccessibleHyperText&) = delete;
  xpcAccessibleHyperText& operator=(const xpcAccessibleHyperText&) = delete;

  NS_DECL_ISUPPORTS_INHERITED

  NS_DECL_NSIACCESSIBLETEXT
  NS_DECL_NSIACCESSIBLEHYPERTEXT
  NS_DECL_NSIACCESSIBLEEDITABLETEXT

 protected:
  virtual ~xpcAccessibleHyperText() = default;

 private:
  HyperTextAccessibleBase* Intl() { return mIntl->AsHyperTextBase(); }

  HyperTextAccessible* IntlLocal() {
    if (LocalAccessible* acc = mIntl->AsLocal()) {
      return acc->AsHyperText();
    }

    return nullptr;
  }
};

}  // namespace a11y
}  // namespace mozilla

#endif  // mozilla_a11y_xpcAccessibleHyperText_h_
