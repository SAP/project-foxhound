/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSNUMERICARRAY_H_
#define LAYOUT_STYLE_TYPEDOM_CSSNUMERICARRAY_H_

#include <stdint.h>

#include "js/TypeDecls.h"
#include "mozilla/dom/CSSNumericValueBindingFwd.h"
#include "nsCOMPtr.h"
#include "nsISupports.h"
#include "nsISupportsImpl.h"
#include "nsTArray.h"
#include "nsWrapperCache.h"

namespace mozilla {

namespace dom {

class CSSNumericArray final : public nsISupports, public nsWrapperCache {
 public:
  CSSNumericArray(nsCOMPtr<nsISupports> aParent,
                  nsTArray<RefPtr<CSSNumericValue>> aValues);

  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(CSSNumericArray)

  nsISupports* GetParentObject() const;

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSNumericArray Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om-1/#dom-cssnumericarray-length
  uint32_t Length() const;

  // https://drafts.css-houdini.org/css-typed-om-1/#cssnumericarray-indexed-property-getter
  CSSNumericValue* IndexedGetter(uint32_t aIndex, bool& aFound);

  // end of CSSNumericArray Web IDL declarations

  const nsTArray<RefPtr<CSSNumericValue>>& GetValues() const { return mValues; }

 private:
  virtual ~CSSNumericArray() = default;

  nsCOMPtr<nsISupports> mParent;
  nsTArray<RefPtr<CSSNumericValue>> mValues;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSNUMERICARRAY_H_
