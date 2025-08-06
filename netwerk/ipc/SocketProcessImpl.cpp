/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SocketProcessImpl.h"

#include "base/command_line.h"
#include "base/string_util.h"
#include "mozilla/BackgroundHangMonitor.h"
#include "mozilla/Preferences.h"
#include "mozilla/GeckoArgs.h"
#include "mozilla/ipc/ProcessUtils.h"

#if defined(XP_WIN) && defined(MOZ_SANDBOX)
#  include "mozilla/sandboxTarget.h"
#elif defined(__OpenBSD__) && defined(MOZ_SANDBOX)
#  include "mozilla/SandboxSettings.h"
#  include "prlink.h"
#endif

#ifdef XP_UNIX
#  include <unistd.h>  // For sleep().
#endif

namespace mozilla {
namespace net {

LazyLogModule gSocketProcessLog("socketprocess");

SocketProcessImpl::~SocketProcessImpl() = default;

bool SocketProcessImpl::Init(int aArgc, char* aArgv[]) {
#ifdef XP_UNIX
  if (PR_GetEnv("MOZ_DEBUG_SOCKET_PROCESS")) {
    printf_stderr("\n\nSOCKETPROCESSnSOCKETPROCESS\n  debug me @ %d\n\n",
                  base::GetCurrentProcId());
    sleep(30);
  }
#endif
#if defined(MOZ_SANDBOX) && defined(XP_WIN)
  LoadLibraryW(L"nss3.dll");
  LoadLibraryW(L"softokn3.dll");
  LoadLibraryW(L"freebl3.dll");
  LoadLibraryW(L"ipcclientcerts.dll");
  LoadLibraryW(L"winmm.dll");
  mozilla::SandboxTarget::Instance()->StartSandbox();
#elif defined(__OpenBSD__) && defined(MOZ_SANDBOX)
  PR_LoadLibrary("libnss3.so");
  PR_LoadLibrary("libsoftokn3.so");
  PR_LoadLibrary("libfreebl3.so");
  PR_LoadLibrary("libipcclientcerts.so");
  StartOpenBSDSandbox(GeckoProcessType_Socket);
#endif

  Maybe<const char*> parentBuildID =
      geckoargs::sParentBuildID.Get(aArgc, aArgv);
  if (parentBuildID.isNothing()) {
    return false;
  }

  if (!ProcessChild::InitPrefs(aArgc, aArgv)) {
    return false;
  }

  return mSocketProcessChild->Init(TakeInitialEndpoint(), *parentBuildID);
}

void SocketProcessImpl::CleanUp() { mSocketProcessChild->CleanUp(); }

}  // namespace net
}  // namespace mozilla
