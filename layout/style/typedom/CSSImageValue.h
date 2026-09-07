/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_CSSIMAGEVALUE_H_
#define LAYOUT_STYLE_TYPEDOM_CSSIMAGEVALUE_H_

#include "js/TypeDecls.h"
#include "mozilla/NotNull.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/CSSStyleValue.h"
#include "nsStringFwd.h"

template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

struct CSSPropertyId;
struct StyleImageValue;

namespace dom {

class CSSImageValue final : public CSSStyleValue {
 public:
  explicit CSSImageValue(nsCOMPtr<nsISupports> aParent,
                         const StyleImageValue& aImageValue);

  static RefPtr<CSSImageValue> Create(nsCOMPtr<nsISupports> aParent,
                                      const StyleImageValue& aImageValue);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  // start of CSSImageValue Web IDL declarations

  // end of CSSImageValue Web IDL declarations

  void ToCssTextWithProperty(const CSSPropertyId& aPropertyId,
                             nsACString& aDest) const;

 private:
  virtual ~CSSImageValue() = default;

  const NotNull<UniquePtr<StyleImageValue>> mImageValue;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_CSSIMAGEVALUE_H_
