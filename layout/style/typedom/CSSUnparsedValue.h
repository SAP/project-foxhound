/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSUNPARSEDVALUE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSUNPARSEDVALUE_H_

#include <stdint.h>

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSStyleValue.h"
#include "mozilla/dom/CSSUnparsedValueBindingFwd.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

class ErrorResult;

namespace dom {

class GlobalObject;
template <typename T>
class Sequence;

class CSSUnparsedValue final : public CSSStyleValue {
 public:
  explicit CSSUnparsedValue(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSUnparsedValue Web IDL declarations

  static already_AddRefed<CSSUnparsedValue> Constructor(
      const GlobalObject& aGlobal,
      const Sequence<OwningCSSUnparsedSegment>& aMembers);

  uint32_t Length() const;

  void IndexedGetter(uint32_t aIndex, bool& aFound,
                     OwningCSSUnparsedSegment& aRetVal);

  void IndexedSetter(uint32_t aIndex, const CSSUnparsedSegment& aVal,
                     ErrorResult& aRv);

  // end of CSSUnparsedValue Web IDL declarations

 private:
  virtual ~CSSUnparsedValue() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSUNPARSEDVALUE_H_
