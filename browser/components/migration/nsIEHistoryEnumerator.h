/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef iehistoryenumerator_h_
#define iehistoryenumerator_h_

#include <urlhist.h>

#include "nsCOMPtr.h"
#include "nsIWritablePropertyBag2.h"
#include "nsSimpleEnumerator.h"

class nsIEHistoryEnumerator final : public nsSimpleEnumerator {
 public:
  NS_DECL_NSISIMPLEENUMERATOR

  nsIEHistoryEnumerator();

  const nsID& DefaultInterface() override {
    return NS_GET_IID(nsIWritablePropertyBag2);
  }

 private:
  ~nsIEHistoryEnumerator() override;

  /**
   * Initializes the history reader, if needed.
   */
  void EnsureInitialized();

  RefPtr<IUrlHistoryStg2> mIEHistory;
  RefPtr<IEnumSTATURL> mURLEnumerator;

  nsCOMPtr<nsIWritablePropertyBag2> mCachedNextEntry;
};

#endif
