/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_STYLE_TYPEDOM_STYLEPROPERTYMAP_H_
#define LAYOUT_STYLE_TYPEDOM_STYLEPROPERTYMAP_H_

#include "js/TypeDecls.h"
#include "mozilla/MemoryReporting.h"
#include "mozilla/dom/StylePropertyMapReadOnly.h"
#include "nsStringFwd.h"

template <class T>
class nsCOMPtr;
class nsISupports;

namespace mozilla {

class ErrorResult;

namespace dom {

class OwningCSSStyleValueOrUTF8String;
template <typename T>
class Sequence;

class StylePropertyMap final : public StylePropertyMapReadOnly {
 public:
  StylePropertyMap(Element* aElement, bool aComputed);
  explicit StylePropertyMap(CSSStyleRule* aRule);

  JSObject* WrapObject(JSContext*, JS::Handle<JSObject*> aGivenProto) override;

  // start of StylePropertyMap Web IDL declarations

  // https://drafts.css-houdini.org/css-typed-om/#dom-stylepropertymap-set
  void Set(const nsACString& aProperty,
           const Sequence<OwningCSSStyleValueOrUTF8String>& aValues,
           ErrorResult& aRv);

  void Append(const nsACString& aProperty,
              const Sequence<OwningCSSStyleValueOrUTF8String>& aValues,
              ErrorResult& aRv);

  void Delete(const nsACString& aProperty, ErrorResult& aRv);

  void Clear();

  // end of StylePropertyMap Web IDL declarations

  size_t SizeOfIncludingThis(MallocSizeOf aMallocSizeOf) const;

 private:
  virtual ~StylePropertyMap() = default;
};

}  // namespace dom
}  // namespace mozilla

#endif  // LAYOUT_STYLE_TYPEDOM_STYLEPROPERTYMAP_H_
