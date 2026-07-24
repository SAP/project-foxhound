/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GPUProcessHost.h"
#include "chrome/common/process_watcher.h"
#include "gfxPlatform.h"
#include "mozilla/dom/ContentParent.h"
#include "mozilla/gfx/GPUChild.h"
#include "mozilla/gfx/Logging.h"
#include "mozilla/layers/SynchronousTask.h"
#include "mozilla/Preferences.h"
#include "mozilla/StaticPrefs_layers.h"
#include "VRGPUChild.h"
#include "mozilla/ipc/ProcessUtils.h"
#ifdef MOZ_WIDGET_ANDROID
#  include "mozilla/java/GeckoProcessManagerWrappers.h"
#endif
#if defined(XP_MACOSX) && defined(MOZ_SANDBOX)
#  include "mozilla/SandboxSettings.h"
#endif

namespace mozilla {
namespace gfx {

#if defined(XP_MACOSX) && defined(MOZ_SANDBOX)
bool GPUProcessHost::sLaunchWithMacSandbox = false;
#endif

using namespace ipc;

GPUProcessHost::GPUProcessHost(Listener* aListener)
    : GeckoChildProcessHost(GeckoProcessType_GPU),
      mListener(aListener),
      mLaunchPhase(LaunchPhase::Unlaunched),
      mProcessToken(0),
      mShutdownRequested(false),
      mChannelClosed(false),
      mLiveToken(new media::Refcountable<bool>(true)) {
  MOZ_COUNT_CTOR(GPUProcessHost);

#if defined(XP_MACOSX) && defined(MOZ_SANDBOX)
  if (!sLaunchWithMacSandbox) {
    sLaunchWithMacSandbox = IsGPUSandboxEnabled();
  }
  mDisableOSActivityMode = sLaunchWithMacSandbox;
#endif
}

GPUProcessHost::~GPUProcessHost() { MOZ_COUNT_DTOR(GPUProcessHost); }

bool GPUProcessHost::Launch(geckoargs::ChildProcessArgs aExtraOpts) {
  MOZ_ASSERT(mLaunchPhase == LaunchPhase::Unlaunched);
  MOZ_ASSERT(!mGPUChild);
  MOZ_ASSERT(!gfxPlatform::IsHeadless());

  mPrefSerializer = MakeUnique<ipc::SharedPreferenceSerializer>();
  if (!mPrefSerializer->SerializeToSharedMemory(GeckoProcessType_GPU,
                                                /* remoteType */ ""_ns)) {
    return false;
  }
  mPrefSerializer->AddSharedPrefCmdLineArgs(*this, aExtraOpts);

#if defined(XP_WIN) && defined(MOZ_SANDBOX)
  mSandboxLevel = Preferences::GetInt("security.sandbox.gpu.level");
#endif

  mLaunchPhase = LaunchPhase::Waiting;
  mLaunchTime = TimeStamp::Now();

  if (!GeckoChildProcessHost::AsyncLaunch(std::move(aExtraOpts))) {
    mLaunchPhase = LaunchPhase::Complete;
    mPrefSerializer = nullptr;
    return false;
  }
  return true;
}

bool GPUProcessHost::WaitForLaunch() {
  MOZ_ASSERT(mLaunchPhase != LaunchPhase::Unlaunched);
  if (mLaunchPhase == LaunchPhase::Complete) {
    return !!mGPUChild;
  }

  int32_t timeoutMs =
      StaticPrefs::layers_gpu_process_startup_timeout_ms_AtStartup();

  // If one of the following environment variables are set we can effectively
  // ignore the timeout - as we can guarantee the compositor process will be
  // terminated
  if (PR_GetEnv("MOZ_DEBUG_CHILD_PROCESS") ||
      PR_GetEnv("MOZ_DEBUG_CHILD_PAUSE")) {
    timeoutMs = 0;
  }

  if (mLaunchPhase == LaunchPhase::Waiting) {
    // Our caller expects the connection to be finished by the time we return,
    // so we immediately set up the IPDL actor and fire callbacks. The IO thread
    // will still dispatch a notification to the main thread - we'll just ignore
    // it.
    bool result = GeckoChildProcessHost::WaitUntilConnected(timeoutMs);
    InitAfterConnect(result);
    if (!result) {
      return false;
    }
  }
  MOZ_ASSERT(mLaunchPhase == LaunchPhase::Connected);
  // Our caller expects post-connection initialization tasks, such as ensuring
  // the GPUChild is initialized, to be finished by the time we return, so
  // finish these tasks synchronously now.
  return CompleteInitSynchronously();
}

void GPUProcessHost::OnChannelConnected(base::ProcessId peer_pid) {
  MOZ_ASSERT(!NS_IsMainThread());

  GeckoChildProcessHost::OnChannelConnected(peer_pid);

  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "GPUProcessHost::OnChannelConnected",
      [self = this, liveToken = mLiveToken]() {
        if (*liveToken && self->mLaunchPhase == LaunchPhase::Waiting) {
          self->InitAfterConnect(true);
        }
      }));
}

static uint64_t sProcessTokenCounter = 0;

void GPUProcessHost::InitAfterConnect(bool aSucceeded) {
  MOZ_ASSERT(mLaunchPhase == LaunchPhase::Waiting);
  MOZ_ASSERT(!mGPUChild);

  mPrefSerializer = nullptr;

  if (aSucceeded) {
    mLaunchPhase = LaunchPhase::Connected;
    mProcessToken = ++sProcessTokenCounter;
    mGPUChild = MakeRefPtr<GPUChild>(this);
    DebugOnly<bool> rv = TakeInitialEndpoint().Bind(mGPUChild.get());
    MOZ_ASSERT(rv);

    nsTArray<RefPtr<GPUChild::InitPromiseType>> initPromises;
    initPromises.AppendElement(mGPUChild->Init());

#ifdef MOZ_WIDGET_ANDROID
    nsCOMPtr<nsISerialEventTarget> launcherThread(GetIPCLauncher());
    MOZ_ASSERT(launcherThread);
    RefPtr<GPUChild::InitPromiseType> csmPromise =
        InvokeAsync(
            launcherThread, __func__,
            [] {
              java::CompositorSurfaceManager::LocalRef csm =
                  java::GeckoProcessManager::GetCompositorSurfaceManager();
              return MozPromise<java::CompositorSurfaceManager::GlobalRef, Ok,
                                true>::CreateAndResolve(csm, __func__);
            })
            ->Map(GetCurrentSerialEventTarget(), __func__,
                  [self = this, liveToken = mLiveToken](
                      java::CompositorSurfaceManager::GlobalRef&& aCsm) {
                    if (*liveToken) {
                      self->mCompositorSurfaceManager = aCsm;
                    }
                    return Ok{};
                  });
    initPromises.AppendElement(csmPromise);
#endif

    GPUChild::InitPromiseType::All(GetCurrentSerialEventTarget(), initPromises)
        ->Then(GetCurrentSerialEventTarget(), __func__,
               [self = this, liveToken = mLiveToken]() {
                 if (*liveToken) {
                   self->OnAsyncInitComplete();
                 }
               });
  } else {
    mLaunchPhase = LaunchPhase::Complete;
    if (mListener) {
      mListener->OnProcessLaunchComplete(this);
    }
  }
}

void GPUProcessHost::OnAsyncInitComplete() {
  MOZ_ASSERT(NS_IsMainThread());
  if (mLaunchPhase == LaunchPhase::Connected) {
    mLaunchPhase = LaunchPhase::Complete;
    if (mListener) {
      mListener->OnProcessLaunchComplete(this);
    }
  }
}

bool GPUProcessHost::CompleteInitSynchronously() {
  MOZ_ASSERT(mLaunchPhase == LaunchPhase::Connected);

  const bool result = mGPUChild->EnsureGPUReady();

#ifdef MOZ_WIDGET_ANDROID
  if (!mCompositorSurfaceManager) {
    layers::SynchronousTask task(
        "GeckoProcessManager::GetCompositorSurfaceManager");

    nsCOMPtr<nsIEventTarget> launcherThread(GetIPCLauncher());
    MOZ_ASSERT(launcherThread);
    launcherThread->Dispatch(NS_NewRunnableFunction(
        "GeckoProcessManager::GetCompositorSurfaceManager", [&]() {
          layers::AutoCompleteTask complete(&task);
          mCompositorSurfaceManager =
              java::GeckoProcessManager::GetCompositorSurfaceManager();
        }));

    task.Wait();
  }
#endif

  mLaunchPhase = LaunchPhase::Complete;
  if (mListener) {
    mListener->OnProcessLaunchComplete(this);
  }

  return result;
}

void GPUProcessHost::Shutdown(bool aUnexpectedShutdown) {
  MOZ_ASSERT(!mShutdownRequested);

  mListener = nullptr;

  if (mGPUChild) {
    // OnChannelClosed uses this to check if the shutdown was expected or
    // unexpected.
    mShutdownRequested = true;

    if (aUnexpectedShutdown) {
      mGPUChild->OnUnexpectedShutdown();
    }

    // The channel might already be closed if we got here unexpectedly.
    if (!mChannelClosed) {
      if (VRGPUChild::IsCreated()) {
        VRGPUChild::Get()->Close();
      }
      mGPUChild->SendShutdownVR();
      mGPUChild->Close();
    }

#ifndef NS_FREE_PERMANENT_DATA
    // No need to communicate shutdown, the GPU process doesn't need to
    // communicate anything back.
    KillHard(/* aGenerateMinidump */ false);
#endif

    // If we're shutting down unexpectedly, we're in the middle of handling an
    // ActorDestroy for PGPUChild, which is still on the stack. We'll return
    // back to OnChannelClosed.
    //
    // Otherwise, we'll wait for OnChannelClose to be called whenever PGPUChild
    // acknowledges shutdown.
    return;
  }

  DestroyProcess();
}

void GPUProcessHost::OnChannelClosed() {
  mChannelClosed = true;

  if (!mShutdownRequested && mListener) {
    // This is an unclean shutdown. Notify our listener that we're going away.
    mListener->OnProcessUnexpectedShutdown(this);
  } else {
    DestroyProcess();
  }

  // Release the actor.
  GPUChild::Destroy(std::move(mGPUChild));
  MOZ_ASSERT(!mGPUChild);
}

void GPUProcessHost::KillHard(bool aGenerateMinidump) {
  MOZ_ASSERT(NS_IsMainThread());

  if (mGPUChild && aGenerateMinidump) {
    mGPUChild->GeneratePairedMinidump();
  }

  const ProcessHandle handle = GetChildProcessHandle();
  if (!base::KillProcess(handle, base::PROCESS_END_KILLED_BY_USER)) {
    if (mGPUChild) {
      mGPUChild->DeletePairedMinidump();
    }
    NS_WARNING("failed to kill subprocess!");
  }

  SetAlreadyDead();
}

uint64_t GPUProcessHost::GetProcessToken() const { return mProcessToken; }

void GPUProcessHost::KillProcess(bool aGenerateMinidump) {
  KillHard(aGenerateMinidump);
}

void GPUProcessHost::CrashProcess() { mGPUChild->SendCrashProcess(); }

void GPUProcessHost::DestroyProcess() {
  MOZ_ASSERT(NS_IsMainThread());

  // Any pending tasks will be cancelled from now on.
  *mLiveToken = false;

  NS_DispatchToMainThread(
      NS_NewRunnableFunction("DestroyProcessRunnable", [this] { Destroy(); }));
}

#if defined(XP_MACOSX) && defined(MOZ_SANDBOX)
bool GPUProcessHost::FillMacSandboxInfo(MacSandboxInfo& aInfo) {
  GeckoChildProcessHost::FillMacSandboxInfo(aInfo);
  if (!aInfo.shouldLog && PR_GetEnv("MOZ_SANDBOX_GPU_LOGGING")) {
    aInfo.shouldLog = true;
  }
  aInfo.type = MacSandboxType::MacSandboxType_GPU;
  return true;
}
#endif

#ifdef MOZ_WIDGET_ANDROID
java::CompositorSurfaceManager::Param
GPUProcessHost::GetCompositorSurfaceManager() {
  return mCompositorSurfaceManager;
}
#endif

}  // namespace gfx
}  // namespace mozilla
