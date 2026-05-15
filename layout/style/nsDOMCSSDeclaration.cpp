/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* base class for DOM objects for element.style and cssStyleRule.style */

#include "nsDOMCSSDeclaration.h"

#include "mozAutoDocUpdate.h"
#include "mozilla/DeclarationBlock.h"
#include "mozilla/ProfilerLabels.h"
#include "mozilla/StyleSheetInlines.h"
#include "mozilla/css/Rule.h"
#include "mozilla/dom/BindingUtils.h"
#include "mozilla/dom/CSSStylePropertiesBinding.h"
#include "nsCOMPtr.h"
#include "nsCSSProps.h"
#include "nsQueryObject.h"

using namespace mozilla;
using namespace mozilla::dom;

nsDOMCSSDeclaration::~nsDOMCSSDeclaration() = default;

/* virtual */
JSObject* nsDOMCSSDeclaration::WrapObject(JSContext* aCx,
                                          JS::Handle<JSObject*> aGivenProto) {
  return CSSStyleProperties_Binding::Wrap(aCx, this, aGivenProto);
}

NS_IMPL_QUERY_INTERFACE(nsDOMCSSDeclaration, nsICSSDeclaration)

void nsDOMCSSDeclaration::GetPropertyValue(const NonCustomCSSPropertyId aPropId,
                                           nsACString& aValue) {
  MOZ_ASSERT(aPropId != eCSSProperty_UNKNOWN,
             "Should never pass eCSSProperty_UNKNOWN around");
  MOZ_ASSERT(aValue.IsEmpty());

  if (DeclarationBlock* decl =
          GetOrCreateCSSDeclaration(Operation::Read, nullptr)) {
    decl->GetPropertyValueById(aPropId, aValue);
  }
}

void nsDOMCSSDeclaration::SetPropertyValue(const NonCustomCSSPropertyId aPropId,
                                           const nsACString& aValue,
                                           nsIPrincipal* aSubjectPrincipal,
                                           ErrorResult& aRv) {
  if (IsReadOnly()) {
    return;
  }

  if (aValue.IsEmpty()) {
    // If the new value of the property is an empty string we remove the
    // property.
    return RemovePropertyInternal(aPropId, aRv);
  }

  aRv = ParsePropertyValue(aPropId, aValue, false, aSubjectPrincipal);
}

void nsDOMCSSDeclaration::GetCssText(nsACString& aCssText) {
  MOZ_ASSERT(aCssText.IsEmpty());

  if (auto* decl = GetOrCreateCSSDeclaration(Operation::Read, nullptr)) {
    decl->ToString(aCssText);
  }
}

void nsDOMCSSDeclaration::SetCssText(const nsACString& aCssText,
                                     nsIPrincipal* aSubjectPrincipal,
                                     ErrorResult& aRv) {
  if (IsReadOnly()) {
    return;
  }

  // We don't need to *do* anything with the old declaration, but we need
  // to ensure that it exists, or else SetCSSDeclaration may crash.
  RefPtr<DeclarationBlock> created;
  DeclarationBlock* olddecl =
      GetOrCreateCSSDeclaration(Operation::Modify, getter_AddRefs(created));
  if (!olddecl) {
    aRv.Throw(NS_ERROR_NOT_AVAILABLE);
    return;
  }

  // For nsDOMCSSAttributeDeclaration, SetCSSDeclaration will lead to
  // Attribute setting code, which leads in turn to BeginUpdate.  We
  // need to start the update now so that the old rule doesn't get used
  // between when we mutate the declaration and when we set the new
  // rule (see stack in bug 209575).
  mozAutoDocUpdate autoUpdate(DocToUpdate(), true);
  DeclarationBlockMutationClosure closure = {};
  MutationClosureData closureData;
  GetPropertyChangeClosure(&closure, &closureData);

  ParsingEnvironment servoEnv = GetParsingEnvironment(aSubjectPrincipal);
  if (!servoEnv.mUrlExtraData) {
    aRv.Throw(NS_ERROR_NOT_AVAILABLE);
    return;
  }

  // Need to special case closure calling here, since parsing css text
  // doesn't modify any existing declaration and that is why the callback isn't
  // called implicitly.
  if (closure.function && !closureData.mWasCalled) {
    closure.function(&closureData, eCSSProperty_UNKNOWN);
  }

  RefPtr<DeclarationBlock> newdecl = DeclarationBlock::FromCssText(
      aCssText, servoEnv.mUrlExtraData, servoEnv.mCompatMode, servoEnv.mLoader,
      servoEnv.mRuleType);

  aRv = SetCSSDeclaration(newdecl, &closureData);
}

uint32_t nsDOMCSSDeclaration::Length() {
  DeclarationBlock* decl = GetOrCreateCSSDeclaration(Operation::Read, nullptr);

  if (decl) {
    return decl->Count();
  }

  return 0;
}

void nsDOMCSSDeclaration::IndexedGetter(uint32_t aIndex, bool& aFound,
                                        nsACString& aPropName) {
  DeclarationBlock* decl = GetOrCreateCSSDeclaration(Operation::Read, nullptr);
  aFound = decl && decl->GetNthProperty(aIndex, aPropName);
}

void nsDOMCSSDeclaration::GetPropertyValue(const nsACString& aPropertyName,
                                           nsACString& aReturn) {
  MOZ_ASSERT(aReturn.IsEmpty());
  if (auto* decl = GetOrCreateCSSDeclaration(Operation::Read, nullptr)) {
    decl->GetPropertyValue(aPropertyName, aReturn);
  }
}

bool nsDOMCSSDeclaration::HasLonghandProperty(const nsACString& aPropertyName) {
  if (auto* decl = GetOrCreateCSSDeclaration(Operation::Read, nullptr)) {
    return Servo_DeclarationBlock_HasLonghandProperty(decl->Raw(),
                                                      &aPropertyName);
  }

  return false;
}

void nsDOMCSSDeclaration::GetPropertyPriority(const nsACString& aPropertyName,
                                              nsACString& aPriority) {
  MOZ_ASSERT(aPriority.IsEmpty());
  DeclarationBlock* decl = GetOrCreateCSSDeclaration(Operation::Read, nullptr);
  if (decl && decl->GetPropertyIsImportant(aPropertyName)) {
    aPriority.AssignLiteral("important");
  }
}

void nsDOMCSSDeclaration::SetProperty(const nsACString& aPropertyName,
                                      const nsACString& aValue,
                                      const nsACString& aPriority,
                                      nsIPrincipal* aSubjectPrincipal,
                                      ErrorResult& aRv) {
  if (IsReadOnly()) {
    return;
  }

  if (aValue.IsEmpty()) {
    // If the new value of the property is an empty string we remove the
    // property.
    // XXX this ignores the priority string, should it?
    return RemovePropertyInternal(aPropertyName, aRv);
  }

  // In the common (and fast) cases we can use the property id
  NonCustomCSSPropertyId propId = nsCSSProps::LookupProperty(aPropertyName);
  if (propId == eCSSProperty_UNKNOWN) {
    return;
  }

  bool important;
  if (aPriority.IsEmpty()) {
    important = false;
  } else if (aPriority.LowerCaseEqualsASCII("important")) {
    important = true;
  } else {
    // XXX silent failure?
    return;
  }

  if (propId == eCSSPropertyExtra_variable) {
    aRv = ParseCustomPropertyValue(aPropertyName, aValue, important,
                                   aSubjectPrincipal);
    return;
  }
  aRv = ParsePropertyValue(propId, aValue, important, aSubjectPrincipal);
}

void nsDOMCSSDeclaration::RemoveProperty(const nsACString& aPropertyName,
                                         nsACString& aReturn,
                                         ErrorResult& aRv) {
  if (IsReadOnly()) {
    return;
  }
  GetPropertyValue(aPropertyName, aReturn);
  RemovePropertyInternal(aPropertyName, aRv);
}

/* static */ nsDOMCSSDeclaration::ParsingEnvironment
nsDOMCSSDeclaration::GetParsingEnvironmentForRule(const css::Rule* aRule,
                                                  StyleCssRuleType aRuleType) {
  if (!aRule) {
    return {};
  }

  MOZ_ASSERT(aRule->Type() == aRuleType);
  MOZ_ASSERT(aRuleType != StyleCssRuleType::NestedDeclarations);

  StyleSheet* sheet = aRule->GetStyleSheet();
  if (!sheet) {
    return {};
  }

  if (Document* document = sheet->GetAssociatedDocument()) {
    return {
        sheet->URLData(),
        document->GetCompatibilityMode(),
        document->GetExistingCSSLoader(),
        aRuleType,
    };
  }

  return {
      sheet->URLData(),
      eCompatibility_FullStandards,
      nullptr,
      aRuleType,
  };
}

template <typename Func>
nsresult nsDOMCSSDeclaration::ModifyDeclaration(
    nsIPrincipal* aSubjectPrincipal, MutationClosureData* aClosureData,
    Func aFunc) {
  RefPtr<DeclarationBlock> created;
  DeclarationBlock* olddecl =
      GetOrCreateCSSDeclaration(Operation::Modify, getter_AddRefs(created));
  if (!olddecl) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  // For nsDOMCSSAttributeDeclaration, SetCSSDeclaration will lead to
  // Attribute setting code, which leads in turn to BeginUpdate.  We
  // need to start the update now so that the old rule doesn't get used
  // between when we mutate the declaration and when we set the new
  // rule (see stack in bug 209575).
  mozAutoDocUpdate autoUpdate(DocToUpdate(), true);
  RefPtr<DeclarationBlock> decl = olddecl->EnsureMutable();

  bool changed;
  ParsingEnvironment servoEnv = GetParsingEnvironment(aSubjectPrincipal);
  if (!servoEnv.mUrlExtraData) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  changed = aFunc(decl, servoEnv);

  if (!changed) {
    // Parsing failed -- but we don't throw an exception for that.
    return NS_OK;
  }

  return SetCSSDeclaration(decl, aClosureData);
}

nsresult nsDOMCSSDeclaration::ParsePropertyValue(
    const NonCustomCSSPropertyId aPropId, const nsACString& aPropValue,
    bool aIsImportant, nsIPrincipal* aSubjectPrincipal) {
  AUTO_PROFILER_LABEL_CATEGORY_PAIR_RELEVANT_FOR_JS(LAYOUT_CSSParsing);

  if (IsReadOnly()) {
    return NS_OK;
  }

  DeclarationBlockMutationClosure closure = {};
  MutationClosureData closureData;
  GetPropertyChangeClosure(&closure, &closureData);

  return ModifyDeclaration(
      aSubjectPrincipal, &closureData,
      [&](DeclarationBlock* decl, ParsingEnvironment& env) {
        return Servo_DeclarationBlock_SetPropertyById(
            decl->Raw(), aPropId, &aPropValue, aIsImportant, env.mUrlExtraData,
            StyleParsingMode::DEFAULT, env.mCompatMode, env.mLoader,
            env.mRuleType, closure);
      });
}

nsresult nsDOMCSSDeclaration::ParseCustomPropertyValue(
    const nsACString& aPropertyName, const nsACString& aPropValue,
    bool aIsImportant, nsIPrincipal* aSubjectPrincipal) {
  MOZ_ASSERT(nsCSSProps::IsCustomPropertyName(aPropertyName));

  if (IsReadOnly()) {
    return NS_OK;
  }

  DeclarationBlockMutationClosure closure = {};
  MutationClosureData closureData;
  GetPropertyChangeClosure(&closure, &closureData);

  return ModifyDeclaration(
      aSubjectPrincipal, &closureData,
      [&](DeclarationBlock* decl, ParsingEnvironment& env) {
        return Servo_DeclarationBlock_SetProperty(
            decl->Raw(), &aPropertyName, &aPropValue, aIsImportant,
            env.mUrlExtraData, StyleParsingMode::DEFAULT, env.mCompatMode,
            env.mLoader, env.mRuleType, closure);
      });
}

void nsDOMCSSDeclaration::RemovePropertyInternal(NonCustomCSSPropertyId aPropId,
                                                 ErrorResult& aRv) {
  DeclarationBlock* olddecl =
      GetOrCreateCSSDeclaration(Operation::RemoveProperty, nullptr);
  if (IsReadOnly()) {
    return;
  }

  if (!olddecl) {
    return;  // no decl, so nothing to remove
  }

  // For nsDOMCSSAttributeDeclaration, SetCSSDeclaration will lead to
  // Attribute setting code, which leads in turn to BeginUpdate.  We
  // need to start the update now so that the old rule doesn't get used
  // between when we mutate the declaration and when we set the new
  // rule (see stack in bug 209575).
  mozAutoDocUpdate autoUpdate(DocToUpdate(), true);

  DeclarationBlockMutationClosure closure = {};
  MutationClosureData closureData;
  GetPropertyChangeClosure(&closure, &closureData);

  RefPtr<DeclarationBlock> decl = olddecl->EnsureMutable();
  if (!decl->RemovePropertyById(aPropId, closure)) {
    return;
  }
  aRv = SetCSSDeclaration(decl, &closureData);
}

void nsDOMCSSDeclaration::RemovePropertyInternal(
    const nsACString& aPropertyName, ErrorResult& aRv) {
  if (IsReadOnly()) {
    return;
  }

  DeclarationBlock* olddecl =
      GetOrCreateCSSDeclaration(Operation::RemoveProperty, nullptr);
  if (!olddecl) {
    return;  // no decl, so nothing to remove
  }

  // For nsDOMCSSAttributeDeclaration, SetCSSDeclaration will lead to
  // Attribute setting code, which leads in turn to BeginUpdate.  We
  // need to start the update now so that the old rule doesn't get used
  // between when we mutate the declaration and when we set the new
  // rule (see stack in bug 209575).
  mozAutoDocUpdate autoUpdate(DocToUpdate(), true);

  DeclarationBlockMutationClosure closure = {};
  MutationClosureData closureData;
  GetPropertyChangeClosure(&closure, &closureData);

  RefPtr<DeclarationBlock> decl = olddecl->EnsureMutable();
  if (!decl->RemoveProperty(aPropertyName, closure)) {
    return;
  }
  aRv = SetCSSDeclaration(decl, &closureData);
}
