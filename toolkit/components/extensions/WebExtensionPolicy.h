/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_extensions_WebExtensionPolicy_h
#define mozilla_extensions_WebExtensionPolicy_h

#include "MainThreadUtils.h"
#include "mozilla/RWLock.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/BrowsingContextGroup.h"
#include "mozilla/dom/Nullable.h"
#include "mozilla/dom/WebExtensionPolicyBinding.h"
#include "mozilla/dom/WindowProxyHolder.h"
#include "mozilla/extensions/MatchPattern.h"

#include "jspubtd.h"

#include "mozilla/Result.h"
#include "mozilla/WeakPtr.h"
#include "nsCOMPtr.h"
#include "nsCycleCollectionParticipant.h"
#include "nsGkAtoms.h"
#include "nsISupports.h"
#include "nsWrapperCache.h"

namespace mozilla {
namespace dom {
class Promise;
}  // namespace dom

namespace extensions {

using dom::WebAccessibleResourceInit;
using dom::WebExtensionInit;
using dom::WebExtensionLocalizeCallback;

class DocInfo;
class WebExtensionContentScript;

class WebAccessibleResource final {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(WebAccessibleResource)

  WebAccessibleResource(dom::GlobalObject& aGlobal,
                        const WebAccessibleResourceInit& aInit,
                        ErrorResult& aRv);

  bool IsWebAccessiblePath(const nsACString& aPath) const {
    return mWebAccessiblePaths.Matches(aPath);
  }

  bool SourceMayAccessPath(const URLInfo& aURI, const nsACString& aPath) {
    return mWebAccessiblePaths.Matches(aPath) &&
           (IsHostMatch(aURI) || IsExtensionMatch(aURI));
  }

  bool IsHostMatch(const URLInfo& aURI) {
    return mMatches && mMatches->Matches(aURI);
  }

  bool IsExtensionMatch(const URLInfo& aURI);

 private:
  ~WebAccessibleResource() = default;

  MatchGlobSet mWebAccessiblePaths;
  RefPtr<MatchPatternSetCore> mMatches;
  RefPtr<AtomSet> mExtensionIDs;
};

/// The thread-safe component of the WebExtensionPolicy.
///
/// Acts as a weak reference to the base WebExtensionPolicy.
class WebExtensionPolicyCore final {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(WebExtensionPolicyCore)

  nsAtom* Id() const { return mId; }

  const nsCString& MozExtensionHostname() const { return mHostname; }

  nsIURI* BaseURI() const { return mBaseURI; }

  bool IsPrivileged() { return mIsPrivileged; }

  bool TemporarilyInstalled() { return mTemporarilyInstalled; }

  const nsString& Name() const { return mName; }

  nsAtom* Type() const { return mType; }

  uint32_t ManifestVersion() const { return mManifestVersion; }

  const nsString& ExtensionPageCSP() const { return mExtensionPageCSP; }

  const nsString& BaseCSP() const { return mBaseCSP; }

  const nsString& BackgroundWorkerScript() const {
    return mBackgroundWorkerScript;
  }

  bool IsWebAccessiblePath(const nsACString& aPath) const {
    for (const auto& resource : mWebAccessibleResources) {
      if (resource->IsWebAccessiblePath(aPath)) {
        return true;
      }
    }
    return false;
  }

  bool SourceMayAccessPath(const URLInfo& aURI, const nsACString& aPath) const;

  bool HasPermission(const nsAtom* aPermission) const {
    AutoReadLock lock(mLock);
    return mPermissions->Contains(aPermission);
  }

  void GetPermissions(nsTArray<nsString>& aResult) const MOZ_EXCLUDES(mLock) {
    AutoReadLock lock(mLock);
    return mPermissions->Get(aResult);
  }

  void SetPermissions(const nsTArray<nsString>& aPermissions)
      MOZ_EXCLUDES(mLock) {
    RefPtr<AtomSet> newPermissions = new AtomSet(aPermissions);
    AutoWriteLock lock(mLock);
    mPermissions = std::move(newPermissions);
  }

  bool CanAccessURI(const URLInfo& aURI, bool aExplicit = false,
                    bool aCheckRestricted = true,
                    bool aAllowFilePermission = false) const;

  // Try to get a reference to the cycle-collected main-thread-only
  // WebExtensionPolicy instance.
  //
  // Will return nullptr if the policy has already been unlinked or destroyed.
  WebExtensionPolicy* GetMainThreadPolicy() const
      MOZ_REQUIRES(sMainThreadCapability) {
    return mPolicy;
  }

 private:
  friend class WebExtensionPolicy;

  WebExtensionPolicyCore(dom::GlobalObject& aGlobal,
                         WebExtensionPolicy* aPolicy,
                         const WebExtensionInit& aInit, ErrorResult& aRv);

  ~WebExtensionPolicyCore() = default;

  void ClearPolicyWeakRef() MOZ_REQUIRES(sMainThreadCapability) {
    mPolicy = nullptr;
  }

  // Unless otherwise guarded by a capability, all members on
  // WebExtensionPolicyCore should be immutable and threadsafe.

  WebExtensionPolicy* MOZ_NON_OWNING_REF mPolicy
      MOZ_GUARDED_BY(sMainThreadCapability);

  const RefPtr<nsAtom> mId;
  /* const */ nsCString mHostname;
  /* const */ nsCOMPtr<nsIURI> mBaseURI;

  const nsString mName;
  const RefPtr<nsAtom> mType;
  const uint32_t mManifestVersion;
  /* const */ nsString mExtensionPageCSP;
  /* const */ nsString mBaseCSP;

  const bool mIsPrivileged;
  const bool mTemporarilyInstalled;

  const nsString mBackgroundWorkerScript;

  /* const */ nsTArray<RefPtr<WebAccessibleResource>> mWebAccessibleResources;

  mutable RWLock mLock{"WebExtensionPolicyCore"};
  RefPtr<AtomSet> mPermissions MOZ_GUARDED_BY(mLock);
  RefPtr<MatchPatternSetCore> mHostPermissions MOZ_GUARDED_BY(mLock);
};

class WebExtensionPolicy final : public nsISupports, public nsWrapperCache {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(WebExtensionPolicy)

  using ScriptArray = nsTArray<RefPtr<WebExtensionContentScript>>;

  static already_AddRefed<WebExtensionPolicy> Constructor(
      dom::GlobalObject& aGlobal, const WebExtensionInit& aInit,
      ErrorResult& aRv);

  WebExtensionPolicyCore* Core() const { return mCore; }

  nsAtom* Id() const { return mCore->Id(); }
  void GetId(nsAString& aId) const { aId = nsDependentAtomString(Id()); };

  const nsCString& MozExtensionHostname() const {
    return mCore->MozExtensionHostname();
  }
  void GetMozExtensionHostname(nsACString& aHostname) const {
    aHostname = MozExtensionHostname();
  }

  nsIURI* BaseURI() const { return mCore->BaseURI(); }
  void GetBaseURL(nsACString& aBaseURL) const {
    MOZ_ALWAYS_SUCCEEDS(mCore->BaseURI()->GetSpec(aBaseURL));
  }

  bool IsPrivileged() { return mCore->IsPrivileged(); }

  bool TemporarilyInstalled() { return mCore->TemporarilyInstalled(); }

  void GetURL(const nsAString& aPath, nsAString& aURL, ErrorResult& aRv) const;

  Result<nsString, nsresult> GetURL(const nsAString& aPath) const;

  void RegisterContentScript(WebExtensionContentScript& script,
                             ErrorResult& aRv);

  void UnregisterContentScript(const WebExtensionContentScript& script,
                               ErrorResult& aRv);

  void InjectContentScripts(ErrorResult& aRv);

  bool CanAccessURI(const URLInfo& aURI, bool aExplicit = false,
                    bool aCheckRestricted = true,
                    bool aAllowFilePermission = false) const {
    return mCore->CanAccessURI(aURI, aExplicit, aCheckRestricted,
                               aAllowFilePermission);
  }

  bool IsWebAccessiblePath(const nsACString& aPath) const {
    return mCore->IsWebAccessiblePath(aPath);
  }

  bool SourceMayAccessPath(const URLInfo& aURI, const nsACString& aPath) const {
    return mCore->SourceMayAccessPath(aURI, aPath);
  }

  bool HasPermission(const nsAtom* aPermission) const {
    return mCore->HasPermission(aPermission);
  }
  bool HasPermission(const nsAString& aPermission) const {
    RefPtr<nsAtom> atom = NS_AtomizeMainThread(aPermission);
    return HasPermission(atom);
  }

  static bool IsRestrictedDoc(const DocInfo& aDoc);
  static bool IsRestrictedURI(const URLInfo& aURI);

  nsCString BackgroundPageHTML() const;

  MOZ_CAN_RUN_SCRIPT
  void Localize(const nsAString& aInput, nsString& aResult) const;

  const nsString& Name() const { return mCore->Name(); }
  void GetName(nsAString& aName) const { aName = Name(); }

  nsAtom* Type() const { return mCore->Type(); }
  void GetType(nsAString& aType) const {
    aType = nsDependentAtomString(Type());
  };

  uint32_t ManifestVersion() const { return mCore->ManifestVersion(); }

  const nsString& ExtensionPageCSP() const { return mCore->ExtensionPageCSP(); }
  void GetExtensionPageCSP(nsAString& aCSP) const { aCSP = ExtensionPageCSP(); }

  const nsString& BaseCSP() const { return mCore->BaseCSP(); }
  void GetBaseCSP(nsAString& aCSP) const { aCSP = BaseCSP(); }

  already_AddRefed<MatchPatternSet> AllowedOrigins() {
    return do_AddRef(mHostPermissions);
  }
  void SetAllowedOrigins(MatchPatternSet& aAllowedOrigins);

  void GetPermissions(nsTArray<nsString>& aResult) const {
    mCore->GetPermissions(aResult);
  }
  void SetPermissions(const nsTArray<nsString>& aPermissions) {
    mCore->SetPermissions(aPermissions);
  }

  void GetContentScripts(ScriptArray& aScripts) const;
  const ScriptArray& ContentScripts() const { return mContentScripts; }

  bool Active() const { return mActive; }
  void SetActive(bool aActive, ErrorResult& aRv);

  bool PrivateBrowsingAllowed() const;

  bool CanAccessContext(nsILoadContext* aContext) const;

  bool CanAccessWindow(const dom::WindowProxyHolder& aWindow) const;

  void GetReadyPromise(JSContext* aCx,
                       JS::MutableHandle<JSObject*> aResult) const;
  dom::Promise* ReadyPromise() const { return mReadyPromise; }

  const nsString& BackgroundWorkerScript() const {
    return mCore->BackgroundWorkerScript();
  }
  void GetBackgroundWorker(nsString& aScriptURL) const {
    aScriptURL.Assign(BackgroundWorkerScript());
  }

  bool IsManifestBackgroundWorker(const nsAString& aWorkerScriptURL) const {
    return BackgroundWorkerScript().Equals(aWorkerScriptURL);
  }

  uint64_t GetBrowsingContextGroupId() const;
  uint64_t GetBrowsingContextGroupId(ErrorResult& aRv);

  static void GetActiveExtensions(
      dom::GlobalObject& aGlobal,
      nsTArray<RefPtr<WebExtensionPolicy>>& aResults);

  static already_AddRefed<WebExtensionPolicy> GetByID(
      dom::GlobalObject& aGlobal, const nsAString& aID);

  static already_AddRefed<WebExtensionPolicy> GetByHostname(
      dom::GlobalObject& aGlobal, const nsACString& aHostname);

  static already_AddRefed<WebExtensionPolicy> GetByURI(
      dom::GlobalObject& aGlobal, nsIURI* aURI);

  static bool IsRestrictedURI(dom::GlobalObject& aGlobal, const URLInfo& aURI) {
    return IsRestrictedURI(aURI);
  }

  static bool UseRemoteWebExtensions(dom::GlobalObject& aGlobal);
  static bool IsExtensionProcess(dom::GlobalObject& aGlobal);
  static bool BackgroundServiceWorkerEnabled(dom::GlobalObject& aGlobal);

  nsISupports* GetParentObject() const { return mParent; }

  virtual JSObject* WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) override;

 protected:
  ~WebExtensionPolicy();

 private:
  WebExtensionPolicy(dom::GlobalObject& aGlobal, const WebExtensionInit& aInit,
                     ErrorResult& aRv);

  bool Enable();
  bool Disable();

  nsCOMPtr<nsISupports> mParent;

  RefPtr<WebExtensionPolicyCore> mCore;

  dom::BrowsingContextGroup::KeepAlivePtr mBrowsingContextGroup;

  bool mActive = false;

  RefPtr<WebExtensionLocalizeCallback> mLocalizeCallback;

  // NOTE: This is a mirror of the object in `mCore`, except with the
  // non-threadsafe wrapper.
  RefPtr<MatchPatternSet> mHostPermissions;

  dom::Nullable<nsTArray<nsString>> mBackgroundScripts;

  nsTArray<RefPtr<WebExtensionContentScript>> mContentScripts;

  RefPtr<dom::Promise> mReadyPromise;
};

}  // namespace extensions
}  // namespace mozilla

#endif  // mozilla_extensions_WebExtensionPolicy_h
