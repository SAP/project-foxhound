/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef IntegrityPolicyWAICT_h_
#define IntegrityPolicyWAICT_h_

#include "mozilla/MozPromise.h"
#include "mozilla/dom/IntegrityPolicy.h"
#include "mozilla/dom/ReportingBinding.h"
#include "mozilla/dom/WAICTManifestBinding.h"
#include "nsCOMPtr.h"
#include "nsHashKeys.h"
#include "nsIStreamLoader.h"
#include "nsTHashMap.h"
#include "nsTHashSet.h"
#include "nsWeakReference.h"

// Forward declaration for GTest access to private members.
class WAICTHeaderParsingTest;

class nsIPrincipal;
class nsIURI;

namespace mozilla::dom {

class Document;

class IntegrityPolicyWAICT : public nsIStreamLoaderObserver {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSISTREAMLOADEROBSERVER

  static already_AddRefed<IntegrityPolicyWAICT> Create(
      Document* aDocument, const nsACString& aHeader);

  void FlushConsoleMessages();

  bool ShouldHandle(IntegrityPolicy::DestinationType aDestination) {
    return !mManifestURL.IsEmpty() && mDestinations.contains(aDestination);
  }

  // This promise is always resolved with `true`.
  using WAICTManifestLoadedPromise =
      MozPromise<bool, bool, /* IsExclusive */ false>;
  RefPtr<WAICTManifestLoadedPromise> WaitForManifestLoad();

  bool MaybeCheckResourceIntegrity(
      nsIURI* aURI, IntegrityPolicy::DestinationType aDestination,
      const nsACString& aHash);

  enum class ManifestValidationStatus : uint8_t {
    OK,
    InvalidJSON,
    MissingHashes,
    InvalidHashFormat
  };

  static ManifestValidationStatus ValidateManifest(
      const nsACString& aManifestJSON, WAICTManifest& aOutManifest,
      IntegrityPolicyWAICT* aPolicy = nullptr);

 protected:
  virtual ~IntegrityPolicyWAICT();

 private:
  explicit IntegrityPolicyWAICT(Document* aDocument);

  nsresult ParseHeader(const nsACString& aHeader);
  void ResolvePromiseInvalidManifest();
  void FetchManifest();
  void ReportMessage(uint32_t aErrorFlags, const nsACString& aCategory,
                     const char* aMessageName,
                     const nsTArray<nsString>& aParams);
  void ReportViolation(nsIURI* aURI,
                       IntegrityPolicy::DestinationType aDestination,
                       IntegrityViolationReason aReason) const;

  nsWeakPtr mDocument;
  nsCOMPtr<nsIURI> mDocumentURI;
  nsCOMPtr<nsIPrincipal> mPrincipal;
  nsCString mManifestURL;
  uint64_t mMaxAge = 0;
  IntegrityPolicy::Destinations mDestinations;
  nsTArray<nsCString> mEndpoints;
  RefPtr<WAICTManifestLoadedPromise::Private> mPromise;
  // TODO(Bug 2017655): Use an nsURI as key.
  nsTHashMap<nsCString, nsCString> mHashes;
  nsTHashSet<nsCString> mAnyHashes;

  struct ConsoleMsgQueueElem {
    uint32_t mErrorFlags = 0;
    nsCString mCategory;
    nsCString mMessageName;
    nsTArray<nsString> mParams;
  };

  nsTArray<ConsoleMsgQueueElem> mConsoleMsgQueue;

  bool mQueueUpMessages = true;
  bool mEnforce = false;
  bool mManifestValid = false;

  friend class ::WAICTHeaderParsingTest;
};

}  // namespace mozilla::dom

#endif /* IntegrityPolicyWAICT_h_ */
