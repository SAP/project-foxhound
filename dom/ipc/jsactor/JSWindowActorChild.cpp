/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/JSWindowActorChild.h"

#include "JSIPCValueUtils.h"
#include "mozilla/dom/BrowsingContext.h"
#include "mozilla/dom/ContentChild.h"
#include "mozilla/dom/JSIPCValue.h"
#include "mozilla/dom/JSIPCValueUtils.h"
#include "mozilla/dom/JSWindowActorBinding.h"
#include "mozilla/dom/MessageManagerBinding.h"
#include "mozilla/dom/WindowGlobalChild.h"
#include "mozilla/dom/WindowGlobalParent.h"
#include "mozilla/dom/WindowProxyHolder.h"
#include "nsGlobalWindowInner.h"

namespace mozilla::dom {

JSWindowActorChild::~JSWindowActorChild() { MOZ_ASSERT(!mManager); }

JSObject* JSWindowActorChild::WrapObject(JSContext* aCx,
                                         JS::Handle<JSObject*> aGivenProto) {
  return JSWindowActorChild_Binding::Wrap(aCx, this, aGivenProto);
}

WindowGlobalChild* JSWindowActorChild::GetManager() const { return mManager; }

WindowContext* JSWindowActorChild::GetWindowContext() const {
  return mManager ? mManager->WindowContext() : nullptr;
}

void JSWindowActorChild::Init(const nsACString& aName,
                              WindowGlobalChild* aManager) {
  MOZ_ASSERT(!mManager, "Cannot Init() a JSWindowActorChild twice!");
  mManager = aManager;
  bool sendTyped = !mManager->IsInProcess() && JSActorSupportsTypedSend(aName);
  JSActor::Init(aName, sendTyped);
}

void JSWindowActorChild::SendRawMessage(const JSActorMessageMeta& aMeta,
                                        JSIPCValue&& aData,
                                        ipc::StructuredCloneData* aStack,
                                        ErrorResult& aRv) {
  if (!CanSend() || !mManager || !mManager->CanSend()) {
    aRv.ThrowInvalidStateError("JSWindowActorChild cannot send at the moment");
    return;
  }

  if (mManager->IsInProcess()) {
    SendRawMessageInProcess(
        aMeta, std::move(aData), std::move(aStack),
        [manager{mManager}]() { return manager->GetParentActor(); });
    return;
  }

  if (!mManager->SendRawMessage(aMeta, aData, aStack)) {
    aRv.ThrowOperationError(
        nsPrintfCString("JSWindowActorChild send error in actor '%s'",
                        PromiseFlatCString(aMeta.actorName()).get()));
    return;
  }
}

Document* JSWindowActorChild::GetDocument(ErrorResult& aRv) {
  if (!mManager) {
    ThrowStateErrorForGetter("document", aRv);
    return nullptr;
  }

  nsGlobalWindowInner* window = mManager->GetWindowGlobal();
  return window ? window->GetDocument() : nullptr;
}

BrowsingContext* JSWindowActorChild::GetBrowsingContext(ErrorResult& aRv) {
  if (!mManager) {
    ThrowStateErrorForGetter("browsingContext", aRv);
    return nullptr;
  }

  return mManager->BrowsingContext();
}

nsIDocShell* JSWindowActorChild::GetDocShell(ErrorResult& aRv) {
  if (!mManager) {
    ThrowStateErrorForGetter("docShell", aRv);
    return nullptr;
  }

  return mManager->BrowsingContext()->GetDocShell();
}

Nullable<WindowProxyHolder> JSWindowActorChild::GetContentWindow(
    ErrorResult& aRv) {
  if (!mManager) {
    ThrowStateErrorForGetter("contentWindow", aRv);
    return nullptr;
  }

  if (nsGlobalWindowInner* window = mManager->GetWindowGlobal()) {
    if (window->IsCurrentInnerWindow()) {
      return WindowProxyHolder(window->GetBrowsingContext());
    }
  }

  return nullptr;
}

void JSWindowActorChild::ClearManager() { mManager = nullptr; }

NS_IMPL_CYCLE_COLLECTION_INHERITED(JSWindowActorChild, JSActor, mManager)

NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(JSWindowActorChild)
NS_INTERFACE_MAP_END_INHERITING(JSActor)

NS_IMPL_ADDREF_INHERITED(JSWindowActorChild, JSActor)
NS_IMPL_RELEASE_INHERITED(JSWindowActorChild, JSActor)

}  // namespace mozilla::dom
