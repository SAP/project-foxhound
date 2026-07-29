/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PermissionObserver.h"

#include "PermissionStatusSink.h"
#include "PermissionUtils.h"
#include "mozilla/Array.h"
#include "mozilla/Services.h"
#include "mozilla/StaticPtr.h"
#include "mozilla/dom/BrowsingContext.h"
#include "mozilla/dom/ContentParent.h"
#include "mozilla/dom/Geolocation.h"
#include "mozilla/dom/WindowGlobalChild.h"
#include "nsIObserverService.h"
#include "nsIPermission.h"
#include "nsIPermissionMonitor.h"
#include "nsISupportsPrimitives.h"
#include "nsPIDOMWindowInlines.h"
#include "nsXULAppAPI.h"

namespace mozilla::dom {

namespace {
PermissionObserver* gInstance = nullptr;

class SystemPermissionObserver;
static StaticRefPtr<SystemPermissionObserver> sSystemObserver;

// Per-capability state query functions. Add one here for each new capability.

static PermissionState GetLocationSystemPermissionState() {
  return Geolocation::GetLocationOSPermission() ==
                 geolocation::SystemGeolocationPermissionBehavior::NoPrompt
             ? PermissionState::Granted
             : PermissionState::Prompt;
}

// Maps a PermissionName to its Windows AppCapability name and state query.
// This is the single place to extend when adding a new system permission.
struct CapabilityMapping {
  PermissionName mPermission;
  nsLiteralString mCapability;
  PermissionState (*mGetState)();
};

static const mozilla::Array<CapabilityMapping, 1> kCapabilityMappings{
    CapabilityMapping{PermissionName::Geolocation, u"location"_ns,
                      &GetLocationSystemPermissionState},
};

static const CapabilityMapping* FindMappingForPermission(PermissionName aName) {
  for (const auto& m : kCapabilityMappings) {
    if (m.mPermission == aName) {
      return &m;
    }
  }
  return nullptr;
}

static Maybe<std::pair<PermissionName, PermissionState>> GetSystemPermission(
    const nsAString& aCapability) {
  for (const auto& m : kCapabilityMappings) {
    if (aCapability.Equals(m.mCapability)) {
      return Some(std::make_pair(m.mPermission, m.mGetState()));
    }
  }
  return Nothing();
}

// Receives "system-permission-changed" from nsIObserverService and dispatches
// the updated state to content processes and parent-process sinks.
// Holds one nsIPermissionMonitor per monitored capability; the monitors are
// kept alive here for as long as this observer exists (until xpcom-shutdown).
class SystemPermissionObserver final : public nsIObserver {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIOBSERVER

  void EnsureMonitoring(PermissionName aName);

 private:
  ~SystemPermissionObserver() = default;

  struct MonitorEntry {
    PermissionName mPermission;
    RefPtr<nsIPermissionMonitor> mMonitor;
  };
  nsTArray<MonitorEntry> mMonitors;
};

NS_IMPL_ISUPPORTS(SystemPermissionObserver, nsIObserver)

void SystemPermissionObserver::EnsureMonitoring(PermissionName aName) {
  const CapabilityMapping* mapping = FindMappingForPermission(aName);
  if (!mapping) {
    return;
  }
  const bool alreadyMonitoring = std::any_of(
      mMonitors.begin(), mMonitors.end(),
      [aName](const MonitorEntry& e) { return e.mPermission == aName; });
  if (alreadyMonitoring) {
    return;
  }
  RefPtr<nsIPermissionMonitor> monitor =
      do_CreateInstance("@mozilla.org/permission-monitor;1");
  if (!monitor) {
    return;
  }
  if (NS_WARN_IF(NS_FAILED(monitor->StartMonitoring(mapping->mCapability)))) {
    return;
  }
  mMonitors.AppendElement(MonitorEntry{aName, std::move(monitor)});
}

NS_IMETHODIMP SystemPermissionObserver::Observe(nsISupports*,
                                                const char* aTopic,
                                                const char16_t* aData) {
  if (!aData || strcmp(aTopic, "system-permission-changed") != 0) {
    return NS_OK;
  }
  if (const auto update = GetSystemPermission(nsDependentString(aData))) {
    const auto [name, state] = *update;
    ContentParent::BroadcastSystemPermissionChanged(name, state);
    PermissionObserver::NotifySystemPermissionChanged(name, state);
  }
  return NS_OK;
}

void EnsureOSMonitoring(PermissionName aName) {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(XRE_IsParentProcess());
  if (!sSystemObserver) {
    nsCOMPtr<nsIObserverService> observerService =
        services::GetObserverService();
    if (NS_WARN_IF(!observerService)) {
      return;
    }
    RefPtr observer = MakeRefPtr<SystemPermissionObserver>();
    if (NS_WARN_IF(NS_FAILED(observerService->AddObserver(
            observer, "system-permission-changed", /*ownsWeak=*/false)))) {
      return;
    }
    sSystemObserver = observer;
    ClearOnShutdown(&sSystemObserver);
  }
  sSystemObserver->EnsureMonitoring(aName);
}

}  // namespace

NS_IMPL_ISUPPORTS(PermissionObserver, nsIObserver, nsISupportsWeakReference)

PermissionObserver::PermissionObserver() {
  MOZ_ASSERT_DEBUG_OR_FUZZING(NS_IsMainThread());
  MOZ_ASSERT(!gInstance);
}

PermissionObserver::~PermissionObserver() {
  MOZ_ASSERT_DEBUG_OR_FUZZING(NS_IsMainThread());
  MOZ_ASSERT(mSinks.IsEmpty());
  MOZ_ASSERT(gInstance == this);

  gInstance = nullptr;
}

/* static */
already_AddRefed<PermissionObserver> PermissionObserver::GetInstance() {
  MOZ_ASSERT_DEBUG_OR_FUZZING(NS_IsMainThread());

  RefPtr<PermissionObserver> instance = gInstance;
  if (!instance) {
    instance = new PermissionObserver();

    nsCOMPtr<nsIObserverService> obs = services::GetObserverService();
    if (NS_WARN_IF(!obs)) {
      return nullptr;
    }

    nsresult rv = obs->AddObserver(instance, "perm-changed", true);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return nullptr;
    }

    rv = obs->AddObserver(instance, "perm-changed-notify-only", true);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return nullptr;
    }

    rv = obs->AddObserver(instance, "browser-perm-changed", true);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return nullptr;
    }

    gInstance = instance;
  }

  return instance.forget();
}

void PermissionObserver::AddSink(PermissionStatusSink* aSink) {
  MOZ_ASSERT_DEBUG_OR_FUZZING(NS_IsMainThread());
  MOZ_ASSERT(aSink);
  MOZ_ASSERT(!mSinks.Contains(aSink));

  mSinks.AppendElement(aSink);
}

void PermissionObserver::RemoveSink(PermissionStatusSink* aSink) {
  MOZ_ASSERT_DEBUG_OR_FUZZING(NS_IsMainThread());
  MOZ_ASSERT(aSink);
  MOZ_ASSERT(mSinks.Contains(aSink));

  mSinks.RemoveElement(aSink);
}

/* static */
void PermissionObserver::EnsureMonitoringInParent(PermissionName aName) {
  MOZ_ASSERT(XRE_IsParentProcess());
  EnsureOSMonitoring(aName);
}

NS_IMETHODIMP
PermissionObserver::Observe(nsISupports* aSubject, const char* aTopic,
                            const char16_t* aData) {
  MOZ_ASSERT_DEBUG_OR_FUZZING(NS_IsMainThread());
  MOZ_ASSERT(!strcmp(aTopic, "perm-changed") ||
             !strcmp(aTopic, "perm-changed-notify-only") ||
             !strcmp(aTopic, "browser-perm-changed"));

  if (mSinks.IsEmpty()) {
    return NS_OK;
  }

  nsCOMPtr<nsIPermission> perm = nullptr;
  nsCOMPtr<nsPIDOMWindowInner> innerWindow = nullptr;
  nsAutoCString type;
  bool isBrowserPerm = !strcmp(aTopic, "browser-perm-changed");

  if (isBrowserPerm && aData && !NS_strcmp(aData, u"cleared")) {
    // Bulk browser permission clear — subject is an nsISupportsPRUint64
    // carrying the browserId. Only recompute sinks for that tab.
    uint64_t clearedBrowserId = 0;
    nsCOMPtr<nsISupportsPRUint64> wrapper = do_QueryInterface(aSubject);
    if (wrapper) {
      wrapper->GetData(&clearedBrowserId);
    }

    for (PermissionStatusSink* sink : mSinks) {
      if (!clearedBrowserId ||
          sink->MaybeAffectedByBrowserIdOnMainThread(clearedBrowserId)) {
        sink->PermissionChangedOnMainThread();
      }
    }
    return NS_OK;
  }

  if (!strcmp(aTopic, "perm-changed") || isBrowserPerm) {
    perm = do_QueryInterface(aSubject);
    if (!perm) {
      return NS_OK;
    }
    perm->GetType(type);
  } else if (!strcmp(aTopic, "perm-changed-notify-only")) {
    innerWindow = do_QueryInterface(aSubject);
    if (!innerWindow) {
      return NS_OK;
    }
    type = NS_ConvertUTF16toUTF8(aData);
  }

  Maybe<PermissionName> permission = TypeToPermissionName(type);
  if (permission) {
    for (PermissionStatusSink* sink : mSinks) {
      if (sink->Name() != permission.value()) {
        continue;
      }
      // Check for permissions that are changed for this sink's principal
      // via the "perm-changed" or "browser-perm-changed" notification.
      // These permissions affect the window the sink (PermissionStatus)
      // is held in directly.
      if (perm) {
        if (isBrowserPerm) {
          if (sink->MaybeUpdatedByBrowserPermOnMainThread(perm)) {
            sink->PermissionChangedOnMainThread();
          }
        } else if (sink->MaybeUpdatedByOnMainThread(perm)) {
          sink->PermissionChangedOnMainThread();
        }
      }
      // Check for permissions that are changed for this sink's principal
      // via the "perm-changed-notify-only" notification. These permissions
      // affect the window the sink (PermissionStatus) is held in indirectly-
      // if the window is same-party with the secondary key of a permission.
      // For example, a "3rdPartyFrameStorage^https://example.com" permission
      // would return true on these checks where sink is in a window that is
      // same-site with https://example.com.
      if (innerWindow &&
          sink->MaybeUpdatedByNotifyOnlyOnMainThread(innerWindow)) {
        sink->PermissionChangedOnMainThread();
      }
    }
  }

  return NS_OK;
}

/* static */
void PermissionObserver::NotifySystemPermissionChanged(PermissionName aName,
                                                       PermissionState aState) {
  MOZ_ASSERT(NS_IsMainThread());
  if (!gInstance) {
    return;
  }
  for (PermissionStatusSink* sink : gInstance->mSinks) {
    if (sink->Name() == aName) {
      sink->SystemPermissionChangedOnMainThread(aState);
    }
  }
}

}  // namespace mozilla::dom
