/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_CookieStoreChild_h
#define mozilla_dom_CookieStoreChild_h

#include "mozilla/dom/PCookieStoreChild.h"
#include "nsISupportsImpl.h"

namespace mozilla::dom {

class CookieStoreChild final : public PCookieStoreChild {
  friend class PCookieStoreChild;

 public:
  NS_INLINE_DECL_REFCOUNTING(CookieStoreChild)

  CookieStoreChild();

  void Close();

 private:
  ~CookieStoreChild();
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_CookieStoreChild_h
