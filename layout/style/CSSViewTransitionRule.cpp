/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSViewTransitionRule.h"

#include "mozilla/ServoBindings.h"
#include "mozilla/dom/CSSViewTransitionRuleBinding.h"

namespace mozilla::dom {

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSViewTransitionRule, css::Rule)

#ifdef DEBUG
void CSSViewTransitionRule::List(FILE* out, int32_t aIndent) const {
  nsAutoCString str;
  for (int32_t i = 0; i < aIndent; i++) {
    str.AppendLiteral("  ");
  }
  Servo_ViewTransitionRule_Debug(mRawRule, &str);
  fprintf_stderr(out, "%s\n", str.get());
}
#endif

StyleCssRuleType CSSViewTransitionRule::Type() const {
  return StyleCssRuleType::ViewTransition;
}

void CSSViewTransitionRule::GetCssText(nsACString& aCssText) const {
  Servo_ViewTransitionRule_GetCssText(mRawRule.get(), &aCssText);
}

void CSSViewTransitionRule::GetNavigation(nsACString& aNavigation) const {
  Servo_ViewTransitionRule_GetNavigation(mRawRule.get(), &aNavigation);
}

void CSSViewTransitionRule::GetTypes(nsTArray<nsCString>& aTypes) const {
  AutoTArray<nsAtom*, 8> atoms;
  Servo_ViewTransitionRule_GetTypes(mRawRule.get(), &atoms);
  aTypes.SetCapacity(atoms.Length());
  for (auto* atom : atoms) {
    atom->ToUTF8String(*aTypes.AppendElement());
  }
}

JSObject* CSSViewTransitionRule::WrapObject(JSContext* aCx,
                                            JS::Handle<JSObject*> aGivenProto) {
  return CSSViewTransitionRule_Binding::Wrap(aCx, this, aGivenProto);
}

}  // namespace mozilla::dom
