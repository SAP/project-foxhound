/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSAppearanceBaseRule.h"

#include "mozilla/ServoBindings.h"
#include "mozilla/dom/CSSAppearanceBaseRuleBinding.h"

namespace mozilla::dom {

NS_IMPL_ISUPPORTS_CYCLE_COLLECTION_INHERITED_0(CSSAppearanceBaseRule,
                                               css::GroupRule)

#ifdef DEBUG
void CSSAppearanceBaseRule::List(FILE* out, int32_t aIndent) const {
  nsAutoCString str;
  for (int32_t i = 0; i < aIndent; i++) {
    str.AppendLiteral("  ");
  }
  Servo_AppearanceBaseRule_Debug(mRawRule, &str);
  fprintf_stderr(out, "%s\n", str.get());
}
#endif

StyleCssRuleType CSSAppearanceBaseRule::Type() const {
  return StyleCssRuleType::AppearanceBase;
}

already_AddRefed<StyleLockedCssRules>
CSSAppearanceBaseRule::GetOrCreateRawRules() {
  return Servo_AppearanceBaseRule_GetRules(mRawRule).Consume();
}

void CSSAppearanceBaseRule::GetCssText(nsACString& aCssText) const {
  Servo_AppearanceBaseRule_GetCssText(mRawRule.get(), &aCssText);
}

JSObject* CSSAppearanceBaseRule::WrapObject(JSContext* aCx,
                                            JS::Handle<JSObject*> aGivenProto) {
  return CSSAppearanceBaseRule_Binding::Wrap(aCx, this, aGivenProto);
}

}  // namespace mozilla::dom
