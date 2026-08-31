/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef CSSViewTransitionRule_h_
#define CSSViewTransitionRule_h_

#include "mozilla/ServoBindingTypes.h"
#include "mozilla/css/Rule.h"

namespace mozilla::dom {

class CSSViewTransitionRule final : public css::Rule {
 public:
  CSSViewTransitionRule(RefPtr<StyleViewTransitionRule> aRawRule,
                        StyleSheet* aSheet, css::Rule* aParentRule,
                        uint32_t aLine, uint32_t aColumn)
      : css::Rule(aSheet, aParentRule, aLine, aColumn),
        mRawRule(std::move(aRawRule)) {}

  NS_DECL_ISUPPORTS_INHERITED

  bool IsCCLeaf() const final { return css::Rule::IsCCLeaf(); }

#ifdef DEBUG
  void List(FILE* out = stdout, int32_t aIndent = 0) const final;
#endif

  StyleViewTransitionRule* Raw() const { return mRawRule; }
  void SetRawAfterClone(RefPtr<StyleViewTransitionRule> aRaw) {
    mRawRule = std::move(aRaw);
  }

  // WebIDL interface
  StyleCssRuleType Type() const final;
  void GetCssText(nsACString& aCssText) const final;

  void GetNavigation(nsACString& aNavigation) const;
  void GetTypes(nsTArray<nsCString>& aTypes) const;

  size_t SizeOfIncludingThis(MallocSizeOf aMallocSizeOf) const final {
    return aMallocSizeOf(this);
  }
  JSObject* WrapObject(JSContext*, JS::Handle<JSObject*>) override;

 private:
  ~CSSViewTransitionRule() = default;

  RefPtr<StyleViewTransitionRule> mRawRule;
};

}  // namespace mozilla::dom

#endif
