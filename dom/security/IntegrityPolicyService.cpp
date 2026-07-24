/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IntegrityPolicyService.h"

#include "mozilla/BasePrincipal.h"
#include "mozilla/Logging.h"
#include "mozilla/StaticPrefs_security.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/IntegrityPolicy.h"
#include "mozilla/dom/IntegrityViolationReportBody.h"
#include "mozilla/dom/PolicyContainer.h"
#include "mozilla/dom/ReportingUtils.h"
#include "mozilla/dom/RequestBinding.h"
#include "mozilla/dom/SRIMetadata.h"
#include "mozilla/net/SFVService.h"
#include "nsContentSecurityManager.h"
#include "nsContentSecurityUtils.h"
#include "nsContentUtils.h"
#include "nsILoadInfo.h"
#include "nsString.h"

using namespace mozilla;

static LazyLogModule sIntegrityPolicyServiceLogModule("IntegrityPolicy");
#define LOG(fmt, ...)                                                 \
  MOZ_LOG_FMT(sIntegrityPolicyServiceLogModule, LogLevel::Debug, fmt, \
              ##__VA_ARGS__)

namespace mozilla::dom {

IntegrityPolicyService::~IntegrityPolicyService() = default;

/* nsIContentPolicy implementation */
NS_IMETHODIMP
IntegrityPolicyService::ShouldLoad(nsIURI* aContentLocation,
                                   nsILoadInfo* aLoadInfo, int16_t* aDecision) {
  LOG("ShouldLoad: [{}] Entered ShouldLoad", static_cast<void*>(aLoadInfo));

  *aDecision = nsIContentPolicy::ACCEPT;

  if (!StaticPrefs::security_integrity_policy_enabled()) {
    LOG("ShouldLoad: [{}] Integrity policy is disabled",
        static_cast<void*>(aLoadInfo));
    return NS_OK;
  }

  if (!aContentLocation) {
    LOG("ShouldLoad: [{}] No content location", static_cast<void*>(aLoadInfo));
    return NS_ERROR_FAILURE;
  }

  bool block = ShouldRequestBeBlocked(aContentLocation, aLoadInfo);
  *aDecision =
      block ? nsIContentPolicy::REJECT_SERVER : nsIContentPolicy::ACCEPT;
  return NS_OK;
}

NS_IMETHODIMP IntegrityPolicyService::ShouldProcess(nsIURI* aContentLocation,
                                                    nsILoadInfo* aLoadInfo,
                                                    int16_t* aDecision) {
  *aDecision = nsIContentPolicy::ACCEPT;
  return NS_OK;
}

// https://w3c.github.io/webappsec-subresource-integrity/#should-request-be-blocked-by-integrity-policy-section
bool IntegrityPolicyService::ShouldRequestBeBlocked(nsIURI* aContentLocation,
                                                    nsILoadInfo* aLoadInfo) {
  // Efficiency check: if we don't care about this type, we can skip.
  auto destination = IntegrityPolicy::ContentTypeToDestinationType(
      aLoadInfo->InternalContentPolicyType());
  if (destination.isNothing()) {
    LOG("ShouldLoad: [{}] Integrity policy doesn't handle this type={}",
        static_cast<void*>(aLoadInfo),
        static_cast<uint8_t>(aLoadInfo->InternalContentPolicyType()));
    return false;
  }

  // Exempt addons from integrity policy checks.
  // Top level document loads have null LoadingPrincipal, but we don't apply
  // integrity policy to top level document loads right now.
  if (BasePrincipal::Cast(aLoadInfo->TriggeringPrincipal())
          ->OverridesCSP(aLoadInfo->GetLoadingPrincipal())) {
    LOG("ShouldLoad: [{}] Got a request from an addon, allowing it.",
        static_cast<void*>(aLoadInfo));
    return false;
  }

  // 2. Let parsedMetadata be the result of calling parse metadata with
  // request’s integrity metadata.
  // In our case, parsedMetadata is in loadInfo.
  Maybe<RequestMode> maybeRequestMode;
  aLoadInfo->GetRequestMode(&maybeRequestMode);
  if (maybeRequestMode.isNothing()) {
    // We don't have a request mode set explicitly, get it from the secFlags.
    // Just make sure that we aren't trying to get it from a
    // nsILoadInfo::SEC_ONLY_FOR_EXPLICIT_CONTENTSEC_CHECK loadInfo. In those
    // cases, we have to set the requestMode explicitly.
    MOZ_ASSERT(aLoadInfo->GetSecurityFlags() !=
               nsILoadInfo::SEC_ONLY_FOR_EXPLICIT_CONTENTSEC_CHECK);

    maybeRequestMode = Some(nsContentSecurityManager::SecurityModeToRequestMode(
        aLoadInfo->GetSecurityMode()));
  }

  RequestMode requestMode = *maybeRequestMode;

  if (MOZ_LOG_TEST(sIntegrityPolicyServiceLogModule, LogLevel::Debug)) {
    nsAutoString integrityMetadata;
    aLoadInfo->GetIntegrityMetadata(integrityMetadata);

    LOG("ShouldLoad: [{}] uri={} destination={} "
        "requestMode={} integrityMetadata={}",
        static_cast<void*>(aLoadInfo), aContentLocation->GetSpecOrDefault(),
        static_cast<uint8_t>(*destination), static_cast<uint8_t>(requestMode),
        NS_ConvertUTF16toUTF8(integrityMetadata).get());
  }

  // 3. If parsedMetadata is not the empty set and request’s mode is either
  // "cors" or "same-origin", return "Allowed".
  if (requestMode == RequestMode::Cors ||
      requestMode == RequestMode::Same_origin) {
    nsAutoString integrityMetadata;
    aLoadInfo->GetIntegrityMetadata(integrityMetadata);

    SRIMetadata outMetadata;
    dom::SRICheck::IntegrityMetadata(integrityMetadata,
                                     aContentLocation->GetSpecOrDefault(),
                                     nullptr, &outMetadata);

    if (outMetadata.IsValid()) {
      LOG("ShouldLoad: [{}] Allowed because we have valid a integrity.",
          static_cast<void*>(aLoadInfo));
      return false;
    }
  }

  // 4. If request's url is local, return "Allowed".
  if (aContentLocation->SchemeIs("data") ||
      aContentLocation->SchemeIs("blob") ||
      aContentLocation->SchemeIs("about")) {
    LOG("ShouldLoad: [{}] Allowed because we have data or blob.",
        static_cast<void*>(aLoadInfo));
    return false;
  }

  // We only support integrity policy for documents so far.
  nsCOMPtr<nsIPolicyContainer> policyContainer =
      aLoadInfo->GetPolicyContainer();
  if (!policyContainer) {
    LOG("ShouldLoad: [{}] No policy container", static_cast<void*>(aLoadInfo));
    return false;
  }

  // 5. Let policy be policyContainer’s integrity policy.
  // 6. Let reportPolicy be policyContainer’s report only integrity policy.
  // Our IntegrityPolicy struct contains both the enforcement and
  // report-only policies.
  RefPtr<IntegrityPolicy> policy = IntegrityPolicy::Cast(
      PolicyContainer::Cast(policyContainer)->GetIntegrityPolicy());
  if (!policy) {
    // 7. If both policy and reportPolicy are empty integrity policy structs,
    // return "Allowed".
    LOG("ShouldLoad: [{}] No integrity policy", static_cast<void*>(aLoadInfo));
    return false;
  }

  // TODO: 8. Let global be request’s client’s global object.
  // TODO: 9. If global is not a Window nor a WorkerGlobalScope, return
  // "Allowed".

  // Steps 10-13 in policy->PolicyContains(...)
  bool contains = false;
  bool roContains = false;
  policy->PolicyContains(*destination, &contains, &roContains);

  // 14. If block is true or reportBlock is true, then report violation
  // with request, block, reportBlock, policy and reportPolicy.
  if (contains || roContains) {
    ReportToConsole(aContentLocation, aLoadInfo, *destination, contains,
                    roContains);
    ReportViolation(aContentLocation, aLoadInfo, *destination, policy, contains,
                    roContains);
  }

  // 15. If block is true, then return "Blocked"; otherwise "Allowed".
  return contains;
}

const char* GetReportMessageKey(bool aEnforcing,
                                IntegrityPolicy::DestinationType aDestination) {
  // If we are not enforcing, we are reporting only.
  switch (aDestination) {
    case IntegrityPolicy::DestinationType::Script:
      return aEnforcing ? "IntegrityPolicyEnforceBlockedScript"
                        : "IntegrityPolicyReportOnlyBlockedScript";
    case IntegrityPolicy::DestinationType::Style:
      return aEnforcing ? "IntegrityPolicyEnforceBlockedStylesheet"
                        : "IntegrityPolicyReportOnlyBlockedStylesheet";
    default:
      MOZ_ASSERT_UNREACHABLE("Unhandled destination type");
      return nullptr;
  }
}

void IntegrityPolicyService::ReportToConsole(
    nsIURI* aContentLocation, nsILoadInfo* aLoadInfo,
    IntegrityPolicy::DestinationType aDestination, bool aEnforce,
    bool aReportOnly) const {
  if (nsContentUtils::IsPreloadType(aLoadInfo->InternalContentPolicyType())) {
    return;  // Don't report for preloads.
  }

  const char* messageKey = GetReportMessageKey(aEnforce, aDestination);
  NS_ENSURE_TRUE_VOID(messageKey);

  // We just report to the console for now. We should use the reporting API
  // in the future.
  AutoTArray<nsString, 1> params = {
      NS_ConvertUTF8toUTF16(aContentLocation->GetSpecOrDefault())};
  nsAutoString localizedMsg;
  nsresult rv = nsContentUtils::FormatLocalizedString(
      nsContentUtils::eSECURITY_PROPERTIES, messageKey, params, localizedMsg);
  NS_ENSURE_SUCCESS_VOID(rv);

  uint64_t windowID = aLoadInfo->GetInnerWindowID();

  nsContentUtils::ReportToConsoleByWindowID(
      localizedMsg,
      aEnforce ? nsIScriptError::errorFlag : nsIScriptError::warningFlag,
      "Security"_ns, windowID);
}

// https://w3c.github.io/webappsec-subresource-integrity/#report-violation
void dom::IntegrityPolicyService::ReportViolation(
    nsIURI* aContentLocation, nsILoadInfo* aLoadInfo,
    IntegrityPolicy::DestinationType aDestination,
    const IntegrityPolicy* aPolicy, bool aEnforce, bool aReportOnly) const {
  // 1. Assert: request’s client is not null.
  // 2. Let settingsObject be request’s client.
  // 3. Let global be settingsObject’s global object.
  nsCOMPtr<nsISupports> loadingContext = aLoadInfo->GetLoadingContext();
  RefPtr<Document> doc;
  if (nsCOMPtr<nsINode> node = do_QueryInterface(loadingContext)) {
    doc = node->OwnerDoc();
  } else if (nsCOMPtr<nsPIDOMWindowOuter> window =
                 do_QueryInterface(loadingContext)) {
    doc = window->GetDoc();
  }

  if (NS_WARN_IF(!doc)) {
    return;
  }

  nsPIDOMWindowInner* window = doc->GetInnerWindow();
  if (NS_WARN_IF(!window)) {
    return;
  }
  nsCOMPtr<nsIGlobalObject> global = window->AsGlobal();

  // 4. Assert: global is a Window or a WorkerGlobalScope.

  // 5. Let url be null.
  // 6. If global is a Window, set url to global’s associated Document’s URL.
  nsCOMPtr<nsIURI> uri = doc->GetDocumentURI();  // XXX Maybe not the right URL?

  // 7. If global is a WorkerGlobalScope, set url to global’s URL.
  // TODO(bug 1969279): Worker support.

  // 8. Assert: url is a URL.
  if (NS_WARN_IF(!uri)) {
    return;
  }

  // 9. Let documentURL be the result of strip URL for use in reports on url.
  nsAutoCString documentURL;
  ReportingUtils::StripURL(uri, documentURL);
  NS_ConvertUTF8toUTF16 documentURLUTF16(documentURL);

  // 10. Let blockedURL be the result of strip URL for use in reports on
  // request’s URL.
  nsAutoCString blockedURL;
  ReportingUtils::StripURL(aContentLocation, blockedURL);

  nsAutoCString destination;
  switch (aDestination) {
    case IntegrityPolicy::DestinationType::Script:
      destination = "script"_ns;
      break;
    case IntegrityPolicy::DestinationType::Style:
      destination = "style"_ns;
      break;
  }

  nsTArray<nsCString> enforcementEndpoints;
  nsTArray<nsCString> reportOnlyEndpoints;
  aPolicy->Endpoints(enforcementEndpoints, reportOnlyEndpoints);

  // 11. If block is true, for each endpoint in policy’s endpoints:
  if (aEnforce) {
    for (const nsCString& endpoint : enforcementEndpoints) {
      // 11.1. Let body be a new IntegrityViolationReportBody, initialized as
      // follows:
      //
      // documentURL
      //     documentURL
      // blockedURL
      //     blockedURL
      // destination
      //    request’s destination
      // reportOnly
      //    false
      RefPtr<IntegrityViolationReportBody> body =
          new IntegrityViolationReportBody(global, documentURL, blockedURL,
                                           destination, false);

      // 11.2. Generate and queue a report with the following arguments:
      //
      // context
      //      settingsObject
      // type
      //      "integrity-violation"
      // destination
      //      endpoint
      // data
      //      body
      ReportingUtils::Report(global, nsGkAtoms::integrity_violation,
                             NS_ConvertUTF8toUTF16(endpoint), documentURLUTF16,
                             body);
    }
  }

  // 11. If reportBlock is true, for each endpoint in reportPolicy’s endpoints:
  if (aReportOnly) {
    for (const nsCString& endpoint : reportOnlyEndpoints) {
      // 11.1. Let reportBody be a new IntegrityViolationReportBody, initialized
      // as follows:
      //
      // documentURL
      //     documentURL
      // blockedURL
      //     blockedURL
      // destination
      //    request’s destination
      // reportOnly
      //    true
      RefPtr<IntegrityViolationReportBody> reportBody =
          new IntegrityViolationReportBody(global, documentURL, blockedURL,
                                           destination, true);

      // 11.2. Generate and queue a report with the following arguments:
      //
      // context
      //      settingsObject
      // type
      //      "integrity-violation"
      // destination
      //      endpoint
      // data
      //      reportBody
      ReportingUtils::Report(global, nsGkAtoms::integrity_violation,
                             NS_ConvertUTF8toUTF16(endpoint), documentURLUTF16,
                             reportBody);
    }
  }
}

NS_IMPL_ISUPPORTS(IntegrityPolicyService, nsIContentPolicy)

}  // namespace mozilla::dom

#undef LOG
