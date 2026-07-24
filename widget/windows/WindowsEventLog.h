/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_WindowsEventLog_h
#define mozilla_WindowsEventLog_h

/**
 * Report messages to the Windows Event Log.
 */

#include <windows.h>

#include "mozilla/Assertions.h"
#include "mozilla/Attributes.h"
#include "mozilla/LoggingCore.h"
#include "mozilla/UniquePtr.h"

/**
 * This header is intended for self-contained, header-only, utility code for
 * Win32. It may be used outside of xul.dll, in places such as
 * default-browser-agent.exe or notificationrouter.dll. If your code creates
 * dependencies on Mozilla libraries, you should put it elsewhere.
 */

#define MOZ_WIN_EVENT_LOG_ERROR(source, hr)                                  \
  mozilla::WriteWindowsEventLogHresult(source, mozilla::LogLevel::Error, hr, \
                                       __FUNCTION__, __LINE__)

#define MOZ_WIN_EVENT_LOG_ERROR_MESSAGE(source, format, ...)             \
  mozilla::WriteWindowsEventLogMessage(source, mozilla::LogLevel::Error, \
                                       format, __FUNCTION__, __LINE__,   \
                                       ##__VA_ARGS__)

#define MOZ_WIN_EVENT_LOG_WARNING_MESSAGE(source, format, ...)             \
  mozilla::WriteWindowsEventLogMessage(source, mozilla::LogLevel::Warning, \
                                       format, __FUNCTION__, __LINE__,     \
                                       ##__VA_ARGS__)

#define MOZ_WIN_EVENT_LOG_INFO_MESSAGE(source, format, ...)             \
  mozilla::WriteWindowsEventLogMessage(source, mozilla::LogLevel::Info, \
                                       format, __FUNCTION__, __LINE__,  \
                                       ##__VA_ARGS__)

namespace mozilla {

static void WriteWindowsEventLogFromBuffer(const wchar_t* eventSourceName,
                                           mozilla::LogLevel logLevel,
                                           const wchar_t* buffer,
                                           DWORD eventId) {
  WORD winLogLevel;
  switch (logLevel) {
    case mozilla::LogLevel::Error:
      winLogLevel = EVENTLOG_ERROR_TYPE;
      break;
    case mozilla::LogLevel::Warning:
      winLogLevel = EVENTLOG_WARNING_TYPE;
      break;
    case mozilla::LogLevel::Info:
      winLogLevel = EVENTLOG_INFORMATION_TYPE;
      break;
    default:
      // Assertion to give developers notice in debug builds that logging to
      // verbose or debug has no effect
      MOZ_ASSERT_UNREACHABLE(
          "ReportEventW doesn't support anything like Verbose or Debug "
          "levels.");
      return;
  }
  HANDLE source = RegisterEventSourceW(nullptr, eventSourceName);
  if (!source) {
    // Not much we can do about this.
    return;
  }

  const wchar_t* stringsArray[] = {buffer};
  ReportEventW(source, winLogLevel, 0, eventId, nullptr, 1, 0, stringsArray,
               nullptr);

  DeregisterEventSource(source);
}

inline void WriteWindowsEventLogHresult(const wchar_t* eventSourceName,
                                        mozilla::LogLevel logLevel, HRESULT hr,
                                        const char* sourceFile,
                                        int sourceLine) {
  const wchar_t* format = L"0x%X in %S:%d";
  int bufferSize = _scwprintf(format, hr, sourceFile, sourceLine);
  ++bufferSize;  // Extra character for terminating null
  mozilla::UniquePtr<wchar_t[]> errorStr =
      mozilla::MakeUnique<wchar_t[]>(bufferSize);

  _snwprintf_s(errorStr.get(), bufferSize, _TRUNCATE, format, hr, sourceFile,
               sourceLine);

  WriteWindowsEventLogFromBuffer(eventSourceName, logLevel, errorStr.get(), hr);
}

MOZ_FORMAT_WPRINTF(3, 5)
inline void WriteWindowsEventLogMessage(const wchar_t* eventSourceName,
                                        mozilla::LogLevel logLevel,
                                        const wchar_t* messageFormat,
                                        const char* sourceFile, int sourceLine,
                                        ...) {
  // First assemble the passed message
  va_list ap;
  va_start(ap, sourceLine);
  int bufferSize = _vscwprintf(messageFormat, ap);
  ++bufferSize;  // Extra character for terminating null
  va_end(ap);
  mozilla::UniquePtr<wchar_t[]> message =
      mozilla::MakeUnique<wchar_t[]>(bufferSize);

  va_start(ap, sourceLine);
  vswprintf(message.get(), bufferSize, messageFormat, ap);
  va_end(ap);

  // Next, assemble the complete error message to print
  const wchar_t* errorFormat = L"Error: %s (%S:%d)";
  bufferSize = _scwprintf(errorFormat, message.get(), sourceFile, sourceLine);
  ++bufferSize;  // Extra character for terminating null
  mozilla::UniquePtr<wchar_t[]> errorStr =
      mozilla::MakeUnique<wchar_t[]>(bufferSize);

  _snwprintf_s(errorStr.get(), bufferSize, _TRUNCATE, errorFormat,
               message.get(), sourceFile, sourceLine);

  WriteWindowsEventLogFromBuffer(eventSourceName, logLevel, errorStr.get(), 0);
}

}  // namespace mozilla

#endif  // mozilla_WindowsEventLog_h
