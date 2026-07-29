/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef handler_service_child_h
#define handler_service_child_h

#include "mozilla/dom/PHandlerServiceChild.h"

namespace mozilla {

class HandlerServiceChild final : public mozilla::dom::PHandlerServiceChild {
 public:
  NS_INLINE_DECL_REFCOUNTING(HandlerServiceChild, final)
  HandlerServiceChild() {}

 private:
  virtual ~HandlerServiceChild() {}
};

}  // namespace mozilla

#endif
