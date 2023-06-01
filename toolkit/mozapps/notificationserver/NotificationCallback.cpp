/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "EventLog.h"
#include "NotificationCallback.h"

#include <sstream>
#include <string>
#include <vector>

#include "mozilla/CmdLineAndEnvUtils.h"
#include "mozilla/ToastNotificationHeaderOnlyUtils.h"

using namespace mozilla::widget::toastnotification;

HRESULT STDMETHODCALLTYPE
NotificationCallback::QueryInterface(REFIID riid, void** ppvObject) {
  if (!ppvObject) {
    return E_POINTER;
  }

  *ppvObject = nullptr;

  if (!(riid == guid || riid == __uuidof(INotificationActivationCallback) ||
        riid == __uuidof(IUnknown))) {
    return E_NOINTERFACE;
  }

  AddRef();
  *ppvObject = reinterpret_cast<void*>(this);

  return S_OK;
}

HRESULT STDMETHODCALLTYPE NotificationCallback::Activate(
    LPCWSTR appUserModelId, LPCWSTR invokedArgs,
    const NOTIFICATION_USER_INPUT_DATA* data, ULONG dataCount) {
  HandleActivation(invokedArgs);

  // Windows 8 style callbacks are not called and notifications are not removed
  // from the Action Center unless we return `S_OK`, so always do so even if
  // we're unable to handle the notification properly.
  return S_OK;
}

void NotificationCallback::HandleActivation(LPCWSTR invokedArgs) {
  LOG_ERROR_MESSAGE(L"Invoked with arguments: '%s'", invokedArgs);

  auto maybeArgs = ParseToastArguments(invokedArgs);
  if (!maybeArgs) {
    LOG_ERROR_MESSAGE(L"COM server disabled for toast");
    return;
  }
  const auto& args = maybeArgs.value();
  auto [programPath, cmdLine] = BuildRunCommand(args);

  // This pipe object will let Firefox notify us when it has handled the
  // notification. Create this before interacting with the application so the
  // application can rely on it existing.
  auto maybePipe = CreatePipe(args.windowsTag);

  // Run the application.

  STARTUPINFOW si = {};
  si.cb = sizeof(STARTUPINFOW);
  PROCESS_INFORMATION pi = {};

  // Runs `{program path} [--profile {profile path}] [--notification-windowsTag
  // {tag}]`.
  CreateProcessW(programPath.c_str(), cmdLine.get(), nullptr, nullptr, false,
                 DETACHED_PROCESS | NORMAL_PRIORITY_CLASS, nullptr, nullptr,
                 &si, &pi);

  LOG_ERROR_MESSAGE(L"Invoked %s", cmdLine.get());

  // Transfer `SetForegroundWindow` permission to the launched application.

  maybePipe.apply([](const auto& pipe) {
    if (ConnectPipeWithTimeout(pipe)) {
      HandlePipeMessages(pipe);
    }
  });
}

mozilla::Maybe<ToastArgs> NotificationCallback::ParseToastArguments(
    LPCWSTR invokedArgs) {
  ToastArgs parsedArgs;
  std::wistringstream args(invokedArgs);
  bool serverDisabled = true;

  for (std::wstring key, value;
       std::getline(args, key) && std::getline(args, value);) {
    if (key == kLaunchArgProgram) {
      serverDisabled = false;
    } else if (key == kLaunchArgProfile) {
      parsedArgs.profile = value;
    } else if (key == kLaunchArgTag) {
      parsedArgs.windowsTag = value;
    } else if (key == kLaunchArgAction) {
      // Remainder of args are from the Web Notification action, don't parse.
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=1781929.
      break;
    }
  }

  if (serverDisabled) {
    return mozilla::Nothing();
  }

  return mozilla::Some(parsedArgs);
}

std::tuple<path, mozilla::UniquePtr<wchar_t[]>>
NotificationCallback::BuildRunCommand(const ToastArgs& args) {
  path programPath = installDir / L"" MOZ_APP_NAME;
  programPath += L".exe";

  std::vector<const wchar_t*> childArgv;
  childArgv.push_back(programPath.c_str());

  if (!args.profile.empty()) {
    childArgv.push_back(L"--profile");
    childArgv.push_back(args.profile.c_str());
  } else {
    LOG_ERROR_MESSAGE(L"No profile; invocation will choose default profile");
  }

  if (!args.windowsTag.empty()) {
    childArgv.push_back(L"--notification-windowsTag");
    childArgv.push_back(args.windowsTag.c_str());
  } else {
    LOG_ERROR_MESSAGE(L"No windowsTag; invoking anyway");
  }

  return {programPath,
          mozilla::MakeCommandLine(childArgv.size(), childArgv.data())};
}

mozilla::Maybe<nsAutoHandle> NotificationCallback::CreatePipe(
    const std::wstring& tag) {
  if (tag.empty()) {
    return mozilla::Nothing();
  }

  // Prefix required by pipe API.
  std::wstring pipeName = GetNotificationPipeName(tag.c_str());

  nsAutoHandle pipe(CreateNamedPipeW(
      pipeName.c_str(), PIPE_ACCESS_DUPLEX | FILE_FLAG_OVERLAPPED,
      PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT |
          PIPE_REJECT_REMOTE_CLIENTS,
      1, sizeof(ToastNotificationPermissionMessage),
      sizeof(ToastNotificationPidMessage), 0, nullptr));
  if (pipe.get() == INVALID_HANDLE_VALUE) {
    LOG_ERROR_MESSAGE(L"Error creating pipe %s, error %lu", pipeName.c_str(),
                      GetLastError());
    return mozilla::Nothing();
  }

  return mozilla::Some(pipe.out());
}

bool NotificationCallback::ConnectPipeWithTimeout(const nsAutoHandle& pipe) {
  nsAutoHandle overlappedEvent(CreateEventW(nullptr, TRUE, FALSE, nullptr));
  if (!overlappedEvent) {
    LOG_ERROR_MESSAGE(L"Error creating pipe connect event, error %lu",
                      GetLastError());
    return false;
  }

  OVERLAPPED overlappedConnect{};
  overlappedConnect.hEvent = overlappedEvent.get();

  BOOL result = ConnectNamedPipe(pipe.get(), &overlappedConnect);
  DWORD lastError = GetLastError();
  if (lastError == ERROR_IO_PENDING) {
    LOG_ERROR_MESSAGE(L"Waiting on pipe connection");

    if (!WaitEventWithTimeout(overlappedEvent)) {
      LOG_ERROR_MESSAGE(
          L"Pipe connect wait failed, cancelling (connection may still "
          L"succeed)");

      CancelIo(pipe.get());
      DWORD undefined;
      BOOL overlappedResult =
          GetOverlappedResult(pipe.get(), &overlappedConnect, &undefined, TRUE);
      if (!overlappedResult || GetLastError() != ERROR_PIPE_CONNECTED) {
        LOG_ERROR_MESSAGE(L"Pipe connect failed, error %lu", GetLastError());
        return false;
      }

      // Pipe connected before cancellation, fall through.
    }
  } else if (result) {
    // Overlapped `ConnectNamedPipe` should return 0.
    LOG_ERROR_MESSAGE(L"Error connecting pipe, error %lu", lastError);
    return false;
  } else if (lastError != ERROR_PIPE_CONNECTED) {
    LOG_ERROR_MESSAGE(L"Error connecting pipe, error %lu", lastError);
    return false;
  }

  LOG_ERROR_MESSAGE(L"Pipe connected!");
  return true;
}

void NotificationCallback::HandlePipeMessages(const nsAutoHandle& pipe) {
  ToastNotificationPidMessage in{};
  auto read = [&](OVERLAPPED& overlapped) {
    return ReadFile(pipe.get(), &in, sizeof(in), nullptr, &overlapped);
  };
  if (!SyncDoOverlappedIOWithTimeout(pipe, sizeof(in), read)) {
    LOG_ERROR_MESSAGE(L"Pipe read failed");
    return;
  }

  ToastNotificationPermissionMessage out{};
  out.setForegroundPermissionGranted = TransferForegroundPermission(in.pid);
  auto write = [&](OVERLAPPED& overlapped) {
    return WriteFile(pipe.get(), &out, sizeof(out), nullptr, &overlapped);
  };
  if (!SyncDoOverlappedIOWithTimeout(pipe, sizeof(out), write)) {
    LOG_ERROR_MESSAGE(L"Pipe write failed");
    return;
  }

  LOG_ERROR_MESSAGE(L"Pipe write succeeded!");
}

DWORD NotificationCallback::TransferForegroundPermission(DWORD pid) {
  // When the instance of Firefox is still running we need to grant it
  // foreground permission to bring itself to the foreground. We're able to do
  // this even though the COM server is not the foreground process likely due to
  // Windows granting permission to the COM object via
  // `CoAllowSetForegroundWindow`.
  //
  // Note that issues surrounding `SetForegroundWindow` permissions are obscured
  // when builds are run with a debugger, whereupon Windows grants
  // `SetForegroundWindow` permission in all instances.
  //
  // We can not rely on granting this permission to the process created above
  // because remote server clients do not meet the criteria to receive
  // `SetForegroundWindow` permissions without unsupported hacks.
  if (!pid) {
    LOG_ERROR_MESSAGE(
        L"`pid` received from pipe was 0, no process to grant "
        L"`SetForegroundWindow` permission to");
    return FALSE;
  }
  // When this call succeeds, the COM process loses the `SetForegroundWindow`
  // permission.
  if (!AllowSetForegroundWindow(pid)) {
    LOG_ERROR_MESSAGE(
        L"Failed to grant `SetForegroundWindow` permission, error %lu",
        GetLastError());
    return FALSE;
  }

  return TRUE;
}
