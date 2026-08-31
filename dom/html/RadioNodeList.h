/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_RadioNodeList_h
#define mozilla_dom_RadioNodeList_h

#include "HTMLFormElement.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/ContentList.h"

#define MOZILLA_DOM_RADIONODELIST_IMPLEMENTATION_IID \
  {0xbba7f3e8, 0xf3b5, 0x42e5, {0x82, 0x08, 0xa6, 0x8b, 0xe0, 0xbc, 0x22, 0x19}}

namespace mozilla::dom {

class RadioNodeList final : public SimpleContentList {
 public:
  explicit RadioNodeList(HTMLFormElement* aForm) : SimpleContentList(aForm) {}

  virtual JSObject* WrapObject(JSContext* cx,
                               JS::Handle<JSObject*> aGivenProto) override;
  void GetValue(nsString& retval, CallerType aCallerType);
  void SetValue(const nsAString& value, CallerType aCallerType);

  NS_DECL_ISUPPORTS_INHERITED
  NS_INLINE_DECL_STATIC_IID(MOZILLA_DOM_RADIONODELIST_IMPLEMENTATION_IID)
 private:
  ~RadioNodeList() = default;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_RadioNodeList_h
