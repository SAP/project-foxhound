/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ScriptTrace.h"

#include "mozilla/Services.h"               // services::*
#include "mozilla/dom/Element.h"            // mozilla::dom::Element
#include "mozilla/dom/ScriptLoadContext.h"  // mozilla::dom::ScriptLoadContext
#include "nsCOMPtr.h"                       // nsCOMPtr.h
#include "nsIObserverService.h"             // nsIObserverService
#include "nsIScriptElement.h"               // nsIScriptElement
#include "nsThreadUtils.h"  // mozilla::Runnable, NS_DispatchToCurrentThread

namespace mozilla::dom::script {

class ScriptLoaderTestRunnable : public Runnable {
 public:
  ScriptLoaderTestRunnable(JS::loader::ScriptLoadRequest* aRequest,
                           JS::loader::LoadedScript* aLoadedScript,
                           const char* aEvent)
      : Runnable("dom::script::ScriptLoaderTestRunnable") {
    mData.AppendLiteral(u"event:");
    mData.AppendASCII(aEvent);
    if (aLoadedScript) {
      mData.AppendLiteral(u"\nurl:");
      mData.Append(
          NS_ConvertUTF8toUTF16(aLoadedScript->GetURI()->GetSpecOrDefault()));
    }

    if (aRequest) {
      nsIScriptElement* scriptElement =
          aRequest->GetScriptLoadContext()->GetScriptElementForTrace();
      nsCOMPtr<Element> target(do_QueryInterface(scriptElement));
      if (target) {
        nsAutoString id;
        target->GetId(id);
        mData.AppendLiteral(u"\nid:");
        mData.Append(id);
      }
    }
  }

  NS_IMETHOD Run() override {
    nsCOMPtr<nsIObserverService> obsService = services::GetObserverService();
    obsService->NotifyObservers(nullptr, "ScriptLoaderTest",
                                mData.BeginReading());
    return NS_OK;
  }

 protected:
  ~ScriptLoaderTestRunnable() = default;

 private:
  nsAutoString mData;
};

void TestingNotifyObserver(JS::loader::ScriptLoadRequest* aRequest,
                           JS::loader::LoadedScript* aLoadedScript,
                           const char* aEvent) {
  nsCOMPtr<nsIObserverService> obsService = services::GetObserverService();

  if (!obsService->HasObservers("ScriptLoaderTest")) {
    return;
  }

  // NOTE: There can be pending exception for the script load itself,
  //       and the observer notification shouldn't be performed in that
  //       situation.
  //       Use a separate task to avoid the collision.
  RefPtr<ScriptLoaderTestRunnable> runnable =
      new ScriptLoaderTestRunnable(aRequest, aLoadedScript, aEvent);
  (void)NS_DispatchToCurrentThread(runnable);
}

}  // namespace mozilla::dom::script
