/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ContentProcess.h"
#include "mozilla/Preferences.h"

#if defined(XP_MACOSX) && defined(MOZ_SANDBOX)
#  include <stdlib.h>
#  include "mozilla/Sandbox.h"
#  include "mozilla/SandboxSettings.h"
#endif

#include "nsAppRunner.h"
#include "mozilla/ipc/BackgroundChild.h"
#include "mozilla/ipc/ProcessUtils.h"
#include "mozilla/GeckoArgs.h"
#include "mozilla/Omnijar.h"
#include "nsCategoryManagerUtils.h"

namespace mozilla::dom {

static nsresult GetGREDir(nsIFile** aResult) {
  nsCOMPtr<nsIFile> current;
  nsresult rv = XRE_GetBinaryPath(getter_AddRefs(current));
  NS_ENSURE_SUCCESS(rv, rv);

#ifdef XP_DARWIN
  // Walk out of [subprocess].app/Contents/MacOS to the real GRE dir
  const int depth = 4;
#else
  const int depth = 1;
#endif

  for (int i = 0; i < depth; ++i) {
    nsCOMPtr<nsIFile> parent;
    rv = current->GetParent(getter_AddRefs(parent));
    NS_ENSURE_SUCCESS(rv, rv);

    current = parent;
    NS_ENSURE_TRUE(current, NS_ERROR_UNEXPECTED);
  }

#ifdef XP_DARWIN
  rv = current->SetNativeLeafName("Resources"_ns);
  NS_ENSURE_SUCCESS(rv, rv);
#endif

  current.forget(aResult);

  return NS_OK;
}

ContentProcess::ContentProcess(IPC::Channel::ChannelHandle aClientChannel,
                               ProcessId aParentPid,
                               const nsID& aMessageChannelId)
    : ProcessChild(std::move(aClientChannel), aParentPid, aMessageChannelId) {
  NS_LogInit();
}

ContentProcess::~ContentProcess() { NS_LogTerm(); }

bool ContentProcess::Init(int aArgc, char* aArgv[]) {
  InfallibleInit(aArgc, aArgv);
  return true;
}

void ContentProcess::InfallibleInit(int aArgc, char* aArgv[]) {
  Maybe<bool> isForBrowser = Nothing();
  Maybe<const char*> parentBuildID =
      geckoargs::sParentBuildID.Get(aArgc, aArgv);

  // command line: -jsInitHandle handle -jsInitLen length
  Maybe<mozilla::ipc::SharedMemoryHandle> jsInitHandle =
      geckoargs::sJsInitHandle.Get(aArgc, aArgv);
  Maybe<uint64_t> jsInitLen = geckoargs::sJsInitLen.Get(aArgc, aArgv);

  nsCOMPtr<nsIFile> appDirArg;
  Maybe<const char*> appDir = geckoargs::sAppDir.Get(aArgc, aArgv);
  if (appDir.isSome()) {
    bool flag;
    nsresult rv = XRE_GetFileFromPath(*appDir, getter_AddRefs(appDirArg));
    if (NS_FAILED(rv) || NS_FAILED(appDirArg->Exists(&flag)) || !flag) {
      NS_WARNING("Invalid application directory passed to content process.");
      appDirArg = nullptr;
    }
  }

  Maybe<bool> safeMode = geckoargs::sSafeMode.Get(aArgc, aArgv);
  if (safeMode.isSome()) {
    gSafeMode = *safeMode;
  }

  Maybe<bool> isForBrowerParam = geckoargs::sIsForBrowser.Get(aArgc, aArgv);
  Maybe<bool> notForBrowserParam = geckoargs::sNotForBrowser.Get(aArgc, aArgv);
  if (isForBrowerParam.isSome()) {
    isForBrowser = Some(true);
  }
  if (notForBrowserParam.isSome()) {
    isForBrowser = Some(false);
  }

#if defined(XP_MACOSX) && defined(MOZ_SANDBOX)
  nsCOMPtr<nsIFile> profileDir;
  bool flag;
  Maybe<const char*> profile = geckoargs::sProfile.Get(aArgc, aArgv);
  // xpcshell self-test on macOS will hit this, so check isSome() otherwise
  // Maybe<> assertions will MOZ_CRASH() us.
  if (profile.isSome()) {
    nsresult rv = XRE_GetFileFromPath(*profile, getter_AddRefs(profileDir));
    if (NS_FAILED(rv) || NS_FAILED(profileDir->Exists(&flag)) || !flag) {
      NS_WARNING("Invalid profile directory passed to content process.");
      profileDir = nullptr;
    }
  } else {
    NS_WARNING("No profile directory passed to content process.");
  }
#endif /* XP_MACOSX && MOZ_SANDBOX */

  // Did we find all the mandatory flags?
  if (isForBrowser.isNothing()) {
    MOZ_CRASH("isForBrowser flag missing");
  }
  if (parentBuildID.isNothing()) {
    MOZ_CRASH("parentBuildID flag missing");
  }

  if (!ProcessChild::InitPrefs(aArgc, aArgv)) {
    MOZ_CRASH("InitPrefs failed");
  }

  if (jsInitHandle && jsInitLen &&
      !::mozilla::ipc::ImportSharedJSInit(jsInitHandle.extract(), *jsInitLen)) {
    MOZ_CRASH("ImportSharedJSInit failed");
  }

  mContent.Init(TakeInitialEndpoint(), *parentBuildID, *isForBrowser);

  nsCOMPtr<nsIFile> greDir;
  nsresult rv = GetGREDir(getter_AddRefs(greDir));
  if (NS_FAILED(rv)) {
    MOZ_CRASH("GetGREDir failed");
  }

  nsCOMPtr<nsIFile> xpcomAppDir = appDirArg ? appDirArg : greDir;

  rv = mDirProvider.Initialize(xpcomAppDir, greDir);
  if (NS_FAILED(rv)) {
    MOZ_CRASH("mDirProvider.Initialize failed");
  }

  // Handle the -greomni/-appomni flags (unless the forkserver already
  // preloaded the jar(s)).
  if (!Omnijar::IsInitialized()) {
    Omnijar::ChildProcessInit(aArgc, aArgv);
  }

  rv = NS_InitXPCOM(nullptr, xpcomAppDir, &mDirProvider);
  if (NS_FAILED(rv)) {
    MOZ_CRASH("NS_InitXPCOM failed");
  }

  // "app-startup" is the name of both the category and the event
  NS_CreateServicesFromCategory("app-startup", nullptr, "app-startup", nullptr);

#if (defined(XP_MACOSX)) && defined(MOZ_SANDBOX)
  mContent.SetProfileDir(profileDir);
#  if defined(DEBUG)
  if (IsContentSandboxEnabled()) {
    AssertMacSandboxEnabled();
  }
#  endif /* DEBUG */
#endif   /* XP_MACOSX && MOZ_SANDBOX */

  // Do this as early as possible to get the parent process to initialize the
  // background thread since we'll likely need database information very soon.
  mozilla::ipc::BackgroundChild::Startup();
  mozilla::ipc::BackgroundChild::InitContentStarter(&mContent);
}

// Note: CleanUp() never gets called in non-debug builds because we exit early
// in ContentChild::ActorDestroy().
void ContentProcess::CleanUp() {
  mDirProvider.DoShutdown();
  NS_ShutdownXPCOM(nullptr);
}

}  // namespace mozilla::dom
