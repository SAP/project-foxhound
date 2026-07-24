/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "ErrorHandler.h"

#include "mozilla/CmdLineAndEnvUtils.h"
#include "mozilla/UniquePtr.h"

#if defined(MOZ_LAUNCHER_PROCESS)
#  include "mozilla/LauncherRegistryInfo.h"
#endif  // defined(MOZ_LAUNCHER_PROCESS)

namespace {

constexpr wchar_t kEventSourceName[] = L"" MOZ_APP_DISPLAYNAME " Launcher";

struct EventSourceDeleter {
  using pointer = HANDLE;

  void operator()(pointer aEvtSrc) { ::DeregisterEventSource(aEvtSrc); }
};

using EventLog = mozilla::UniquePtr<HANDLE, EventSourceDeleter>;

struct SerializedEventData {
  HRESULT mHr;
  uint32_t mLine;
  char mFile[1];
};

}  // anonymous namespace

static void PostErrorToLog(const mozilla::LauncherError& aError) {
  // This is very bare-bones; just enough to spit out an HRESULT to the
  // Application event log.
  EventLog log(::RegisterEventSourceW(nullptr, kEventSourceName));

  if (!log) {
    return;
  }

  size_t fileLen = strlen(aError.mFile);
  size_t dataLen = sizeof(HRESULT) + sizeof(uint32_t) + fileLen;
  auto evtDataBuf = mozilla::MakeUnique<char[]>(dataLen);
  SerializedEventData& evtData =
      *reinterpret_cast<SerializedEventData*>(evtDataBuf.get());
  evtData.mHr = aError.mError.AsHResult();
  evtData.mLine = aError.mLine;
  // Since this is binary data, we're not concerning ourselves with null
  // terminators.
  memcpy(evtData.mFile, aError.mFile, fileLen);

  ::ReportEventW(log.get(), EVENTLOG_ERROR_TYPE, 0, aError.mError.AsHResult(),
                 nullptr, 0, dataLen, nullptr, evtDataBuf.get());
}

namespace mozilla {

void HandleLauncherError(const LauncherError& aError,
                         const char* aProcessType) {
#if defined(MOZ_LAUNCHER_PROCESS)
  LauncherRegistryInfo regInfo;
  (void)regInfo.DisableDueToFailure();
#endif  // defined(MOZ_LAUNCHER_PROCESS)

  PostErrorToLog(aError);
}

}  // namespace mozilla
