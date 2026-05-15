/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSCOLOR_H_
#define LAYOUT_STYLE_TYPEDOM_CSSCOLOR_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSColorValue.h"
#include "mozilla/dom/CSSColorValueBindingFwd.h"
#include "mozilla/dom/CSSKeywordValueBindingFwd.h"
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
template <typename T>
class Sequence;

class CSSColor final : public CSSColorValue {
 public:
  explicit CSSColor(nsCOMPtr<nsISupports> aParent);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSColor Web IDL declarations

  static already_AddRefed<CSSColor> Constructor(
      const GlobalObject& aGlobal, const CSSKeywordish& aColorSpace,
      const Sequence<OwningCSSColorPercent>& aChannels,
      const CSSNumberish& aAlpha, ErrorResult& aRv);

  void GetColorSpace(OwningCSSKeywordish& aRetVal) const;

  void SetColorSpace(const CSSKeywordish& aArg, ErrorResult& aRv);

  void OnSetChannels(CSSNumericValue& aValue, uint32_t aIndex,
                     ErrorResult& aRv);

  void OnDeleteChannels(CSSNumericValue& aValue, uint32_t aIndex,
                        ErrorResult& aRv);

  void GetAlpha(OwningCSSNumberish& aRetVal) const;

  void SetAlpha(const CSSNumberish& aArg, ErrorResult& aRv);

  // end of CSSColor Web IDL declarations

 private:
  virtual ~CSSColor() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSCOLOR_H_
