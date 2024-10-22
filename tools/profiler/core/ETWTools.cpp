/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ETWTools.h"

#include <atomic>

namespace ETW {
std::atomic<ULONGLONG> gETWCollectionMask = 0;

// Define a handle to a TraceLogging provider.
//
// > All ETW providers are identified by both provider name and provider ID.
// > [...]
// > Microsoft recommends generating the provider ID from the provider name
// > using the ETW name-hashing algorithm described below. This provides
// > several benefits: it's easier to remember just the name; the ID and the
// > name are automatically linked; tools such as tracelog, traceview,
// > EventSource, and WPR have special support for providers that use IDs
// > generated using this algorithm.
//
// https://learn.microsoft.com/en-us/windows/win32/api/traceloggingprovider/nf-traceloggingprovider-tracelogging_define_provider
//
// The GUID generated for "Mozilla.FirefoxTraceLogger" is:
// {c923f508-96e4-5515-e32c-7539d1b10504}
TRACELOGGING_DEFINE_PROVIDER(kFirefoxTraceLoggingProvider,
                             "Mozilla.FirefoxTraceLogger",
                             (0xc923f508, 0x96e4, 0x5515, 0xe3, 0x2c, 0x75,
                              0x39, 0xd1, 0xb1, 0x05, 0x04));

static void NTAPI ETWEnableCallback(LPCGUID aSourceId, ULONG aIsEnabled,
                                    UCHAR aLevel, ULONGLONG aMatchAnyKeyword,
                                    ULONGLONG aMatchAllKeyword,
                                    PEVENT_FILTER_DESCRIPTOR aFilterData,
                                    PVOID aCallbackContext) {
  // This is called on a CRT worker thread. This means this might race a bit
  // with our main thread, but that is okay.
  if (aIsEnabled) {
    mozilla::profiler::detail::RacyFeatures::SetETWCollectionActive();
  } else {
    mozilla::profiler::detail::RacyFeatures::SetETWCollectionInactive();
  }
  // The lower 48 bits of the provider flags are used to mask markers.
  gETWCollectionMask = aMatchAnyKeyword;
}

void Init() {
  TraceLoggingRegisterEx(kFirefoxTraceLoggingProvider, ETWEnableCallback,
                         nullptr);
}

void Shutdown() { TraceLoggingUnregister(kFirefoxTraceLoggingProvider); }

}  // namespace ETW
