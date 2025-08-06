/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/CSSMozDocumentRule.h"
#include "mozilla/dom/CSSMozDocumentRuleBinding.h"

#include "js/RegExpFlags.h"
#include "mozilla/dom/BrowsingContext.h"
#include "mozilla/ServoBindings.h"
#include "nsContentUtils.h"
#include "nsHTMLDocument.h"

namespace mozilla::dom {

using namespace mozilla::css;

/* virtual */
JSObject* CSSMozDocumentRule::WrapObject(JSContext* aCx,
                                         JS::Handle<JSObject*> aGivenProto) {
  return CSSMozDocumentRule_Binding::Wrap(aCx, this, aGivenProto);
}

bool CSSMozDocumentRule::Match(const Document* aDoc, nsIURI* aDocURI,
                               const nsACString& aDocURISpec,
                               const nsACString& aPattern,
                               DocumentMatchingFunction aMatchingFunction) {
  switch (aMatchingFunction) {
    case DocumentMatchingFunction::MediaDocument: {
      auto kind = aDoc->MediaDocumentKind();
      if (aPattern.EqualsLiteral("all")) {
        return kind != Document::MediaDocumentKind::NotMedia;
      }
      MOZ_ASSERT(aPattern.EqualsLiteral("image") ||
                 aPattern.EqualsLiteral("video"));
      switch (kind) {
        case Document::MediaDocumentKind::NotMedia:
          return false;
        case Document::MediaDocumentKind::Image:
          return aPattern.EqualsLiteral("image");
        case Document::MediaDocumentKind::Video:
          return aPattern.EqualsLiteral("video");
      }
      MOZ_ASSERT_UNREACHABLE("Unknown media document kind");
      return false;
    }
    case DocumentMatchingFunction::URL:
      return aDocURISpec == aPattern;
    case DocumentMatchingFunction::URLPrefix:
      return StringBeginsWith(aDocURISpec, aPattern);
    case DocumentMatchingFunction::Domain: {
      nsAutoCString host;
      if (aDocURI) {
        aDocURI->GetHost(host);
      }
      int32_t lenDiff = host.Length() - aPattern.Length();
      if (lenDiff == 0) {
        return host == aPattern;
      }
      return StringEndsWith(host, aPattern) && host.CharAt(lenDiff - 1) == '.';
    }
    case DocumentMatchingFunction::RegExp: {
      // Using JS::RegExpFlag::Unicode to allow patterns containing for example
      // [^/].
      return nsContentUtils::IsPatternMatching(
                 NS_ConvertUTF8toUTF16(aDocURISpec),
                 NS_ConvertUTF8toUTF16(aPattern), aDoc,
                 /* aHasMultiple = */ false, JS::RegExpFlag::Unicode)
          .valueOr(false);
    }
    case DocumentMatchingFunction::PlainTextDocument:
      return aDoc->IsHTMLOrXHTML() && aDoc->AsHTMLDocument()->IsPlainText();
    case DocumentMatchingFunction::UnobservableDocument: {
      const BrowsingContext* bc = aDoc->GetBrowsingContext();
      return bc && bc->IsTop() && !bc->HasOpener();
    }
  }
  MOZ_ASSERT_UNREACHABLE("Unknown matching function");
  return false;
}

CSSMozDocumentRule::CSSMozDocumentRule(RefPtr<StyleDocumentRule> aRawRule,
                                       StyleSheet* aSheet,
                                       css::Rule* aParentRule, uint32_t aLine,
                                       uint32_t aColumn)
    : css::ConditionRule(aSheet, aParentRule, aLine, aColumn),
      mRawRule(std::move(aRawRule)) {}

NS_IMPL_ADDREF_INHERITED(CSSMozDocumentRule, css::ConditionRule)
NS_IMPL_RELEASE_INHERITED(CSSMozDocumentRule, css::ConditionRule)

// QueryInterface implementation for MozDocumentRule
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(CSSMozDocumentRule)
NS_INTERFACE_MAP_END_INHERITING(css::ConditionRule)

#ifdef DEBUG
/* virtual */
void CSSMozDocumentRule::List(FILE* out, int32_t aIndent) const {
  nsAutoCString str;
  for (int32_t i = 0; i < aIndent; i++) {
    str.AppendLiteral("  ");
  }
  Servo_DocumentRule_Debug(mRawRule, &str);
  fprintf_stderr(out, "%s\n", str.get());
}
#endif

void CSSMozDocumentRule::SetRawAfterClone(RefPtr<StyleDocumentRule> aRaw) {
  mRawRule = std::move(aRaw);
  css::ConditionRule::DidSetRawAfterClone();
}

already_AddRefed<StyleLockedCssRules>
CSSMozDocumentRule::GetOrCreateRawRules() {
  return Servo_DocumentRule_GetRules(mRawRule).Consume();
}

StyleCssRuleType CSSMozDocumentRule::Type() const {
  return StyleCssRuleType::Document;
}

void CSSMozDocumentRule::GetConditionText(nsACString& aConditionText) {
  Servo_DocumentRule_GetConditionText(mRawRule, &aConditionText);
}

/* virtual */
void CSSMozDocumentRule::GetCssText(nsACString& aCssText) const {
  Servo_DocumentRule_GetCssText(mRawRule, &aCssText);
}

/* virtual */
size_t CSSMozDocumentRule::SizeOfIncludingThis(
    MallocSizeOf aMallocSizeOf) const {
  // TODO Implement this!
  return aMallocSizeOf(this);
}

}  // namespace mozilla::dom
