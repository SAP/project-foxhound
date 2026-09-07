/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_CSSCounterStyleRule_h
#define mozilla_CSSCounterStyleRule_h

#include "mozilla/ServoBindingTypes.h"
#include "mozilla/css/Rule.h"
#include "nsCSSProps.h"

struct StyleLockedCounterStyleRule;

namespace mozilla::dom {

class CSSCounterStyleRule final : public css::Rule {
 public:
  CSSCounterStyleRule(already_AddRefed<StyleLockedCounterStyleRule> aRawRule,
                      StyleSheet* aSheet, css::Rule* aParentRule,
                      uint32_t aLine, uint32_t aColumn)
      : css::Rule(aSheet, aParentRule, aLine, aColumn),
        mRawRule(std::move(aRawRule)) {}

 private:
  CSSCounterStyleRule(const CSSCounterStyleRule& aCopy) = delete;
  ~CSSCounterStyleRule() = default;

  template <typename Func>
  void ModifyRule(Func);

 public:
  bool IsCCLeaf() const final;

  const StyleLockedCounterStyleRule* Raw() const { return mRawRule.get(); }
  void SetRawAfterClone(RefPtr<StyleLockedCounterStyleRule>);

#ifdef DEBUG
  void List(FILE* out = stdout, int32_t aIndent = 0) const final;
#endif

  // WebIDL interface
  StyleCssRuleType Type() const override;
  void GetCssText(nsACString& aCssText) const override;
  void GetName(nsAString& aName);
  void SetName(const nsAString& aName);
  void GetDescriptor(CounterStyleDescriptorId aDesc, nsACString& aResult);
  void SetDescriptor(CounterStyleDescriptorId aDesc, const nsACString& aValue);

  size_t SizeOfIncludingThis(MallocSizeOf) const final;

  JSObject* WrapObject(JSContext* aCx, JS::Handle<JSObject*> aGivenProto) final;

 private:
  RefPtr<StyleLockedCounterStyleRule> mRawRule;
};

}  // namespace mozilla::dom

#endif  // mozilla_CSSCounterStyleRule_h
