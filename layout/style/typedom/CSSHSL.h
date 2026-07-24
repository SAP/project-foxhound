/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSHSL_H_
#define LAYOUT_STYLE_TYPEDOM_CSSHSL_H_

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

class CSSHSL final : public CSSColorValue {
 public:
  explicit CSSHSL(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSHSL Web IDL declarations

  static already_AddRefed<CSSHSL> Constructor(const GlobalObject& aGlobal,
                                              const CSSColorAngle& aH,
                                              const CSSColorPercent& aS,
                                              const CSSColorPercent& aL,
                                              const CSSColorPercent& aAlpha,
                                              ErrorResult& aRv);

  void GetH(OwningCSSColorAngle& aRetVal) const;

  void SetH(const CSSColorAngle& aArg, ErrorResult& aRv);

  void GetS(OwningCSSColorPercent& aRetVal) const;

  void SetS(const CSSColorPercent& aArg, ErrorResult& aRv);

  void GetL(OwningCSSColorPercent& aRetVal) const;

  void SetL(const CSSColorPercent& aArg, ErrorResult& aRv);

  void GetAlpha(OwningCSSColorPercent& aRetVal) const;

  void SetAlpha(const CSSColorPercent& aArg, ErrorResult& aRv);

  // end of CSSHSL Web IDL declarations

 private:
  virtual ~CSSHSL() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSHSL_H_
