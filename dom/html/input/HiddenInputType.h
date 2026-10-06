/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_HiddenInputType_h_
#define mozilla_dom_HiddenInputType_h_

#include "mozilla/dom/InputType.h"

namespace mozilla::dom {

// input type=hidden
class HiddenInputType : public InputType {
 public:
  static InputType* Create(HTMLInputElement* aInputElement, void* aMemory) {
    return new (aMemory) HiddenInputType(aInputElement);
  }

 private:
  explicit HiddenInputType(HTMLInputElement* aInputElement)
      : InputType(aInputElement) {}
};

}  // namespace mozilla::dom

#endif /* mozilla_dom_HiddenInputType_h_ */
