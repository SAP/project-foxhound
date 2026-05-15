/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_ScriptTrace_h
#define mozilla_dom_ScriptTrace_h

#include "js/loader/LoadedScript.h"       // JS::loader::LoadedScript
#include "js/loader/ScriptLoadRequest.h"  // JS::loader::ScriptLoadRequest
#include "mozilla/StaticPrefs_dom.h"

// This macro is used to wrap a tracing mechanism which is scheduling events
// which are then used by the JavaScript code of test cases to track the code
// path to verify the optimizations are working as expected.
#define TRACE_FOR_TEST(requestOrScript, str)                         \
  PR_BEGIN_MACRO                                                     \
  mozilla::dom::script::TestingNotifyObserver(requestOrScript, str); \
  PR_END_MACRO

#define TRACE_FOR_TEST_0(str)                       \
  PR_BEGIN_MACRO                                    \
  mozilla::dom::script::TestingNotifyObserver(str); \
  PR_END_MACRO

namespace mozilla::dom::script {

void TestingNotifyObserver(JS::loader::ScriptLoadRequest* aRequest,
                           JS::loader::LoadedScript* aLoadedScript,
                           const char* aEvent);

inline void TestingNotifyObserver(JS::loader::LoadedScript* aLoadedScript,
                                  const char* aEvent) {
  if (!StaticPrefs::dom_expose_test_interfaces()) {
    return;
  }

  TestingNotifyObserver(nullptr, aLoadedScript, aEvent);
}

inline void TestingNotifyObserver(JS::loader::ScriptLoadRequest* aRequest,
                                  const char* aEvent) {
  if (!StaticPrefs::dom_expose_test_interfaces()) {
    return;
  }

  TestingNotifyObserver(aRequest, aRequest->getLoadedScript(), aEvent);
}

inline void TestingNotifyObserver(const char* aEvent) {
  if (!StaticPrefs::dom_expose_test_interfaces()) {
    return;
  }

  TestingNotifyObserver(nullptr, nullptr, aEvent);
}

}  // namespace mozilla::dom::script

#endif  // mozilla_dom_ScriptTrace_h
