/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IntegrityPolicyWAICT.h"

#include "IntegrityPolicy.h"
#include "WAICTUtils.h"
#include "mozilla/Logging.h"
#include "mozilla/StaticPrefs_security.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/IntegrityViolationReportBody.h"
#include "mozilla/dom/ReportingUtils.h"
#include "mozilla/dom/WindowGlobalChild.h"
#include "mozilla/net/SFV.h"
#include "nsCSPParser.h"
#include "nsContentUtils.h"
#include "nsIScriptError.h"

using namespace mozilla;

namespace mozilla::dom {

using mozilla::waict::gWaictLog;

NS_IMPL_ISUPPORTS(IntegrityPolicyWAICT, nsIStreamLoaderObserver)

IntegrityPolicyWAICT::IntegrityPolicyWAICT(Document* aDocument)
    // do_GetWeakReference internally guards against null aDocument.
    : mDocument(do_GetWeakReference(aDocument)),
      mDocumentURI(aDocument ? aDocument->GetDocumentURI() : nullptr),
      mPrincipal(aDocument ? aDocument->NodePrincipal() : nullptr) {}

IntegrityPolicyWAICT::~IntegrityPolicyWAICT() {
  if (mPromise) {
    ResolvePromiseInvalidManifest();
  }
}

RefPtr<IntegrityPolicyWAICT::WAICTManifestLoadedPromise>
IntegrityPolicyWAICT::WaitForManifestLoad() {
  MOZ_ASSERT(!mManifestURL.IsEmpty());
  return mPromise;
}

bool IntegrityPolicyWAICT::MaybeCheckResourceIntegrity(
    nsIURI* aURI, IntegrityPolicy::DestinationType aDestination,
    const nsACString& aHash) {
  MOZ_LOG_FMT(
      gWaictLog, LogLevel::Debug,
      "IntegrityPolicyWAICT::MaybeCheckResourceIntegrity aURI = {} aHash = {}",
      aURI->GetSpecOrDefault().get(), nsCString(aHash).get());

  // If manifest failed to load/validate, decision depends on mode
  if (!mManifestValid) {
    ReportViolation(aURI, aDestination,
                    IntegrityViolationReason::Invalid_manifest);

    if (mEnforce) {
      MOZ_LOG_FMT(
          gWaictLog, LogLevel::Warning,
          "IntegrityPolicyWAICT::MaybeCheckResourceIntegrity: Manifest not "
          "valid, enforce mode - blocking");
      return false;
    }
    MOZ_LOG_FMT(
        gWaictLog, LogLevel::Info,
        "IntegrityPolicyWAICT::MaybeCheckResourceIntegrity: Manifest not "
        "valid, audit mode - proceeding");
    return true;
  }

  if (!mHashes.IsEmpty()) {
    nsAutoCString spec;
    nsresult rv = aURI->GetSpec(spec);
    if (NS_SUCCEEDED(rv)) {
      if (auto hashValue = mHashes.Lookup(spec)) {
        if (*hashValue != aHash) {
          MOZ_LOG_FMT(gWaictLog, LogLevel::Warning,
                      "IntegrityPolicyWAICT::MaybeCheckResourceIntegrity: "
                      "Wrong hash for URL "
                      "({} != {})",
                      *hashValue, nsCString(aHash));

          nsCString spec = aURI->GetSpecOrDefault();
          nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(spec),
                                       NS_ConvertUTF8toUTF16(*hashValue),
                                       NS_ConvertUTF8toUTF16(aHash)};
          ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                        "WAICTHashMismatch", params);
          ReportViolation(aURI, aDestination,
                          IntegrityViolationReason::No_manifest_match);
          return !mEnforce;
        }

        MOZ_LOG_FMT(
            gWaictLog, LogLevel::Info,
            "IntegrityPolicyWAICT::MaybeCheckResourceIntegrity: Correct hash "
            "(URL-based)");
        return true;
      }
    }
  }

  if (!mAnyHashes.IsEmpty()) {
    if (mAnyHashes.Contains(aHash)) {
      MOZ_LOG_FMT(gWaictLog, LogLevel::Info,
                  "IntegrityPolicyWAICT::MaybeCheckResourceIntegrity: Hash "
                  "found in any_hashes");
      return true;
    }
  }

  MOZ_LOG_FMT(gWaictLog, LogLevel::Debug,
              "IntegrityPolicyWAICT::MaybeCheckResourceIntegrity: Hash not "
              "found in either "
              "lookup");

  nsCString spec = aURI->GetSpecOrDefault();
  nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(spec),
                               NS_ConvertUTF8toUTF16(aHash)};
  ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                "WAICTResourceNotInManifest", params);
  ReportViolation(aURI, aDestination,
                  IntegrityViolationReason::Missing_from_manifest);
  return !mEnforce;
}

/* static */
already_AddRefed<IntegrityPolicyWAICT> IntegrityPolicyWAICT::Create(
    Document* aDocument, const nsACString& aHeader) {
  if (!StaticPrefs::security_waict_enabled()) {
    return nullptr;
  }

  if (aHeader.IsEmpty()) {
    return nullptr;
  }

  RefPtr<IntegrityPolicyWAICT> policy = new IntegrityPolicyWAICT(aDocument);

  // We can't propagate the error here, because we would never flush
  // the console messages.
  if (NS_SUCCEEDED(policy->ParseHeader(aHeader))) {
    policy->FetchManifest();
  }

  return policy.forget();
}

nsresult IntegrityPolicyWAICT::ParseHeader(const nsACString& aHeader) {
  auto dict = net::SFV::ParseDict(aHeader);
  if (!dict.IsValid()) {
    nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(aHeader)};
    ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                  "WAICTHeaderParseError", params);
    return NS_ERROR_FAILURE;
  }

  auto destinationsResult =
      IntegrityPolicy::ParseDestinations(dict, /* aIsWAICT */ true);
  if (destinationsResult.isErr()) {
    nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(aHeader),
                                 u"destinations"_ns};
    ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                  "WAICTHeaderFieldParseError", params);

    return destinationsResult.unwrapErr();
  }
  mDestinations = destinationsResult.unwrap();

  auto endpointsResult = IntegrityPolicy::ParseEndpoints(dict);
  if (endpointsResult.isErr()) {
    nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(aHeader),
                                 u"endpoints"_ns};
    ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                  "WAICTHeaderFieldParseError", params);

    return endpointsResult.unwrapErr();
  }
  mEndpoints = endpointsResult.unwrap();

  auto maxAgeResult = waict::ParseMaxAge(dict);
  if (maxAgeResult.isErr()) {
    nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(aHeader), u"max-age"_ns};
    ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                  "WAICTHeaderFieldParseError", params);
    return maxAgeResult.unwrapErr();
  }
  mMaxAge = maxAgeResult.unwrap();

  auto modeResult = waict::ParseMode(dict);
  if (modeResult.isErr()) {
    nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(aHeader), u"mode"_ns};
    ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                  "WAICTHeaderFieldParseError", params);

    return modeResult.unwrapErr();
  }
  mEnforce = modeResult.unwrap() == waict::WaictMode::Enforce;

  // Make sure this is the last step. We use the existence of the manifest URL
  // as a trigger to activate WAICT.
  auto manifestURLResult = waict::ParseManifest(dict);
  if (manifestURLResult.isErr()) {
    nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(aHeader)};
    ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                  "WAICTHeaderManifestParseError", params);

    return manifestURLResult.unwrapErr();
  }
  mManifestURL = manifestURLResult.unwrap();

  return NS_OK;
}

static bool ValidateHashValue(const nsACString& aHash) {
  if (!nsCSPParser::isValidBase64Value(NS_ConvertUTF8toUTF16((aHash)))) {
    return false;
  }

  if (aHash.Length() != 43 && aHash.Length() != 44) {
    return false;
  }

  if (aHash.Length() == 44 && aHash[43] != '=') {
    return false;
  }

  if (aHash.Length() == 43 && aHash.Contains('=')) {
    return false;
  }

  return true;
}

IntegrityPolicyWAICT::ManifestValidationStatus
IntegrityPolicyWAICT::ValidateManifest(const nsACString& aManifestJSON,
                                       WAICTManifest& aOutManifest,
                                       IntegrityPolicyWAICT* aPolicy) {
  if (aManifestJSON.IsEmpty() || !aOutManifest.Init(aManifestJSON)) {
    if (aPolicy) {
      aPolicy->ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                             "WAICTManifestJSONParseError", {});
    }
    return ManifestValidationStatus::InvalidJSON;
  }

  bool hasHashes = aOutManifest.mHashes.WasPassed() &&
                   !aOutManifest.mHashes.Value().Entries().IsEmpty();
  bool hasAnyHashes = aOutManifest.mAny_hashes.WasPassed() &&
                      !aOutManifest.mAny_hashes.Value().IsEmpty();

  if (!hasHashes && !hasAnyHashes) {
    return ManifestValidationStatus::MissingHashes;
  }

  if (hasHashes) {
    for (const auto& entry : aOutManifest.mHashes.Value().Entries()) {
      if (entry.mKey.IsEmpty() || !ValidateHashValue(entry.mValue)) {
        if (aPolicy) {
          nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(entry.mKey),
                                       NS_ConvertUTF8toUTF16(entry.mValue)};
          aPolicy->ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                                 "WAICTManifestInvalidHash", params);
        }

        return ManifestValidationStatus::InvalidHashFormat;
      }
    }
  }

  if (hasAnyHashes) {
    for (const auto& hash : aOutManifest.mAny_hashes.Value()) {
      if (!ValidateHashValue(hash)) {
        if (aPolicy) {
          nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(hash)};
          aPolicy->ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                                 "WAICTManifestInvalidAnyHash", params);
        }

        return ManifestValidationStatus::InvalidHashFormat;
      }
    }
  }

  return ManifestValidationStatus::OK;
}

NS_IMETHODIMP IntegrityPolicyWAICT::OnStreamComplete(nsIStreamLoader* aLoader,
                                                     nsISupports* context,
                                                     nsresult aStatus,
                                                     uint32_t aDataLen,
                                                     const uint8_t* aData) {
  MOZ_LOG_FMT(gWaictLog, LogLevel::Debug,
              "IntegrityPolicyWAICT::OnStreamComplete: dataLen = {}", aDataLen);

  if (NS_FAILED(aStatus)) {
    ResolvePromiseInvalidManifest();
    return NS_OK;
  }

  nsDependentCSubstring data(reinterpret_cast<const char*>(aData), aDataLen);
  WAICTManifest manifest;
  ManifestValidationStatus status = ValidateManifest(data, manifest, this);
  if (status != ManifestValidationStatus::OK) {
    MOZ_LOG_FMT(gWaictLog, LogLevel::Warning,
                "Failed to validate WAICT manifest, error= {}",
                static_cast<uint8_t>(status));
    ResolvePromiseInvalidManifest();
    return NS_OK;
  }

  MOZ_LOG_FMT(gWaictLog, LogLevel::Debug, "Manifest validation successful");

  if (StaticPrefs::security_waict_downgrade_protection_enable() && mEnforce &&
      mDocumentURI) {
    if (RefPtr<Document> doc = do_QueryReferent(mDocument)) {
      if (WindowGlobalChild* wgc = doc->GetWindowGlobalChild()) {
        wgc->SendSetSiteIntegrityProtected(WrapNotNull(mDocumentURI), mMaxAge);
      }
    }
  }

  if (manifest.mHashes.WasPassed()) {
    MOZ_ASSERT(mHashes.IsEmpty());
    nsCOMPtr<nsIURI> uri;
    nsAutoCString spec;
    for (const auto& entry : manifest.mHashes.Value().Entries()) {
      if (NS_FAILED(NS_NewURI(getter_AddRefs(uri), entry.mKey, nullptr,
                              mDocumentURI)) ||
          NS_FAILED(uri->GetSpec(spec))) {
        nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(entry.mKey)};
        ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                      "WAICTManifestInvalidURL", params);
        ResolvePromiseInvalidManifest();
        return NS_OK;
      }

      mHashes.InsertOrUpdate(spec, entry.mValue);
    }
  }

  if (manifest.mAny_hashes.WasPassed()) {
    MOZ_ASSERT(mAnyHashes.IsEmpty());
    for (const auto& hash : manifest.mAny_hashes.Value()) {
      mAnyHashes.Insert(hash);
    }
  }

  mManifestValid = true;
  mPromise->Resolve(true, __func__);
  return NS_OK;
}

void IntegrityPolicyWAICT::ResolvePromiseInvalidManifest() {
  mManifestValid = false;
  mPromise->Resolve(true, __func__);
}

void IntegrityPolicyWAICT::FetchManifest() {
  MOZ_LOG_FMT(gWaictLog, LogLevel::Debug,
              "IntegrityPolicyWAICT::FetchManifest: mManifestURL={}",
              mManifestURL.get());

  MOZ_ASSERT(!mPromise);
  mPromise = MakeRefPtr<WAICTManifestLoadedPromise::Private>(__func__);

  nsCOMPtr<nsIURI> uri;
  nsresult rv =
      NS_NewURI(getter_AddRefs(uri), mManifestURL, nullptr, mDocumentURI);
  if (NS_FAILED(rv)) {
    nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(mManifestURL)};
    ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                  "WAICTManifestFetchURLParseError", params);
    ResolvePromiseInvalidManifest();
    return;
  }

  nsCOMPtr<nsIStreamLoader> loader;
  rv = NS_NewStreamLoader(
      getter_AddRefs(loader), uri, this, mPrincipal,
      nsILoadInfo::SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
      nsIContentPolicy::TYPE_OTHER, /* aLoadGroup */ nullptr,
      /* aCallbacks */ nullptr, /* aLoadFlags */ nsIRequest::LOAD_BACKGROUND);
  if (NS_FAILED(rv)) {
    nsTArray<nsString> params = {NS_ConvertUTF8toUTF16(mManifestURL)};
    ReportMessage(nsIScriptError::errorFlag, "WAICT"_ns,
                  "WAICTManifestFetchError", params);
    ResolvePromiseInvalidManifest();
  }
}

void IntegrityPolicyWAICT::FlushConsoleMessages() {
  mQueueUpMessages = false;

  RefPtr<Document> doc = do_QueryReferent(mDocument);
  if (NS_WARN_IF(!doc)) {
    mConsoleMsgQueue.Clear();
    return;
  }

  for (const auto& elem : mConsoleMsgQueue) {
    nsContentUtils::ReportToConsole(elem.mErrorFlags, elem.mCategory, doc,
                                    PropertiesFile::SECURITY_PROPERTIES,
                                    elem.mMessageName.get(), elem.mParams);
  }
  mConsoleMsgQueue.Clear();
}

void IntegrityPolicyWAICT::ReportMessage(uint32_t aErrorFlags,
                                         const nsACString& aCategory,
                                         const char* aMessageName,
                                         const nsTArray<nsString>& aParams) {
  if (mQueueUpMessages) {
    ConsoleMsgQueueElem& elem = *mConsoleMsgQueue.AppendElement();
    elem.mErrorFlags = aErrorFlags;
    elem.mCategory = aCategory;
    elem.mMessageName = nsCString(aMessageName);
    elem.mParams = aParams.Clone();
    return;
  }

  nsCOMPtr<Document> doc = do_QueryReferent(mDocument);
  if (NS_WARN_IF(!doc)) {
    return;
  }

  nsContentUtils::ReportToConsole(aErrorFlags, aCategory, doc,
                                  PropertiesFile::SECURITY_PROPERTIES,
                                  aMessageName, aParams);
}

void IntegrityPolicyWAICT::ReportViolation(
    nsIURI* aURI, IntegrityPolicy::DestinationType aDestination,
    IntegrityViolationReason aReason) const {
  nsCOMPtr<Document> doc = do_QueryReferent(mDocument);
  if (!doc) {
    return;
  }

  nsPIDOMWindowInner* window = doc->GetInnerWindow();
  if (NS_WARN_IF(!window)) {
    return;
  }
  nsCOMPtr<nsIGlobalObject> global = window->AsGlobal();

  if (NS_WARN_IF(!mDocumentURI)) {
    return;
  }

  nsAutoCString documentURL;
  ReportingUtils::StripURL(mDocumentURI, documentURL);
  NS_ConvertUTF8toUTF16 documentURLUTF16(documentURL);

  nsAutoCString blockedURL;
  ReportingUtils::StripURL(aURI, blockedURL);

  nsAutoCString destination;
  switch (aDestination) {
    case IntegrityPolicy::DestinationType::Script:
      destination = "script"_ns;
      break;
    case IntegrityPolicy::DestinationType::Style:
      destination = "style"_ns;
      break;
    case IntegrityPolicy::DestinationType::Image:
      destination = "image"_ns;
      break;
  }

  for (const nsCString& endpoint : mEndpoints) {
    RefPtr<IntegrityViolationReportBody> body =
        new IntegrityViolationReportBody(global, documentURL, blockedURL,
                                         destination, !mEnforce,
                                         Nullable(aReason));

    ReportingUtils::Report(global, nsGkAtoms::integrity_violation,
                           NS_ConvertUTF8toUTF16(endpoint), documentURLUTF16,
                           body);
  }
}

}  // namespace mozilla::dom
