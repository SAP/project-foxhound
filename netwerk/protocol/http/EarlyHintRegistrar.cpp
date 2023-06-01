/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "EarlyHintRegistrar.h"

#include "EarlyHintPreloader.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/StaticPtr.h"
#include "nsIObserver.h"
#include "nsIObserverService.h"
#include "nsXULAppAPI.h"

namespace {
mozilla::StaticRefPtr<mozilla::net::EarlyHintRegistrar> gSingleton;
}  // namespace

namespace mozilla::net {

namespace {

class EHShutdownObserver final : public nsIObserver {
 public:
  EHShutdownObserver() = default;

  NS_DECL_ISUPPORTS
  NS_DECL_NSIOBSERVER

 private:
  ~EHShutdownObserver() = default;
};

NS_IMPL_ISUPPORTS(EHShutdownObserver, nsIObserver)

NS_IMETHODIMP
EHShutdownObserver::Observe(nsISupports* aSubject, const char* aTopic,
                            const char16_t* aData) {
  EarlyHintRegistrar::CleanUp();
  return NS_OK;
}

}  // namespace

EarlyHintRegistrar::EarlyHintRegistrar() {
  // EarlyHintRegistrar is a main-thread-only object.
  // All the operations should be run on main thread.
  // It should be used on chrome process only.
  MOZ_ASSERT(XRE_IsParentProcess());
  MOZ_ASSERT(NS_IsMainThread());
}

EarlyHintRegistrar::~EarlyHintRegistrar() { MOZ_ASSERT(NS_IsMainThread()); }

// static
void EarlyHintRegistrar::CleanUp() {
  MOZ_ASSERT(NS_IsMainThread());

  if (!gSingleton) {
    return;
  }

  for (auto& preloader : gSingleton->mEarlyHint) {
    if (auto p = preloader.GetData()) {
      // Don't delete entry from EarlyHintPreloader, because that would
      // invalidate the iterator.

      p->CancelChannel(NS_ERROR_ABORT, "EarlyHintRegistrar::CleanUp"_ns,
                       /* aDeleteEntry */ false);
    }
  }
  gSingleton->mEarlyHint.Clear();
}

// static
already_AddRefed<EarlyHintRegistrar> EarlyHintRegistrar::GetOrCreate() {
  MOZ_ASSERT(NS_IsMainThread());

  if (!gSingleton) {
    gSingleton = new EarlyHintRegistrar();
    nsCOMPtr<nsIObserverService> obs = services::GetObserverService();
    if (NS_WARN_IF(!obs)) {
      return nullptr;
    }
    nsCOMPtr<nsIObserver> observer = new EHShutdownObserver();
    nsresult rv =
        obs->AddObserver(observer, "profile-change-net-teardown", false);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return nullptr;
    }
    mozilla::ClearOnShutdown(&gSingleton);
  }
  return do_AddRef(gSingleton);
}

void EarlyHintRegistrar::DeleteEntry(uint64_t aEarlyHintPreloaderId) {
  MOZ_ASSERT(NS_IsMainThread());

  mEarlyHint.Remove(aEarlyHintPreloaderId);
}

void EarlyHintRegistrar::RegisterEarlyHint(uint64_t aEarlyHintPreloaderId,
                                           EarlyHintPreloader* aEhp) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(aEhp);

  mEarlyHint.InsertOrUpdate(aEarlyHintPreloaderId, RefPtr{aEhp});
}

bool EarlyHintRegistrar::LinkParentChannel(uint64_t aEarlyHintPreloaderId,
                                           nsIParentChannel* aParent,
                                           uint64_t aChannelId) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(aParent);

  RefPtr<EarlyHintPreloader> ehp;
  bool found = mEarlyHint.Get(aEarlyHintPreloaderId, getter_AddRefs(ehp));
  if (ehp) {
    ehp->OnParentReady(aParent, aChannelId);
  }
  MOZ_ASSERT(ehp || !found);
  return found;
}

}  // namespace mozilla::net
