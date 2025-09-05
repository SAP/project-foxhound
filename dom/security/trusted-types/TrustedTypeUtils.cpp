/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/TrustedTypeUtils.h"

#include "mozilla/Maybe.h"
#include "mozilla/StaticPrefs_dom.h"

#include "js/RootingAPI.h"

#include "mozilla/ErrorResult.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/TrustedHTML.h"
#include "mozilla/dom/TrustedScript.h"
#include "mozilla/dom/TrustedScriptURL.h"
#include "mozilla/dom/TrustedTypePolicy.h"
#include "mozilla/dom/TrustedTypePolicyFactory.h"
#include "mozilla/dom/TrustedTypesConstants.h"
#include "mozilla/dom/WorkerCommon.h"
#include "mozilla/dom/WorkerPrivate.h"
#include "mozilla/dom/WorkerRunnable.h"
#include "mozilla/dom/WorkerScope.h"
#include "nsGlobalWindowInner.h"
#include "nsLiteralString.h"
#include "nsTArray.h"
#include "xpcpublic.h"

#include "mozilla/dom/CSPViolationData.h"
#include "mozilla/dom/ElementBinding.h"
#include "mozilla/dom/HTMLScriptElementBinding.h"
#include "mozilla/dom/UnionTypes.h"
#include "mozilla/dom/WindowOrWorkerGlobalScopeBinding.h"
#include "mozilla/dom/nsCSPUtils.h"

#include "nsContentUtils.h"
#include "nsIContentSecurityPolicy.h"

namespace mozilla::dom::TrustedTypeUtils {

nsString GetTrustedTypeName(TrustedType aTrustedType) {
  switch (aTrustedType) {
    case TrustedType::TrustedHTML:
      return GetTrustedTypeName<TrustedHTML>();
      break;
    case TrustedType::TrustedScript:
      return GetTrustedTypeName<TrustedScript>();
      break;
    case TrustedType::TrustedScriptURL:
      return GetTrustedTypeName<TrustedScriptURL>();
      break;
  }
  MOZ_ASSERT_UNREACHABLE();
  return EmptyString();
}

namespace SinkTypeMismatch {

static constexpr nsLiteralString kSampleSeparator = u"|"_ns;
static constexpr nsLiteralString kFunctionAnonymousPrefix =
    u"function anonymous"_ns;
static constexpr nsLiteralString kAsyncFunctionAnonymousPrefix =
    u"async function anonymous"_ns;
static constexpr nsLiteralString kFunctionStarAnonymousPrefix =
    u"function* anonymous"_ns;
static constexpr nsLiteralString kAsyncFunctionStarAnonymousPrefix =
    u"async function* anonymous"_ns;
}  // namespace SinkTypeMismatch

// Implement reporting of sink type mismatch violations.
// https://w3c.github.io/trusted-types/dist/spec/#abstract-opdef-should-sink-type-mismatch-violation-be-blocked-by-content-security-policy
static void ReportSinkTypeMismatchViolations(
    nsIContentSecurityPolicy* aCSP, nsICSPEventListener* aCSPEventListener,
    const nsAString& aSink, const nsAString& aSinkGroup,
    const nsAString& aSource) {
  MOZ_ASSERT(aSinkGroup == kTrustedTypesOnlySinkGroup);
  MOZ_ASSERT(aCSP);
  MOZ_ASSERT(aCSP->GetRequireTrustedTypesForDirectiveState() !=
             RequireTrustedTypesForDirectiveState::NONE);

  uint32_t numPolicies = 0;
  aCSP->GetPolicyCount(&numPolicies);

  // First determine the trimmed sample to be used for violation reports.
  size_t startPos = 0;
  if (aSink.Equals(u"Function"_ns)) {
    auto sourceStartsWith = [&aSource, &startPos](const nsAString& aPrefix) {
      MOZ_ASSERT(startPos == 0);
      if (aSource.Length() >= aPrefix.Length() &&
          Substring(aSource, 0, aPrefix.Length()).Equals(aPrefix)) {
        startPos = aPrefix.Length();
        return true;
      }
      return false;
    };
    for (auto& prefix : {SinkTypeMismatch::kFunctionAnonymousPrefix,
                         SinkTypeMismatch::kAsyncFunctionAnonymousPrefix,
                         SinkTypeMismatch::kFunctionStarAnonymousPrefix,
                         SinkTypeMismatch::kAsyncFunctionStarAnonymousPrefix}) {
      if (sourceStartsWith(prefix)) {
        break;
      }
    }
  }

  const nsDependentSubstring trimmedSample =
      CSPViolationData::MaybeTruncateSample(Substring(aSource, startPos));
  const nsString sample =
      aSink + SinkTypeMismatch::kSampleSeparator + trimmedSample;

  for (uint32_t i = 0; i < numPolicies; ++i) {
    const auto* policy = aCSP->GetPolicy(i);

    if (!policy->AreTrustedTypesForSinkGroupRequired(aSinkGroup)) {
      continue;
    }

    auto caller = JSCallingLocation::Get();

    CSPViolationData cspViolationData{
        i,
        CSPViolationData::Resource{
            CSPViolationData::BlockedContentSource::TrustedTypesSink},
        nsIContentSecurityPolicy::REQUIRE_TRUSTED_TYPES_FOR_DIRECTIVE,
        caller.FileName(),
        caller.mLine,
        caller.mColumn,
        /* aElement */ nullptr,
        sample};

    aCSP->LogTrustedTypesViolationDetailsUnchecked(
        std::move(cspViolationData),
        NS_LITERAL_STRING_FROM_CSTRING(
            REQUIRE_TRUSTED_TYPES_FOR_SCRIPT_OBSERVER_TOPIC),
        aCSPEventListener);
  }
}

class LogSinkTypeMismatchViolationsRunnable final
    : public WorkerMainThreadRunnable {
 public:
  LogSinkTypeMismatchViolationsRunnable(WorkerPrivate* aWorker,
                                        const nsAString& aSink,
                                        const nsAString& aSinkGroup,
                                        const nsAString& aSource)
      : WorkerMainThreadRunnable(
            aWorker,
            "RuntimeService :: LogSinkTypeMismatchViolationsRunnable"_ns),
        mSink(aSink),
        mSinkGroup(aSinkGroup),
        mSource(aSource) {
    MOZ_ASSERT(aWorker);
  }

  virtual bool MainThreadRun() override {
    AssertIsOnMainThread();
    MOZ_ASSERT(mWorkerRef);
    if (nsIContentSecurityPolicy* csp = mWorkerRef->Private()->GetCsp()) {
      ReportSinkTypeMismatchViolations(
          csp, mWorkerRef->Private()->CSPEventListener(), mSink, mSinkGroup,
          mSource);
    }
    return true;
  }

 private:
  ~LogSinkTypeMismatchViolationsRunnable() = default;
  const nsString mSink;
  const nsString mSinkGroup;
  const nsString mSource;
};

constexpr size_t kNumArgumentsForDetermineTrustedTypePolicyValue = 2;

template <typename ExpectedType>
void ProcessValueWithADefaultPolicy(nsIGlobalObject& aGlobalObject,
                                    const nsAString& aInput,
                                    const nsAString& aSink,
                                    ExpectedType** aResult,
                                    ErrorResult& aError) {
  *aResult = nullptr;

  TrustedTypePolicyFactory* trustedTypePolicyFactory;
  if (nsPIDOMWindowInner* piDOMWindowInner = aGlobalObject.GetAsInnerWindow()) {
    nsGlobalWindowInner* globalWindowInner =
        nsGlobalWindowInner::Cast(piDOMWindowInner);
    trustedTypePolicyFactory = globalWindowInner->TrustedTypes();
  } else {
    MOZ_ASSERT(IsWorkerGlobal(aGlobalObject.GetGlobalJSObject()));
    MOZ_ASSERT(!NS_IsMainThread());
    WorkerPrivate* workerPrivate = GetCurrentThreadWorkerPrivate();
    WorkerGlobalScope* scope = workerPrivate->GlobalScope();
    trustedTypePolicyFactory = scope->TrustedTypes();
  }

  const RefPtr<TrustedTypePolicy> defaultPolicy =
      trustedTypePolicyFactory->GetDefaultPolicy();
  if (!defaultPolicy) {
    return;
  }

  JSContext* cx = nsContentUtils::GetCurrentJSContext();
  if (!cx) {
    return;
  }

  JS::Rooted<JS::Value> trustedTypeName{cx};
  using ExpectedTypeArg =
      std::remove_const_t<std::remove_reference_t<decltype(**aResult)>>;
  if (!xpc::NonVoidStringToJsval(cx, GetTrustedTypeName<ExpectedTypeArg>(),
                                 &trustedTypeName)) {
    aError.StealExceptionFromJSContext(cx);
    return;
  }

  JS::Rooted<JS::Value> sink{cx};
  if (!xpc::NonVoidStringToJsval(cx, aSink, &sink)) {
    aError.StealExceptionFromJSContext(cx);
    return;
  }

  AutoTArray<JS::Value, kNumArgumentsForDetermineTrustedTypePolicyValue>
      arguments = {trustedTypeName, sink};

  nsString policyValue;
  if constexpr (std::is_same_v<ExpectedTypeArg, TrustedHTML>) {
    RefPtr<CreateHTMLCallback> callbackObject =
        defaultPolicy->GetOptions().mCreateHTMLCallback;
    defaultPolicy->DetermineTrustedPolicyValue(
        callbackObject, aInput, arguments,
        /* aThrowIfMissing */ false, aError, policyValue);
  } else if constexpr (std::is_same_v<ExpectedTypeArg, TrustedScript>) {
    RefPtr<CreateScriptCallback> callbackObject =
        defaultPolicy->GetOptions().mCreateScriptCallback;
    defaultPolicy->DetermineTrustedPolicyValue(
        callbackObject, aInput, arguments,
        /* aThrowIfMissing */ false, aError, policyValue);
  } else {
    MOZ_ASSERT((std::is_same_v<ExpectedTypeArg, TrustedScriptURL>));
    RefPtr<CreateScriptURLCallback> callbackObject =
        defaultPolicy->GetOptions().mCreateScriptURLCallback;
    defaultPolicy->DetermineTrustedPolicyValue(
        callbackObject, aInput, arguments,
        /* aThrowIfMissing */ false, aError, policyValue);
  }

  if (aError.Failed()) {
    return;
  }

  if (policyValue.IsVoid()) {
    return;
  }

  MakeRefPtr<ExpectedType>(policyValue).forget(aResult);
}

// GetTrustedTypesCompliantString() and GetTrustedTypesCompliantAttributeValue()
// deal with "trusted type or string" union types. These union types provide
// inline methods Is*() and GetAs*() to test and access the actual value. The
// following inline functions provide similar logic to conveniently deal with
// the different union types.
template <typename TrustedTypeOrStringArg>
static inline bool IsString(const TrustedTypeOrStringArg& aInput) {
  if constexpr (
      std::is_same_v<TrustedTypeOrStringArg, TrustedHTMLOrString> ||
      std::is_same_v<TrustedTypeOrStringArg, TrustedScriptOrString> ||
      std::is_same_v<TrustedTypeOrStringArg, FunctionOrTrustedScriptOrString> ||
      std::is_same_v<TrustedTypeOrStringArg, TrustedScriptURLOrString> ||
      std::is_same_v<TrustedTypeOrStringArg, OwningTrustedScriptURLOrString> ||
      std::is_same_v<TrustedTypeOrStringArg,
                     TrustedHTMLOrTrustedScriptOrTrustedScriptURLOrString>) {
    return aInput.IsString();
  }
  if constexpr (std::is_same_v<TrustedTypeOrStringArg,
                               TrustedHTMLOrNullIsEmptyString> ||
                std::is_same_v<TrustedTypeOrStringArg,
                               TrustedScriptOrNullIsEmptyString>) {
    return aInput.IsNullIsEmptyString();
  }
  if constexpr (std::is_same_v<TrustedTypeOrStringArg,
                               TrustedScriptURLOrUSVString>) {
    return aInput.IsUSVString();
  }
  if constexpr (std::is_same_v<TrustedTypeOrStringArg, const nsAString*>) {
    Unused << aInput;
    return true;
  }
  MOZ_ASSERT_UNREACHABLE();
  return false;
}

template <typename TrustedTypeOrStringArg>
static inline const nsAString* GetAsString(
    const TrustedTypeOrStringArg& aInput) {
  if constexpr (
      std::is_same_v<TrustedTypeOrStringArg, TrustedHTMLOrString> ||
      std::is_same_v<TrustedTypeOrStringArg, TrustedScriptOrString> ||
      std::is_same_v<TrustedTypeOrStringArg, FunctionOrTrustedScriptOrString> ||
      std::is_same_v<TrustedTypeOrStringArg, TrustedScriptURLOrString> ||
      std::is_same_v<TrustedTypeOrStringArg, OwningTrustedScriptURLOrString> ||
      std::is_same_v<TrustedTypeOrStringArg,
                     TrustedHTMLOrTrustedScriptOrTrustedScriptURLOrString>) {
    return &aInput.GetAsString();
  }
  if constexpr (std::is_same_v<TrustedTypeOrStringArg,
                               TrustedHTMLOrNullIsEmptyString> ||
                std::is_same_v<TrustedTypeOrStringArg,
                               TrustedScriptOrNullIsEmptyString>) {
    return &aInput.GetAsNullIsEmptyString();
  }
  if constexpr (std::is_same_v<TrustedTypeOrStringArg,
                               TrustedScriptURLOrUSVString>) {
    return &aInput.GetAsUSVString();
  }
  if constexpr (std::is_same_v<TrustedTypeOrStringArg, const nsAString*>) {
    return aInput;
  }
  MOZ_ASSERT_UNREACHABLE();
  return &EmptyString();
}

template <typename TrustedTypeOrStringArg>
static inline bool IsTrustedType(const TrustedTypeOrStringArg& aInput) {
  if constexpr (std::is_same_v<TrustedTypeOrStringArg, TrustedHTMLOrString> ||
                std::is_same_v<TrustedTypeOrStringArg,
                               TrustedHTMLOrNullIsEmptyString>) {
    return aInput.IsTrustedHTML();
  }
  if constexpr (std::is_same_v<TrustedTypeOrStringArg, TrustedScriptOrString> ||
                std::is_same_v<TrustedTypeOrStringArg,
                               FunctionOrTrustedScriptOrString> ||
                std::is_same_v<TrustedTypeOrStringArg,
                               TrustedScriptOrNullIsEmptyString>) {
    return aInput.IsTrustedScript();
  }
  if constexpr (std::is_same_v<TrustedTypeOrStringArg,
                               TrustedScriptURLOrString> ||
                std::is_same_v<TrustedTypeOrStringArg,
                               TrustedScriptURLOrUSVString> ||
                std::is_same_v<TrustedTypeOrStringArg,
                               OwningTrustedScriptURLOrString>) {
    return aInput.IsTrustedScriptURL();
  }
  if constexpr (std::is_same_v<TrustedTypeOrStringArg, const nsAString*>) {
    Unused << aInput;
    return false;
  }
  MOZ_ASSERT_UNREACHABLE();
  return false;
};

template <typename TrustedTypeOrStringArg>
static inline const nsAString* GetAsTrustedType(
    const TrustedTypeOrStringArg& aInput) {
  if constexpr (std::is_same_v<TrustedTypeOrStringArg, TrustedHTMLOrString> ||
                std::is_same_v<TrustedTypeOrStringArg,
                               TrustedHTMLOrNullIsEmptyString>) {
    return &aInput.GetAsTrustedHTML().mData;
  }
  if constexpr (std::is_same_v<TrustedTypeOrStringArg, TrustedScriptOrString> ||
                std::is_same_v<TrustedTypeOrStringArg,
                               FunctionOrTrustedScriptOrString> ||
                std::is_same_v<TrustedTypeOrStringArg,
                               TrustedScriptOrNullIsEmptyString>) {
    return &aInput.GetAsTrustedScript().mData;
  }
  if constexpr (std::is_same_v<TrustedTypeOrStringArg,
                               TrustedScriptURLOrString> ||
                std::is_same_v<TrustedTypeOrStringArg,
                               TrustedScriptURLOrUSVString>) {
    return &aInput.GetAsTrustedScriptURL().mData;
  }
  if constexpr (std::is_same_v<TrustedTypeOrStringArg,
                               OwningTrustedScriptURLOrString>) {
    return &aInput.GetAsTrustedScriptURL()->mData;
  }
  if constexpr (std::is_same_v<
                    TrustedTypeOrStringArg,
                    TrustedHTMLOrTrustedScriptOrTrustedScriptURLOrString>) {
    if (aInput.IsTrustedHTML()) {
      return &aInput.GetAsTrustedHTML().mData;
    }
    if (aInput.IsTrustedScript()) {
      return &aInput.GetAsTrustedScript().mData;
    }
    MOZ_ASSERT(aInput.IsTrustedScriptURL());
    return &aInput.GetAsTrustedScriptURL().mData;
  }
  Unused << aInput;
  MOZ_ASSERT_UNREACHABLE();
  return &EmptyString();
};

template <typename TrustedTypeOrStringArg>
static inline const nsAString* GetContent(
    const TrustedTypeOrStringArg& aInput) {
  return IsString(aInput) ? GetAsString(aInput) : GetAsTrustedType(aInput);
}

template <typename ExpectedType, typename TrustedTypeOrString,
          typename NodeOrGlobalObject>
MOZ_CAN_RUN_SCRIPT inline const nsAString* GetTrustedTypesCompliantString(
    const TrustedTypeOrString& aInput, const nsAString& aSink,
    const nsAString& aSinkGroup, NodeOrGlobalObject& aNodeOrGlobalObject,
    Maybe<nsAutoString>& aResultHolder, ErrorResult& aError) {
  MOZ_ASSERT(aSinkGroup == kTrustedTypesOnlySinkGroup);
  if (!StaticPrefs::dom_security_trusted_types_enabled()) {
    // A trusted type might've been created before the pref was set to `false`,
    // so we cannot assume aInput.IsString().
    return GetContent(aInput);
  }

  if (IsTrustedType(aInput)) {
    return GetAsTrustedType(aInput);
  }

  // Below, we use fast paths when there are no require-trusted-types-for
  // directives. Note that the global object's CSP may differ from the
  // owner-document's one. E.g. when aDocument was created by
  // `document.implementation.createHTMLDocument` and it's not connected to a
  // browsing context.
  using NodeOrGlobalObjectArg = std::remove_const_t<
      std::remove_reference_t<decltype(aNodeOrGlobalObject)>>;
  nsIGlobalObject* globalObject = nullptr;
  nsPIDOMWindowInner* piDOMWindowInner = nullptr;
  if constexpr (std::is_same_v<NodeOrGlobalObjectArg, nsINode>) {
    Document* ownerDoc = aNodeOrGlobalObject.OwnerDoc();
    const bool ownerDocLoadedAsData = ownerDoc->IsLoadedAsData();
    if (!ownerDoc->HasPolicyWithRequireTrustedTypesForDirective() &&
        !ownerDocLoadedAsData) {
      return GetAsString(aInput);
    }
    globalObject = ownerDoc->GetScopeObject();
    if (!globalObject) {
      aError.ThrowTypeError("No global object");
      return nullptr;
    }
    piDOMWindowInner = globalObject->GetAsInnerWindow();
    if (!piDOMWindowInner) {
      // Global object is not a Window. This can happen when DOM APIs are used
      // in some contexts where Trusted Types don't apply (e.g. bug 1942517),
      // so just return the input string.
      return GetAsString(aInput);
    }
    if (ownerDocLoadedAsData && piDOMWindowInner->GetExtantDoc() &&
        !piDOMWindowInner->GetExtantDoc()
             ->HasPolicyWithRequireTrustedTypesForDirective()) {
      return GetAsString(aInput);
    }
  } else if constexpr (std::is_same_v<NodeOrGlobalObjectArg, nsIGlobalObject>) {
    piDOMWindowInner = aNodeOrGlobalObject.GetAsInnerWindow();
    if (piDOMWindowInner) {
      const Document* extantDoc = piDOMWindowInner->GetExtantDoc();
      if (extantDoc &&
          !extantDoc->HasPolicyWithRequireTrustedTypesForDirective()) {
        return GetAsString(aInput);
      }
    }
    globalObject = &aNodeOrGlobalObject;
  }
  MOZ_ASSERT(globalObject);

  // Now retrieve the CSP from the global object.
  // Because there is only one sink group, its associated
  // RequireTrustedTypesForDirectiveState actually provides the results of
  // "Does sink type require trusted types?"
  // (https://w3c.github.io/trusted-types/dist/spec/#abstract-opdef-does-sink-type-require-trusted-types)
  // and "Should sink type mismatch violation be blocked by CSP?"
  // (https://w3c.github.io/trusted-types/dist/spec/#should-block-sink-type-mismatch).
  RefPtr<nsIContentSecurityPolicy> csp;
  RequireTrustedTypesForDirectiveState requireTrustedTypesForDirectiveState =
      RequireTrustedTypesForDirectiveState::NONE;
  if (piDOMWindowInner) {
    csp = piDOMWindowInner->GetCsp();
    if (!csp) {
      return GetAsString(aInput);
    }
    requireTrustedTypesForDirectiveState =
        csp->GetRequireTrustedTypesForDirectiveState();
    // The following assert is guaranteed by above calls to
    // HasPolicyWithRequireTrustedTypesForDirective.
    MOZ_ASSERT(requireTrustedTypesForDirectiveState !=
               RequireTrustedTypesForDirectiveState::NONE);
  } else if (IsWorkerGlobal(globalObject->GetGlobalJSObject())) {
    MOZ_ASSERT(!NS_IsMainThread());
    WorkerPrivate* workerPrivate = GetCurrentThreadWorkerPrivate();
    const mozilla::ipc::CSPInfo& cspInfo = workerPrivate->GetCSPInfo();
    requireTrustedTypesForDirectiveState =
        cspInfo.requireTrustedTypesForDirectiveState();
    if (requireTrustedTypesForDirectiveState ==
        RequireTrustedTypesForDirectiveState::NONE) {
      return GetAsString(aInput);
    }
  } else {
    // Global object is neither Window nor WorkerGlobalScope. This can happen
    // when DOM APIs are used in some contexts where Trusted Types don't apply
    // (e.g. bugs 1942517 and 1936219), so just return the input string.
    return GetAsString(aInput);
  }

  RefPtr<ExpectedType> convertedInput;
  nsCOMPtr<nsIGlobalObject> pinnedGlobalObject = globalObject;
  ProcessValueWithADefaultPolicy<ExpectedType>(
      *pinnedGlobalObject, *GetAsString(aInput), aSink,
      getter_AddRefs(convertedInput), aError);

  if (aError.Failed()) {
    return nullptr;
  }

  if (!convertedInput) {
    if (piDOMWindowInner) {
      ReportSinkTypeMismatchViolations(csp, nullptr /* aCSPEventListener */,
                                       aSink, aSinkGroup, *GetAsString(aInput));
    } else {
      MOZ_ASSERT(IsWorkerGlobal(globalObject->GetGlobalJSObject()));
      MOZ_ASSERT(!NS_IsMainThread());
      WorkerPrivate* workerPrivate = GetCurrentThreadWorkerPrivate();
      RefPtr<LogSinkTypeMismatchViolationsRunnable> runnable =
          new LogSinkTypeMismatchViolationsRunnable(
              workerPrivate, aSink, aSinkGroup, *GetAsString(aInput));
      ErrorResult rv;
      runnable->Dispatch(workerPrivate, Killing, rv);
      if (NS_WARN_IF(rv.Failed())) {
        rv.SuppressException();
      }
    }
    if (requireTrustedTypesForDirectiveState ==
        RequireTrustedTypesForDirectiveState::REPORT_ONLY) {
      return GetAsString(aInput);
    }

    aError.ThrowTypeError("Sink type mismatch violation blocked by CSP"_ns);
    return nullptr;
  }

  aResultHolder = Some(convertedInput->mData);
  return aResultHolder.ptr();
}

#define IMPL_GET_TRUSTED_TYPES_COMPLIANT_STRING(                          \
    _trustedTypeOrString, _expectedType, _nodeOrGlobalObject)             \
  const nsAString* GetTrustedTypesCompliantString(                        \
      const _trustedTypeOrString& aInput, const nsAString& aSink,         \
      const nsAString& aSinkGroup, _nodeOrGlobalObject& aNodeOrGlobal,    \
      Maybe<nsAutoString>& aResultHolder, ErrorResult& aError) {          \
    return GetTrustedTypesCompliantString<_expectedType>(                 \
        aInput, aSink, aSinkGroup, aNodeOrGlobal, aResultHolder, aError); \
  }

IMPL_GET_TRUSTED_TYPES_COMPLIANT_STRING(TrustedHTMLOrString, TrustedHTML,
                                        const nsINode);
IMPL_GET_TRUSTED_TYPES_COMPLIANT_STRING(TrustedHTMLOrNullIsEmptyString,
                                        TrustedHTML, const nsINode);
IMPL_GET_TRUSTED_TYPES_COMPLIANT_STRING(TrustedHTMLOrString, TrustedHTML,
                                        nsIGlobalObject);
IMPL_GET_TRUSTED_TYPES_COMPLIANT_STRING(TrustedScriptOrString, TrustedScript,
                                        const nsINode);
IMPL_GET_TRUSTED_TYPES_COMPLIANT_STRING(TrustedScriptOrNullIsEmptyString,
                                        TrustedScript, const nsINode);
IMPL_GET_TRUSTED_TYPES_COMPLIANT_STRING(FunctionOrTrustedScriptOrString,
                                        TrustedScript, nsIGlobalObject);
IMPL_GET_TRUSTED_TYPES_COMPLIANT_STRING(TrustedScriptURLOrString,
                                        TrustedScriptURL, const nsINode);
IMPL_GET_TRUSTED_TYPES_COMPLIANT_STRING(TrustedScriptURLOrUSVString,
                                        TrustedScriptURL, nsIGlobalObject);
IMPL_GET_TRUSTED_TYPES_COMPLIANT_STRING(OwningTrustedScriptURLOrString,
                                        TrustedScriptURL, nsIGlobalObject);

MOZ_CAN_RUN_SCRIPT const nsAString*
GetTrustedTypesCompliantStringForTrustedHTML(const nsAString& aInput,
                                             const nsAString& aSink,
                                             const nsAString& aSinkGroup,
                                             const nsINode& aNode,
                                             Maybe<nsAutoString>& aResultHolder,
                                             ErrorResult& aError) {
  return GetTrustedTypesCompliantString<TrustedHTML>(
      &aInput, aSink, aSinkGroup, aNode, aResultHolder, aError);
}

MOZ_CAN_RUN_SCRIPT const nsAString*
GetTrustedTypesCompliantStringForTrustedScript(
    const nsAString& aInput, const nsAString& aSink,
    const nsAString& aSinkGroup, nsIGlobalObject& aGlobalObject,
    Maybe<nsAutoString>& aResultHolder, ErrorResult& aError) {
  return GetTrustedTypesCompliantString<TrustedScript>(
      &aInput, aSink, aSinkGroup, aGlobalObject, aResultHolder, aError);
}

bool GetTrustedTypeDataForAttribute(const nsAtom* aElementName,
                                    int32_t aElementNamespaceID,
                                    nsAtom* aAttributeName,
                                    int32_t aAttributeNamespaceID,
                                    TrustedType& aTrustedType,
                                    nsAString& aSink) {
  if (aElementNamespaceID != kNameSpaceID_XHTML &&
      aElementNamespaceID != kNameSpaceID_SVG &&
      aElementNamespaceID != kNameSpaceID_MathML) {
    return false;
  }

  // The spec is not really clear about which "event handler content attributes"
  // we should consider, so we just include everything but XUL's specific ones.
  // See https://github.com/w3c/trusted-types/issues/520.
  if (aAttributeNamespaceID == kNameSpaceID_None &&
      nsContentUtils::IsEventAttributeName(
          aAttributeName, EventNameType_All & ~EventNameType_XUL)) {
    aTrustedType = TrustedType::TrustedScript;
    aSink.AssignLiteral(u"Element ");
    aSink.Append(*aAttributeName);
    return true;
  }
  if (aElementNamespaceID == kNameSpaceID_XHTML) {
    if (aElementName == nsGkAtoms::iframe) {
      // HTMLIFrameElement
      if (aAttributeNamespaceID == kNameSpaceID_None &&
          aAttributeName == nsGkAtoms::srcdoc) {
        aTrustedType = TrustedType::TrustedHTML;
        aSink.AssignLiteral(u"HTMLIFrameElement srcdoc");
        return true;
      }
    } else if (aElementName == nsGkAtoms::script) {
      // HTMLScriptElement
      if (aAttributeNamespaceID == kNameSpaceID_None &&
          aAttributeName == nsGkAtoms::src) {
        aTrustedType = TrustedType::TrustedScriptURL;
        aSink.AssignLiteral(u"HTMLScriptElement src");
        return true;
      }
    }
  } else if (aElementNamespaceID == kNameSpaceID_SVG) {
    if (aElementName == nsGkAtoms::script) {
      // SVGScriptElement
      if ((aAttributeNamespaceID == kNameSpaceID_None ||
           aAttributeNamespaceID == kNameSpaceID_XLink) &&
          aAttributeName == nsGkAtoms::href) {
        aTrustedType = TrustedType::TrustedScriptURL;
        aSink.AssignLiteral(u"SVGScriptElement href");
        return true;
      }
    }
  }

  return false;
}

template <typename TrustedTypeOrStringArg>
MOZ_CAN_RUN_SCRIPT const nsAString* GetTrustedTypesCompliantAttributeValue(
    const nsINode& aElement, nsAtom* aAttributeName,
    int32_t aAttributeNamespaceID, const TrustedTypeOrStringArg& aNewValue,
    Maybe<nsAutoString>& aResultHolder, ErrorResult& aError) {
  if (!StaticPrefs::dom_security_trusted_types_enabled()) {
    // A trusted type might've been created before the pref was set to `false`,
    // so we cannot assume aNewValue.IsString().
    return GetContent(aNewValue);
  }

  // In the common situation of non-data document without any
  // require-trusted-types-for directive, we just return immediately.
  const NodeInfo* nodeInfo = aElement.NodeInfo();
  Document* ownerDoc = nodeInfo->GetDocument();
  const bool ownerDocLoadedAsData = ownerDoc->IsLoadedAsData();
  if (!ownerDoc->HasPolicyWithRequireTrustedTypesForDirective() &&
      !ownerDocLoadedAsData) {
    return GetContent(aNewValue);
  }

  TrustedType expectedType;
  nsAutoString sink;
  if (!GetTrustedTypeDataForAttribute(
          nodeInfo->NameAtom(), nodeInfo->NamespaceID(), aAttributeName,
          aAttributeNamespaceID, expectedType, sink)) {
    return GetContent(aNewValue);
  }

  if constexpr (std::is_same_v<
                    TrustedTypeOrStringArg,
                    TrustedHTMLOrTrustedScriptOrTrustedScriptURLOrString>) {
    if ((expectedType == TrustedType::TrustedHTML &&
         aNewValue.IsTrustedHTML()) ||
        (expectedType == TrustedType::TrustedScript &&
         aNewValue.IsTrustedScript()) ||
        (expectedType == TrustedType::TrustedScriptURL &&
         aNewValue.IsTrustedScriptURL())) {
      return GetAsTrustedType(aNewValue);
    }
  } else {
    MOZ_ASSERT((std::is_same_v<TrustedTypeOrStringArg, const nsAString*>));
  }

  const nsAString* input = GetContent(aNewValue);
  switch (expectedType) {
    case TrustedType::TrustedHTML:
      return GetTrustedTypesCompliantString<TrustedHTML>(
          input, sink, kTrustedTypesOnlySinkGroup, aElement, aResultHolder,
          aError);
    case TrustedType::TrustedScript:
      return GetTrustedTypesCompliantString<TrustedScript>(
          input, sink, kTrustedTypesOnlySinkGroup, aElement, aResultHolder,
          aError);
    case TrustedType::TrustedScriptURL:
      return GetTrustedTypesCompliantString<TrustedScriptURL>(
          input, sink, kTrustedTypesOnlySinkGroup, aElement, aResultHolder,
          aError);
  }
  MOZ_ASSERT_UNREACHABLE();
  return nullptr;
}

MOZ_CAN_RUN_SCRIPT const nsAString* GetTrustedTypesCompliantAttributeValue(
    const nsINode& aElement, nsAtom* aAttributeName,
    int32_t aAttributeNamespaceID,
    const TrustedHTMLOrTrustedScriptOrTrustedScriptURLOrString& aNewValue,
    Maybe<nsAutoString>& aResultHolder, ErrorResult& aError) {
  return GetTrustedTypesCompliantAttributeValue<
      TrustedHTMLOrTrustedScriptOrTrustedScriptURLOrString>(
      aElement, aAttributeName, aAttributeNamespaceID, aNewValue, aResultHolder,
      aError);
}

MOZ_CAN_RUN_SCRIPT const nsAString* GetTrustedTypesCompliantAttributeValue(
    const nsINode& aElement, nsAtom* aAttributeName,
    int32_t aAttributeNamespaceID, const nsAString& aNewValue,
    Maybe<nsAutoString>& aResultHolder, ErrorResult& aError) {
  return GetTrustedTypesCompliantAttributeValue<const nsAString*>(
      aElement, aAttributeName, aAttributeNamespaceID, &aNewValue,
      aResultHolder, aError);
}

bool HostGetCodeForEval(JSContext* aCx, JS::Handle<JSObject*> aCode,
                        JS::MutableHandle<JSString*> aOutCode) {
  JS::Rooted<JSObject*> obj(aCx, aCode);
  TrustedScript* trustedScript;
  if (StaticPrefs::dom_security_trusted_types_enabled() &&
      NS_SUCCEEDED(UNWRAP_OBJECT(TrustedScript, &obj, trustedScript))) {
    if (JSString* copy = JS_NewUCStringCopyZ(aCx, trustedScript->mData.get())) {
      aOutCode.set(copy);
      return true;
    }
    return false;
  }
  aOutCode.set(nullptr);
  return true;
}

bool AreArgumentsTrustedForEnsureCSPDoesNotBlockStringCompilation(
    JSContext* aCx, JS::Handle<JSString*> aCodeString,
    JS::CompilationType aCompilationType,
    JS::Handle<JS::StackGCVector<JSString*>> aParameterStrings,
    JS::Handle<JSString*> aBodyString,
    JS::Handle<JS::StackGCVector<JS::Value>> aParameterArgs,
    JS::Handle<JS::Value> aBodyArg, ErrorResult& aError) {
  // EnsureCSPDoesNotBlockStringCompilation is essentially HTML's implementation
  // of HostEnsureCanCompileStrings, so we only consider the cases described in
  // the Dynamic Code Brand Checks spec. The algorithm is also supposed to be
  // called for "TIMER" too but in that case it does not execute the specific
  // part implemented in the present method (step 2).
  // https://html.spec.whatwg.org/multipage/webappapis.html#hostensurecancompilestrings(realm,-parameterstrings,-bodystring,-codestring,-compilationtype,-parameterargs,-bodyarg)
  // https://tc39.es/proposal-dynamic-code-brand-checks/#sec-hostensurecancompilestrings
  // https://html.spec.whatwg.org/#timer-initialisation-steps
  if (!StaticPrefs::dom_security_trusted_types_enabled() ||
      aCompilationType == JS::CompilationType::Undefined) {
    return true;
  }

  // https://html.spec.whatwg.org/multipage/webappapis.html#hostensurecancompilestrings(realm,-parameterstrings,-bodystring,-codestring,-compilationtype,-parameterargs,-bodyarg)
  // https://w3c.github.io/webappsec-csp/#can-compile-strings
  nsIGlobalObject* global = xpc::CurrentNativeGlobal(aCx);
  if (!global) {
    aError.Throw(NS_ERROR_NULL_POINTER);
    return false;
  }

  // Exit early for some cases where GetTrustedTypesCompliantString
  // would have no effect on aCodeString.
  if (nsPIDOMWindowInner* piDOMWindowInner = global->GetAsInnerWindow()) {
    const Document* extantDoc = piDOMWindowInner->GetExtantDoc();
    if (extantDoc &&
        !extantDoc->HasPolicyWithRequireTrustedTypesForDirective()) {
      return true;
    }
  } else {
    JSObject* globalJSObject = global->GetGlobalJSObject();
    if (!globalJSObject || !IsWorkerGlobal(globalJSObject)) {
      // Global object is neither a Window not a WorkerGlobalScope, this can
      // happen in some contexts where Trusted Types don't apply (chrome JS
      // globals) so just treat arguments as trusted.
      return true;
    }
    MOZ_ASSERT(!NS_IsMainThread());
    WorkerPrivate* workerPrivate = GetCurrentThreadWorkerPrivate();
    const mozilla::ipc::CSPInfo& cspInfo = workerPrivate->GetCSPInfo();
    if (cspInfo.requireTrustedTypesForDirectiveState() ==
        RequireTrustedTypesForDirectiveState::NONE) {
      return true;
    }
  }

  // Steps 2.2 - 2.4.
  bool isTrusted = true;
  auto isArgumentTrusted = [&aCx](JS::Handle<JS::Value> aValue,
                                  JS::Handle<JSString*> aString,
                                  ErrorResult& aError) {
    if (!aValue.isObject()) {
      return false;
    }
    JS::Rooted<JSObject*> object(aCx, &aValue.toObject());
    TrustedScript* trustedScript;
    if (NS_FAILED(UNWRAP_OBJECT(TrustedScript, &object, trustedScript))) {
      return false;
    }
    nsAutoJSString jsString;
    if (NS_WARN_IF(!jsString.init(aCx, aString))) {
      aError.StealExceptionFromJSContext(aCx);
      return false;
    }
    return jsString.Equals(trustedScript->mData);
  };
  if (aCompilationType == JS::CompilationType::DirectEval ||
      aCompilationType == JS::CompilationType::IndirectEval) {
    // The following assertions are guanranteed by the steps of PerformEval.
    MOZ_ASSERT(aParameterArgs.empty());
    MOZ_ASSERT(aParameterStrings.empty());
    MOZ_ASSERT(aBodyString);
    MOZ_ASSERT(aBodyArg.isString() || aBodyArg.isObject());
    isTrusted = aBodyArg.isObject();
#ifdef DEBUG
    bool trusted = isArgumentTrusted(aBodyArg, aBodyString, aError);
    if (aError.Failed()) {
      return false;
    }
    // The following assertion is guaranteed by the HTML implementation of
    // HostGetCodeForEval.
    MOZ_ASSERT(isTrusted == trusted);
#endif
  } else {
    MOZ_ASSERT(aCompilationType == JS::CompilationType::Function);
    if (aBodyString) {
      isTrusted = isArgumentTrusted(aBodyArg, aBodyString, aError);
      if (aError.Failed()) {
        return false;
      }
    }
    if (isTrusted) {
      MOZ_ASSERT(aParameterArgs.length() == aParameterStrings.length());
      for (size_t index = 0; index < aParameterArgs.length(); index++) {
        isTrusted = isArgumentTrusted(aParameterArgs[index],
                                      aParameterStrings[index], aError);
        if (aError.Failed()) {
          return false;
        }
        if (!isTrusted) {
          break;
        }
      }
    }
  }

  // If successful, the steps below always ends up with sourceString ==
  // codeString. Moreover if isTrusted == true, passing a new TrustedScript to
  // GetTrustedTypesCompliantStringForTrustedScript would just return codeString
  // immediately, so we can skip all these steps.
  if (isTrusted) {
    return true;
  }

  // Steps 2.5 - 2.6.
  nsAutoJSString codeString;
  if (NS_WARN_IF(!codeString.init(aCx, aCodeString))) {
    aError.StealExceptionFromJSContext(aCx);
    return false;
  }

  Maybe<nsAutoString> compliantStringHolder;
  constexpr nsLiteralString evalSink = u"eval"_ns;
  constexpr nsLiteralString functionSink = u"Function"_ns;
  nsCOMPtr<nsIGlobalObject> pinnedGlobal = global;
  const nsAString* compliantString =
      dom::TrustedTypeUtils::GetTrustedTypesCompliantStringForTrustedScript(
          codeString,
          aCompilationType == JS::CompilationType::Function ? functionSink
                                                            : evalSink,
          kTrustedTypesOnlySinkGroup, *pinnedGlobal, compliantStringHolder,
          aError);

  // Step 2.7-2.8.
  // Callers will take care of throwing an EvalError when we return false.
  if (aError.Failed()) {
    aError.SuppressException();
    return false;
  }
  return compliantString->Equals(codeString);
}

}  // namespace mozilla::dom::TrustedTypeUtils
