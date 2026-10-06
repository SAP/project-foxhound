/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSContainerRule.h"

#include "mozilla/ServoBindings.h"
#include "mozilla/ServoStyleSet.h"
#include "mozilla/css/GroupRule.h"
#include "mozilla/dom/CSSContainerRuleBinding.h"
#include "mozilla/dom/DocumentInlines.h"

using namespace mozilla::css;

namespace mozilla::dom {

CSSContainerRule::CSSContainerRule(RefPtr<StyleContainerRule> aRawRule,
                                   StyleSheet* aSheet, css::Rule* aParentRule,
                                   uint32_t aLine, uint32_t aColumn)
    : css::ConditionRule(aSheet, aParentRule, aLine, aColumn),
      mRawRule(std::move(aRawRule)) {}

CSSContainerRule::~CSSContainerRule() = default;

NS_IMPL_ADDREF_INHERITED(CSSContainerRule, ConditionRule)
NS_IMPL_RELEASE_INHERITED(CSSContainerRule, ConditionRule)

// QueryInterface implementation for ContainerRule
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(CSSContainerRule)
NS_INTERFACE_MAP_END_INHERITING(ConditionRule)

#ifdef DEBUG
/* virtual */
void CSSContainerRule::List(FILE* out, int32_t aIndent) const {
  nsAutoCString str;
  for (int32_t i = 0; i < aIndent; i++) {
    str.AppendLiteral("  ");
  }
  Servo_ContainerRule_Debug(mRawRule, &str);
  fprintf_stderr(out, "%s\n", str.get());
}
#endif

already_AddRefed<StyleLockedCssRules> CSSContainerRule::GetOrCreateRawRules() {
  return Servo_ContainerRule_GetRules(mRawRule).Consume();
}

StyleCssRuleType CSSContainerRule::Type() const {
  return StyleCssRuleType::Container;
}

void CSSContainerRule::GetConditionText(nsACString& aConditionText) {
  Servo_ContainerRule_GetConditionText(mRawRule, &aConditionText);
}

/* virtual */
void CSSContainerRule::GetCssText(nsACString& aCssText) const {
  Servo_ContainerRule_GetCssText(mRawRule, &aCssText);
}

void CSSContainerRule::GetContainerName(nsACString& aName) const {
  const size_t n = Servo_ContainerRule_GetConditionsLength(mRawRule);
  if (n == 1) {
    Servo_ContainerRule_GetContainerName(mRawRule, 0, &aName);
  }
}

void CSSContainerRule::GetContainerQuery(nsACString& aQuery) const {
  const size_t n = Servo_ContainerRule_GetConditionsLength(mRawRule);
  if (n == 1) {
    Servo_ContainerRule_GetContainerQuery(mRawRule, 0, &aQuery);
  }
}

void CSSContainerRule::GetConditions(
    nsTArray<CSSContainerCondition>& aConditions) const {
  const size_t n = Servo_ContainerRule_GetConditionsLength(mRawRule);
  aConditions.SetCapacity(n);
  for (size_t i = 0; i < n; i++) {
    CSSContainerCondition& condition = *aConditions.AppendElement();
    Servo_ContainerRule_GetContainerName(mRawRule, i, &condition.mName);
    Servo_ContainerRule_GetContainerQuery(mRawRule, i, &condition.mQuery);
  }
}

Element* CSSContainerRule::QueryContainerFor(const Element& aElement,
                                             size_t aConditionIndex) const {
  return const_cast<Element*>(Servo_ContainerRule_QueryContainerFor(
      mRawRule, &aElement, aConditionIndex));
}

bool CSSContainerRule::QueryConditionMatchesElement(
    const Element& aElement, size_t aConditionIndex) const {
  RefPtr<Document> doc = aElement.GetComposedDoc();
  if (!doc) {
    return false;
  }
  doc->FlushPendingNotifications(FlushType::Layout);

  return Servo_ContainerRule_QueryConditionMatchesElement(
      mRawRule, &aElement, aConditionIndex, doc->EnsureStyleSet().RawData());
}

void CSSContainerRule::SetRawAfterClone(RefPtr<StyleContainerRule> aRaw) {
  mRawRule = std::move(aRaw);
  css::ConditionRule::DidSetRawAfterClone();
}

/* virtual */
size_t CSSContainerRule::SizeOfIncludingThis(MallocSizeOf aMallocSizeOf) const {
  // TODO Implement this!
  return aMallocSizeOf(this);
}

/* virtual */
JSObject* CSSContainerRule::WrapObject(JSContext* aCx,
                                       JS::Handle<JSObject*> aGivenProto) {
  return CSSContainerRule_Binding::Wrap(aCx, this, aGivenProto);
}

}  // namespace mozilla::dom
