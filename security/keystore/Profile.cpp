/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 et lcs=trail\:.,tab\:>~ :
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Profile.h"

#include "KeyStorage.h"

#include "mozilla/Services.h"
#include "mozilla/StaticPtr.h"

#include "nsAppDirectoryServiceDefs.h"
#include "nsIObserver.h"
#include "nsIObserverService.h"
#include "nsThreadManager.h"

namespace mozilla::storage::key {
constinit static nsString sProfilePath;

class KeyStorageObserver final : public nsIObserver {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIOBSERVER

 private:
  ~KeyStorageObserver() = default;
};

static mozilla::StaticRefPtr<KeyStorageObserver> sObserver;

NS_IMPL_ISUPPORTS(KeyStorageObserver, nsIObserver)

NS_IMETHODIMP
KeyStorageObserver::Observe(nsISupports*, const char* aTopic, const char16_t*) {
  MOZ_ASSERT(NS_IsMainThread());

  if (!strcmp(aTopic, "profile-do-change") ||
      !strcmp(aTopic, "profile-after-change")) {
    mozilla::StaticMutexAutoLock lock(sKeyMutex);

    nsCOMPtr<nsIFile> profileDir;
    nsresult rv = NS_GetSpecialDirectory(NS_APP_USER_PROFILE_50_DIR,
                                         getter_AddRefs(profileDir));
    if (NS_FAILED(rv) || !profileDir) {
      return NS_OK;
    }
    nsAutoString path;
    rv = profileDir->GetPath(path);
    NS_ENSURE_SUCCESS(rv, rv);
    sProfilePath = path;
  } else if (!strcmp(aTopic, "profile-before-change")) {
    Shutdown();
    sProfilePath.Truncate();
  } else if (!strcmp(aTopic, "xpcom-shutdown")) {
    nsCOMPtr<nsIObserverService> os = mozilla::services::GetObserverService();
    if (os) {
      os->RemoveObserver(this, "profile-do-change");
      os->RemoveObserver(this, "profile-after-change");
      os->RemoveObserver(this, "profile-before-change");
      os->RemoveObserver(this, "xpcom-shutdown");
    }
    // The observer service held the last live reference besides sObserver.
    // Drop ours so the observer is destroyed cleanly.
    sObserver = nullptr;
  }

  return NS_OK;
}

nsresult InitObserver() {
  MOZ_ASSERT(NS_IsMainThread());
  if (sObserver) {
    return NS_OK;
  }
  sObserver = new KeyStorageObserver();
  nsCOMPtr<nsIObserverService> os = mozilla::services::GetObserverService();
  NS_ENSURE_TRUE(os, NS_ERROR_FAILURE);
  os->AddObserver(sObserver, "profile-do-change", false);
  os->AddObserver(sObserver, "profile-after-change", false);
  os->AddObserver(sObserver, "profile-before-change", false);
  os->AddObserver(sObserver, "xpcom-shutdown", false);
  // Pick up the current profile if one is already active.
  sObserver->Observe(nullptr, "profile-do-change", nullptr);
  return NS_OK;
}

nsresult GetCurrentProfilePath(nsAString& aPath) {
  sKeyMutex.AssertCurrentThreadOwns();
  if (sProfilePath.IsEmpty()) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  aPath = sProfilePath;
  return NS_OK;
}
}  // namespace mozilla::storage::key
