/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_MLSTransactionChild_h
#define mozilla_dom_MLSTransactionChild_h

#include "mozilla/dom/PMLSTransaction.h"
#include "mozilla/dom/PMLSTransactionChild.h"

namespace mozilla::dom {

class MLSTransactionChild final : public PMLSTransactionChild {
 public:
  NS_INLINE_DECL_REFCOUNTING(MLSTransactionChild, override)

  MLSTransactionChild();

 protected:
  virtual ~MLSTransactionChild();
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_MLSTransactionChild_h
