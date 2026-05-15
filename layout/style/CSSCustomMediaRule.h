/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_CSSCustomMediaRule_h
#define mozilla_dom_CSSCustomMediaRule_h

#include "mozilla/ServoBindingTypes.h"
#include "mozilla/css/Rule.h"
#include "mozilla/dom/CSSCustomMediaRuleBindingFwd.h"

namespace mozilla::dom {

class CSSCustomMediaRule final : public css::Rule {
 public:
  CSSCustomMediaRule(RefPtr<StyleCustomMediaRule> aRawRule, StyleSheet* aSheet,
                     css::Rule* aParentRule, uint32_t aLine, uint32_t aColumn);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(CSSCustomMediaRule, css::Rule)

  void DropSheetReference() final;
  bool IsCCLeaf() const final;

  StyleCustomMediaRule* Raw() const { return mRawRule; }
  void SetRawAfterClone(RefPtr<StyleCustomMediaRule>);

  // WebIDL interfaces
  StyleCssRuleType Type() const final;
  void GetCssText(nsACString& aCssText) const final;

  void GetName(nsACString&) const;
  void GetQuery(OwningCustomMediaQuery&);

  size_t SizeOfIncludingThis(MallocSizeOf aMallocSizeOf) const final;

#ifdef DEBUG
  void List(FILE* out = stdout, int32_t aIndent = 0) const final;
#endif

  JSObject* WrapObject(JSContext* aCx, JS::Handle<JSObject*> aGivenProto) final;

 private:
  ~CSSCustomMediaRule();

  RefPtr<StyleCustomMediaRule> mRawRule;
  RefPtr<dom::MediaList> mMediaList;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_CSSCustomMediaRule_h
