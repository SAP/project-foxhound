/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSRGB_H_
#define LAYOUT_STYLE_TYPEDOM_CSSRGB_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSColorValue.h"
#include "mozilla/dom/CSSColorValueBindingFwd.h"

template <class T>
struct already_AddRefed;
template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

class ErrorResult;

namespace dom {

class GlobalObject;

class CSSRGB final : public CSSColorValue {
 public:
  explicit CSSRGB(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSRGB Web IDL declarations

  static already_AddRefed<CSSRGB> Constructor(const GlobalObject& aGlobal,
                                              const CSSColorRGBComp& aR,
                                              const CSSColorRGBComp& aG,
                                              const CSSColorRGBComp& aB,
                                              const CSSColorPercent& aAlpha,
                                              ErrorResult& aRv);

  void GetR(OwningCSSColorRGBComp& aRetVal) const;

  void SetR(const CSSColorRGBComp& aArg, ErrorResult& aRv);

  void GetG(OwningCSSColorRGBComp& aRetVal) const;

  void SetG(const CSSColorRGBComp& aArg, ErrorResult& aRv);

  void GetB(OwningCSSColorRGBComp& aRetVal) const;

  void SetB(const CSSColorRGBComp& aArg, ErrorResult& aRv);

  void GetAlpha(OwningCSSColorPercent& aRetVal) const;

  void SetAlpha(const CSSColorPercent& aArg, ErrorResult& aRv);

  // end of CSSRGB Web IDL declarations

 private:
  virtual ~CSSRGB() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSRGB_H_
