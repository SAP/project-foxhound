/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSHWB_H_
#define LAYOUT_STYLE_TYPEDOM_CSSHWB_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSColorValue.h"
#include "mozilla/dom/CSSNumericValueBindingFwd.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

class ErrorResult;

namespace dom {

class GlobalObject;

class CSSHWB final : public CSSColorValue {
 public:
  explicit CSSHWB(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSHWB Web IDL declarations

  static already_AddRefed<CSSHWB> Constructor(
      const GlobalObject& aGlobal, CSSNumericValue& aH, const CSSNumberish& aW,
      const CSSNumberish& aB, const CSSNumberish& aAlpha, ErrorResult& aRv);

  CSSNumericValue* GetH(ErrorResult& aRv) const;

  void SetH(CSSNumericValue& aArg, ErrorResult& aRv);

  void GetW(OwningCSSNumberish& aRetVal) const;

  void SetW(const CSSNumberish& aArg, ErrorResult& aRv);

  void GetB(OwningCSSNumberish& aRetVal) const;

  void SetB(const CSSNumberish& aArg, ErrorResult& aRv);

  void GetAlpha(OwningCSSNumberish& aRetVal) const;

  void SetAlpha(const CSSNumberish& aArg, ErrorResult& aRv);

  // end of CSSHWB Web IDL declarations

 private:
  virtual ~CSSHWB() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSHWB_H_
