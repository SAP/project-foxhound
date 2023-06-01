/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CanvasRenderThread.h"

#include "mozilla/BackgroundHangMonitor.h"
#include "transport/runnable_utils.h"

namespace mozilla::gfx {

static StaticRefPtr<CanvasRenderThread> sCanvasRenderThread;
static mozilla::BackgroundHangMonitor* sBackgroundHangMonitor;
#ifdef DEBUG
static bool sCanvasRenderThreadEverStarted = false;
#endif

CanvasRenderThread::CanvasRenderThread(RefPtr<nsIThread> aThread)
    : mThread(std::move(aThread)) {}

CanvasRenderThread::~CanvasRenderThread() {}

// static
CanvasRenderThread* CanvasRenderThread::Get() { return sCanvasRenderThread; }

// static
void CanvasRenderThread::Start() {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(!sCanvasRenderThread);

#ifdef DEBUG
  // Check to ensure nobody will try to ever start us more than once during
  // the process' lifetime (in particular after Stop).
  MOZ_ASSERT(!sCanvasRenderThreadEverStarted);
  sCanvasRenderThreadEverStarted = true;
#endif

  // This is 4M, which is higher than the default 256K.
  // Increased with bug 1753349 to accommodate the `chromium/5359` branch of
  // ANGLE, which has large peak stack usage for some pathological shader
  // compilations.
  //
  // Previously increased to 512K to accommodate Mesa in bug 1753340.
  //
  // Previously increased to 320K to avoid a stack overflow in the
  // Intel Vulkan driver initialization in bug 1716120.
  //
  // Note: we only override it if it's limited already.
  const uint32_t stackSize =
      nsIThreadManager::DEFAULT_STACK_SIZE ? 4096 << 10 : 0;

  RefPtr<nsIThread> thread;
  nsresult rv = NS_NewNamedThread(
      "CanvasRenderer", getter_AddRefs(thread),
      NS_NewRunnableFunction(
          "CanvasRender::BackgroundHangSetup",
          []() {
            sBackgroundHangMonitor = new mozilla::BackgroundHangMonitor(
                "CanvasRendererBHM",
                /* Timeout values are powers-of-two to enable us get better
                   data. 128ms is chosen for transient hangs because 8Hz should
                   be the minimally acceptable goal for Compositor
                   responsiveness (normal goal is 60Hz). */
                128,
                /* 2048ms is chosen for permanent hangs because it's longer than
                 * most Compositor hangs seen in the wild, but is short enough
                 * to not miss getting native hang stacks. */
                2048);
            nsCOMPtr<nsIThread> thread = NS_GetCurrentThread();
            nsThread* nsthread = static_cast<nsThread*>(thread.get());
            nsthread->SetUseHangMonitor(true);
            nsthread->SetPriority(nsISupportsPriority::PRIORITY_HIGH);
          }),
      {.stackSize = stackSize});

  if (NS_FAILED(rv)) {
    return;
  }

  sCanvasRenderThread = new CanvasRenderThread(thread);
}

// static
void CanvasRenderThread::ShutDown() {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(sCanvasRenderThread);

  // Null out sCanvasRenderThread before we enter synchronous Shutdown,
  // from here on we are to be considered shut down for our consumers.
  nsCOMPtr<nsIThread> oldThread = sCanvasRenderThread->GetCanvasRenderThread();
  sCanvasRenderThread = nullptr;

  // We do a synchronous shutdown here while spinning the MT event loop.
  MOZ_ASSERT(oldThread);
  oldThread->Shutdown();
}

// static
bool CanvasRenderThread::IsInCanvasRenderThread() {
  return sCanvasRenderThread &&
         sCanvasRenderThread->mThread == NS_GetCurrentThread();
}

// static
already_AddRefed<nsIThread> CanvasRenderThread::GetCanvasRenderThread() {
  nsCOMPtr<nsIThread> thread;
  if (sCanvasRenderThread) {
    thread = sCanvasRenderThread->mThread;
  }
  return thread.forget();
}

void CanvasRenderThread::PostRunnable(already_AddRefed<nsIRunnable> aRunnable) {
  nsCOMPtr<nsIRunnable> runnable = aRunnable;
  mThread->Dispatch(runnable.forget());
}

}  // namespace mozilla::gfx
