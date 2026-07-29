/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef CSSAppearanceBaseRule_h_
#define CSSAppearanceBaseRule_h_

#include "mozilla/ServoBindingTypes.h"
#include "mozilla/css/GroupRule.h"

namespace mozilla::dom {

class CSSAppearanceBaseRule final : public css::GroupRule {
 public:
  CSSAppearanceBaseRule(RefPtr<StyleAppearanceBaseRule> aRawRule,
                        StyleSheet* aSheet, css::Rule* aParentRule,
                        uint32_t aLine, uint32_t aColumn)
      : css::GroupRule(aSheet, aParentRule, aLine, aColumn),
        mRawRule(std::move(aRawRule)) {}

  NS_DECL_ISUPPORTS_INHERITED

#ifdef DEBUG
  void List(FILE* out = stdout, int32_t aIndent = 0) const final;
#endif

  StyleAppearanceBaseRule* Raw() const { return mRawRule; }
  void SetRawAfterClone(RefPtr<StyleAppearanceBaseRule> aRaw) {
    mRawRule = std::move(aRaw);
    css::GroupRule::DidSetRawAfterClone();
  }

  already_AddRefed<StyleLockedCssRules> GetOrCreateRawRules() final;

  // WebIDL interface
  StyleCssRuleType Type() const final;
  void GetCssText(nsACString& aCssText) const final;

  size_t SizeOfIncludingThis(MallocSizeOf aMallocSizeOf) const override {
    return aMallocSizeOf(this) + SizeOfExcludingThis(aMallocSizeOf);
  }
  JSObject* WrapObject(JSContext*, JS::Handle<JSObject*>) override;

 private:
  ~CSSAppearanceBaseRule() = default;

  RefPtr<StyleAppearanceBaseRule> mRawRule;
};

}  // namespace mozilla::dom

#endif
