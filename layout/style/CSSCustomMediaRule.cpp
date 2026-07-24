/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSCustomMediaRule.h"

#include "mozilla/DeclarationBlock.h"
#include "mozilla/ServoBindings.h"
#include "mozilla/dom/CSSCustomMediaRuleBinding.h"
#include "mozilla/dom/CSSCustomMediaRuleBindingFwd.h"
#include "mozilla/dom/MediaList.h"

namespace mozilla::dom {

CSSCustomMediaRule::CSSCustomMediaRule(RefPtr<StyleCustomMediaRule> aRawRule,
                                       StyleSheet* aSheet,
                                       css::Rule* aParentRule, uint32_t aLine,
                                       uint32_t aColumn)
    : css::Rule(aSheet, aParentRule, aLine, aColumn),
      mRawRule(std::move(aRawRule)) {}

CSSCustomMediaRule::~CSSCustomMediaRule() {
  if (mMediaList) {
    mMediaList->SetStyleSheet(nullptr);
  }
}

NS_IMPL_ADDREF_INHERITED(CSSCustomMediaRule, Rule)
NS_IMPL_RELEASE_INHERITED(CSSCustomMediaRule, Rule)

NS_IMPL_CYCLE_COLLECTION_CLASS(CSSCustomMediaRule)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(CSSCustomMediaRule)
NS_INTERFACE_MAP_END_INHERITING(Rule)

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN_INHERITED(CSSCustomMediaRule, css::Rule)
  if (tmp->mMediaList) {
    tmp->mMediaList->SetStyleSheet(nullptr);
    tmp->mMediaList = nullptr;
  }
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN_INHERITED(CSSCustomMediaRule, css::Rule)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mMediaList)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

bool CSSCustomMediaRule::IsCCLeaf() const {
  return Rule::IsCCLeaf() && !mMediaList;
}

/* virtual */
void CSSCustomMediaRule::DropSheetReference() {
  if (mMediaList) {
    mMediaList->SetStyleSheet(nullptr);
  }
  Rule::DropSheetReference();
}

void CSSCustomMediaRule::SetRawAfterClone(RefPtr<StyleCustomMediaRule> aRaw) {
  mRawRule = std::move(aRaw);
  if (mMediaList) {
    mMediaList->SetRawAfterClone(
        Servo_CustomMediaRule_GetCondition(mRawRule, nullptr).Consume());
    mMediaList->SetStyleSheet(nullptr);
    mMediaList->SetStyleSheet(GetStyleSheet());
  }
}

// WebIDL interfaces
StyleCssRuleType CSSCustomMediaRule::Type() const {
  return StyleCssRuleType::CustomMedia;
}

// CSSRule implementation

void CSSCustomMediaRule::GetCssText(nsACString& aCssText) const {
  Servo_CustomMediaRule_GetCssText(mRawRule, &aCssText);
}

void CSSCustomMediaRule::GetName(nsACString& aName) const {
  auto* name = Servo_CustomMediaRule_GetName(mRawRule);
  name->ToUTF8String(aName);
}

void CSSCustomMediaRule::GetQuery(OwningCustomMediaQuery& aQuery) {
  if (mMediaList) {
    aQuery.SetAsMediaList() = mMediaList;
    return;
  }
  bool value = false;
  RefPtr rawMediaList =
      Servo_CustomMediaRule_GetCondition(mRawRule, &value).Consume();
  if (!rawMediaList) {
    aQuery.SetAsBoolean() = value;
    return;
  }

  mMediaList = new MediaList(rawMediaList.forget());
  mMediaList->SetStyleSheet(GetStyleSheet());
  aQuery.SetAsMediaList() = mMediaList;
}

size_t CSSCustomMediaRule::SizeOfIncludingThis(
    MallocSizeOf aMallocSizeOf) const {
  // TODO Implement this!
  return aMallocSizeOf(this);
}

#ifdef DEBUG
void CSSCustomMediaRule::List(FILE* out, int32_t aIndent) const {
  nsAutoCString str;
  for (int32_t i = 0; i < aIndent; i++) {
    str.AppendLiteral("  ");
  }
  Servo_CustomMediaRule_Debug(mRawRule, &str);
  fprintf_stderr(out, "%s\n", str.get());
}
#endif

JSObject* CSSCustomMediaRule::WrapObject(JSContext* aCx,
                                         JS::Handle<JSObject*> aGivenProto) {
  return CSSCustomMediaRule_Binding::Wrap(aCx, this, aGivenProto);
}

}  // namespace mozilla::dom
