/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "WindowsLocationProvider.h"

#include "GeolocationPosition.h"
#include "WindowsLocationParent.h"
#include "mozilla/Logging.h"
#include "mozilla/dom/GeolocationPositionErrorBinding.h"
#include "mozilla/dom/WindowsUtilsParent.h"
#include "mozilla/glean/DomGeolocationMetrics.h"
#include "mozilla/ipc/UtilityProcessManager.h"
#include "mozilla/ipc/UtilityProcessSandboxing.h"
#include "nsComponentManagerUtils.h"
#include "prtime.h"

namespace mozilla::dom {

LazyLogModule gWindowsLocationProviderLog("WindowsLocationProvider");
#define LOG(...) \
  MOZ_LOG(gWindowsLocationProviderLog, LogLevel::Debug, (__VA_ARGS__))

NS_IMPL_ISUPPORTS(WindowsLocationProvider, nsIGeolocationProvider)

WindowsLocationProvider::WindowsLocationProvider() {
  LOG("WindowsLocationProvider::WindowsLocationProvider(%p)", this);
  MOZ_ASSERT(XRE_IsParentProcess());
  MaybeCreateLocationActor();
}

WindowsLocationProvider::~WindowsLocationProvider() {
  LOG("WindowsLocationProvider::~WindowsLocationProvider(%p,%p,%p)", this,
      mActor.get(), mActorPromise.get());
  Send__delete__();
  ReleaseUtilityProcess();
}

void WindowsLocationProvider::MaybeCreateLocationActor() {
  LOG("WindowsLocationProvider::MaybeCreateLocationActor(%p)", this);
  if (mActor || mActorPromise) {
    return;
  }

  auto utilityProc = mozilla::ipc::UtilityProcessManager::GetSingleton();
  MOZ_ASSERT(utilityProc);

  // Create a PWindowsLocation actor in the Windows utility process.
  // This will attempt to launch the process if it doesn't already exist.
  RefPtr<WindowsLocationProvider> self = this;
  auto wuPromise = utilityProc->GetWindowsUtilsPromise();
  mActorPromise = wuPromise->Then(
      GetCurrentSerialEventTarget(), __func__,
      [self](RefPtr<WindowsUtilsParent> const& wup) {
        self->mActorPromise = nullptr;
        auto actor = MakeRefPtr<WindowsLocationParent>(self);
        if (!wup->SendPWindowsLocationConstructor(actor)) {
          LOG("WindowsLocationProvider(%p) SendPWindowsLocationConstructor "
              "failed",
              self.get());
          actor->DetachFromLocationProvider();
          self->mActor = nullptr;
          return WindowsLocationPromise::CreateAndReject(false, __func__);
        }
        LOG("WindowsLocationProvider connected to actor (%p,%p,%p)", self.get(),
            self->mActor.get(), self->mActorPromise.get());
        self->mActor = actor;
        return WindowsLocationPromise::CreateAndResolve(self->mActor, __func__);
      },
      [self](::mozilla::ipc::LaunchError&& err) {
        LOG("WindowsLocationProvider failed to connect to actor: [%s, %lX] "
            "(%p,%p,%p)",
            err.FunctionName().get(), err.ErrorCode(), self.get(),
            self->mActor.get(), self->mActorPromise.get());
        self->mActorPromise = nullptr;
        return WindowsLocationPromise::CreateAndReject(false, __func__);
      });

  if (mActor) {
    // Utility process already existed and mActorPromise was resolved
    // immediately.
    mActorPromise = nullptr;
  }
}

void WindowsLocationProvider::ReleaseUtilityProcess() {
  LOG("WindowsLocationProvider::ReleaseUtilityProcess(%p)", this);
  auto utilityProc = mozilla::ipc::UtilityProcessManager::GetIfExists();
  if (utilityProc) {
    utilityProc->ReleaseWindowsUtils();
  }
}

template <typename Fn>
bool WindowsLocationProvider::WhenActorIsReady(Fn&& fn) {
  if (mActor) {
    return fn(mActor);
  }

  if (mActorPromise) {
    mActorPromise->Then(
        GetCurrentSerialEventTarget(), __func__,
        [fn](const RefPtr<WindowsLocationParent>& actor) {
          (void)fn(actor.get());
          return actor;
        },
        [](bool) { return false; });
    return true;
  }

  // The remote process failed to start.
  return false;
}

bool WindowsLocationProvider::SendStartup() {
  LOG("WindowsLocationProvider::SendStartup(%p)", this);
  MaybeCreateLocationActor();
  return WhenActorIsReady(
      [](WindowsLocationParent* actor) { return actor->SendStartup(); });
}

bool WindowsLocationProvider::SendRegisterForReport(
    nsIGeolocationUpdate* aCallback) {
  LOG("WindowsLocationProvider::SendRegisterForReport(%p)", this);
  RefPtr<WindowsLocationProvider> self = this;
  RefPtr<nsIGeolocationUpdate> cb = aCallback;
  return WhenActorIsReady([self, cb](WindowsLocationParent* actor) {
    MOZ_ASSERT(!self->mCallback);
    if (actor->SendRegisterForReport()) {
      self->mCallback = cb;
      return true;
    }
    return false;
  });
}

bool WindowsLocationProvider::SendUnregisterForReport() {
  LOG("WindowsLocationProvider::SendUnregisterForReport(%p)", this);
  RefPtr<WindowsLocationProvider> self = this;
  return WhenActorIsReady([self](WindowsLocationParent* actor) {
    self->mCallback = nullptr;
    if (actor->SendUnregisterForReport()) {
      return true;
    }
    return false;
  });
}

bool WindowsLocationProvider::SendSetHighAccuracy(bool aEnable) {
  LOG("WindowsLocationProvider::SendSetHighAccuracy(%p)", this);
  return WhenActorIsReady([aEnable](WindowsLocationParent* actor) {
    return actor->SendSetHighAccuracy(aEnable);
  });
}

bool WindowsLocationProvider::Send__delete__() {
  LOG("WindowsLocationProvider::Send__delete__(%p)", this);
  return WhenActorIsReady([self = RefPtr{this}](WindowsLocationParent*) {
    if (WindowsLocationParent::Send__delete__(self->mActor)) {
      if (self->mActor) {
        self->mActor->DetachFromLocationProvider();
        self->mActor = nullptr;
      }
      return true;
    }
    return false;
  });
}

void WindowsLocationProvider::RecvUpdate(
    RefPtr<nsIDOMGeoPosition> aGeoPosition) {
  LOG("WindowsLocationProvider::RecvUpdate(%p)", this);
  if (!mCallback) {
    return;
  }

  mCallback->Update(aGeoPosition.get());

  if (!mEverUpdated) {
    mEverUpdated = true;
    glean::geolocation::fallback
        .EnumGet(glean::geolocation::FallbackLabel::eNone)
        .Add();
  }
}

void WindowsLocationProvider::RecvFailed(uint16_t err) {
  LOG("WindowsLocationProvider::RecvFailed(%p)", this);
  // Cannot get current location at this time.
  if (!mCallback) {
    return;
  }

  // We keep strong references to objects that we need to guarantee
  // will live past the NotifyError callback.
  RefPtr<WindowsLocationProvider> self = this;
  nsCOMPtr<nsIGeolocationUpdate> callback = mCallback;
  callback->NotifyError(err);
}

void WindowsLocationProvider::ActorStopped() {
  // ActorDestroy has run.  Make sure UtilityProcessHost no longer tries to use
  // it.
  ReleaseUtilityProcess();

  if (mWatching) {
    // Treat as remote geolocation error.
    mWatching = false;
    RecvFailed(GeolocationPositionError_Binding::POSITION_UNAVAILABLE);
    return;
  }

  MOZ_ASSERT(!mActorPromise);
  if (mActor) {
    mActor->DetachFromLocationProvider();
    mActor = nullptr;
  }
}

NS_IMETHODIMP
WindowsLocationProvider::Startup() {
  LOG("WindowsLocationProvider::Startup(%p, %p, %p)", this, mActor.get(),
      mActorPromise.get());
  SendStartup();
  return NS_OK;
}

NS_IMETHODIMP
WindowsLocationProvider::Watch(nsIGeolocationUpdate* aCallback) {
  LOG("WindowsLocationProvider::Watch(%p, %p, %p, %p, %d)", this, mActor.get(),
      mActorPromise.get(), aCallback, mWatching);
  if (mWatching) {
    return NS_OK;
  }

  if (SendRegisterForReport(aCallback)) {
    mWatching = true;
    return NS_OK;
  }

  return NS_ERROR_FAILURE;
}

NS_IMETHODIMP
WindowsLocationProvider::Shutdown() {
  LOG("WindowsLocationProvider::Shutdown(%p, %p, %p)", this, mActor.get(),
      mActorPromise.get());

  if (mWatching) {
    SendUnregisterForReport();
    mWatching = false;
  }

  return NS_OK;
}

NS_IMETHODIMP
WindowsLocationProvider::SetHighAccuracy(bool enable) {
  LOG("WindowsLocationProvider::SetHighAccuracy(%p, %p, %p, %s)", this,
      mActor.get(), mActorPromise.get(), enable ? "true" : "false");

  if (!SendSetHighAccuracy(enable)) {
    return NS_ERROR_FAILURE;
  }

  // Since we SendSetHighAccuracy asynchronously, we cannot say for sure
  // that it will succeed.  If it does fail then we will get a
  // RecvFailed IPC message.
  return NS_OK;
}

#undef LOG

}  // namespace mozilla::dom
