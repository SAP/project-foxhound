/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSVARIABLEREFERENCEVALUE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSVARIABLEREFERENCEVALUE_H_

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSUnparsedValueBindingFwd.h"
#include "nsCOMPtr.h"
#include "nsISupports.h"
#include "nsISupportsImpl.h"
#include "nsStringFwd.h"
#include "nsWrapperCache.h"

template <class T>
struct already_AddRefed;

namespace mozilla {

class ErrorResult;

namespace dom {

class GlobalObject;

class CSSVariableReferenceValue final : public nsISupports,
                                        public nsWrapperCache {
 public:
  explicit CSSVariableReferenceValue(nsCOMPtr<nsISupports> aParent);

  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(CSSVariableReferenceValue)

  nsISupports* GetParentObject() const;

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSVariableReferenceValue Web IDL declarations

  static already_AddRefed<CSSVariableReferenceValue> Constructor(
      const GlobalObject& aGlobal, const nsACString& aVariable,
      CSSUnparsedValue* aFallback, ErrorResult& aRv);

  void GetVariable(nsCString& aRetVal) const;

  void SetVariable(const nsACString& aArg, ErrorResult& aRv);

  CSSUnparsedValue* GetFallback() const;

  // end of CSSVariableReferenceValue Web IDL declarations

 private:
  virtual ~CSSVariableReferenceValue() = default;

  nsCOMPtr<nsISupports> mParent;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSVARIABLEREFERENCEVALUE_H_
