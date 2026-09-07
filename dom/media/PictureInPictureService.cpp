/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PictureInPictureService.h"

#include "PictureInPictureWindow.h"
#include "mozilla/dom/BindingUtils.h"
#include "mozilla/dom/Document.h"
#include "mozilla/dom/HTMLVideoElement.h"
#include "mozilla/dom/PictureInPictureWindow.h"
#include "nsComponentManagerUtils.h"

namespace mozilla::dom {

StaticRefPtr<PictureInPictureService> gPictureInPictureService;
PictureInPictureRequest::~PictureInPictureRequest() = default;

NS_IMPL_CYCLE_COLLECTION(PictureInPictureRequest, mVideo, mPromise,
                         mPictureInPictureWindowInstance)
NS_IMPL_CYCLE_COLLECTING_ADDREF(PictureInPictureRequest)
NS_IMPL_CYCLE_COLLECTING_RELEASE(PictureInPictureRequest)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(PictureInPictureRequest)
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

void PictureInPictureService::EnsureInit() {
  MOZ_ASSERT(NS_IsMainThread());
  if (!gPictureInPictureService) [[unlikely]] {
    gPictureInPictureService = new PictureInPictureService();
    ClearOnShutdown(&gPictureInPictureService, ShutdownPhase::XPCOMShutdown);
    if (!gPictureInPictureService->InitializeProvider()) {
      NS_WARNING(
          "Video Picture-in-Picture not yet supported on this platform.");
    }
  }
}

// Platforms that do not implement PictureInPictureFunctions have video
// PictureInPicture disabled.
bool PictureInPictureService::IsSupported() {
  EnsureInit();
  return gPictureInPictureService->mPictureInPictureProvider;
}

/* static */
void PictureInPictureService::OpenPictureInPictureWindow(
    Promise* aPromise, HTMLVideoElement* aVideo) {
  const Document* doc = aVideo->OwnerDoc();
  nsPIDOMWindowInner* window = doc->GetInnerWindow();
  if (!window) {
    aPromise->MaybeRejectWithInvalidStateError("No document or window");
    return;
  }

  // 10.1. If this is pictureInPictureElement:
  if (doc->GetPictureInPictureElementInternal() == aVideo) {
    // 1. Queue a global task on the media element event task source given
    // global to resolve p with the Picture-in-Picture window associated
    // with pictureInPictureElement
    // 2. abort these steps
    // N.B. Function is called from within dispatched runnable. No queuing
    // necessary.
    MOZ_ASSERT(aVideo->GetAssociatedPictureInPictureWindow());
    aPromise->MaybeResolve(aVideo->GetAssociatedPictureInPictureWindow());
    return;
  }

  // Stash the PIP Window instance for later use as well as we need to be
  // able to provide it to the picture in picture functions (see
  // nsIMediaPictureInPictureProvider.idl)
  RefPtr<PictureInPictureWindow> pipWindowInstance =
      MakeRefPtr<PictureInPictureWindow>(window, aVideo);

  // 10.2 Attempt to associate a Picture-in-Picture window with this.
  RefPtr<Promise> servicePromise =
      PictureInPictureService::AssociatePictureInPictureWindowWith(
          aVideo, pipWindowInstance);

  // Note: if the promise is null here, it's technically not 10.3. 10.3 actually
  // happens in the rejection case of the service promise, which executes at a
  // later time. 10.3 If the previous step failed:
  if (!servicePromise) {
    // 1. Queue a global task on the media element event task source given
    // global to reject p with InvalidStateError DOMException.
    // N.B. Function is called from within dispatched runnable. No queuing
    // necessary.
    aPromise->MaybeRejectWithInvalidStateError("Failed to create PIP Window");
    // 2. Abort these steps.
    return;
  }

  auto request = MakeRefPtr<EnterPictureInPictureRequest>(aPromise, aVideo,
                                                          pipWindowInstance);
  // Remainder of parallel steps happen when 10.2 completes
  servicePromise->AppendNativeHandler(request);
}

/* static */
void PictureInPictureService::DispatchExitPictureInPictureRunnable(
    Promise* aPromise, HTMLVideoElement* aVideo) {
  NS_DispatchToMainThread(NS_NewRunnableFunction(
      __func__, [promise = RefPtr{aPromise},
                 video = RefPtr{aVideo}]() MOZ_CAN_RUN_SCRIPT_BOUNDARY {
        PictureInPictureService::ExitPictureInPictureWindow(promise, video);
      }));
}

/* static */
void PictureInPictureService::ExitPictureInPictureWindow(
    Promise* aPromise, HTMLVideoElement* aVideo) {
  Document* doc = aVideo->OwnerDoc();

  // Note: Spec needs update for this check, due to it's in-parallel
  // nature.
  Element* pictureInPictureElement = doc->GetPictureInPictureElementInternal();
  // if pipElement != mVideo, means exit already exited for mVideo (or
  // something like it)
  if (!pictureInPictureElement || pictureInPictureElement != aVideo) {
    if (aPromise) {
      aPromise->MaybeResolveWithUndefined();
    }
    return;
  }

  // 2. Run the close window algorithm with the Picture-in-Picture window
  // associated with pictureInPictureElement.
  RefPtr<Promise> servicePromise =
      PictureInPictureService::ClosePictureInPictureWindow(aVideo);
  // Note: PR for requestPictureInPicture has language like "if user agent
  // deems necessary, it can abort by rejecting with invalid state error".
  if (!servicePromise) {
    if (aPromise) {
      aPromise->MaybeRejectWithInvalidStateError(
          "Failed to create exit picture in picture request.");
    }
    return;
  }

  auto request = MakeRefPtr<ExitPictureInPictureRequest>(aPromise, aVideo);
  // Remainder of exit steps happen in
  // HTMLVideoElement::EndCloningVisually as this can be called via web
  // content JS, but also via the "native to Firefox" PIP implementation.
  servicePromise->AppendNativeHandler(request);
}

/* static */
RefPtr<Promise> PictureInPictureService::AssociatePictureInPictureWindowWith(
    HTMLVideoElement* aElement, PictureInPictureWindow* aWindow) {
  if (!IsSupported()) {
    return nullptr;
  }

  AutoJSAPI jsapi;
  if (NS_WARN_IF(!jsapi.Init(aElement->GetRelevantGlobal()))) {
    return nullptr;
  }
  JSContext* cx = jsapi.cx();

  RefPtr<Promise> chromePromise;
  nsresult rv = gPictureInPictureService->mPictureInPictureProvider
                    ->OpenMediaPictureInPictureWindow(
                        aElement, aWindow, cx, getter_AddRefs(chromePromise));
  if (NS_WARN_IF(NS_FAILED(rv) || !chromePromise)) {
    return nullptr;
  }

  return chromePromise;
}

/* static */
RefPtr<Promise> PictureInPictureService::ClosePictureInPictureWindow(
    Element* aElement) {
  if (!IsSupported()) {
    return nullptr;
  }

  AutoJSAPI jsapi;
  nsPIDOMWindowInner* window = aElement->OwnerDoc()->GetInnerWindow();
  if (NS_WARN_IF(!jsapi.Init(window))) {
    return nullptr;
  }
  JSContext* cx = jsapi.cx();

  RefPtr<Promise> chromePromise;
  nsresult rv = gPictureInPictureService->mPictureInPictureProvider
                    ->CloseMediaPictureInPictureWindow(
                        aElement, cx, getter_AddRefs(chromePromise));
  if (NS_WARN_IF(NS_FAILED(rv) || !chromePromise)) {
    return nullptr;
  }

  return chromePromise;
}

bool PictureInPictureService::InitializeProvider() {
  if (!mPictureInPictureProvider) {
    mPictureInPictureProvider =
        do_CreateInstance("@mozilla.org/toolkit/picture-in-picture-provider");
    if (NS_WARN_IF(!mPictureInPictureProvider)) {
      return false;
    }
  }
  return true;
}

PictureInPictureRequest::PictureInPictureRequest(
    Promise* aPromise, HTMLVideoElement* aVideo,
    PictureInPictureWindow* aPipWindow)
    : mPictureInPictureWindowInstance(aPipWindow),
      mVideo(aVideo),
      mPromise(aPromise) {}

void PictureInPictureRequest::ResolvedCallback(JSContext* aCx,
                                               JS::Handle<JS::Value> aValue,
                                               ErrorResult& aRv) {
  MOZ_ASSERT(NS_IsMainThread());
  OnServicePromiseSettled(true);
}

void PictureInPictureRequest::RejectedCallback(JSContext* aCx,
                                               JS::Handle<JS::Value> aValue,
                                               ErrorResult& aRv) {
  MOZ_ASSERT(NS_IsMainThread());
  OnServicePromiseSettled(false);
}

EnterPictureInPictureRequest::EnterPictureInPictureRequest(
    Promise* aPromise, HTMLVideoElement* aVideo,
    PictureInPictureWindow* aPipWindow)
    : PictureInPictureRequest(aPromise, aVideo, aPipWindow) {}

void EnterPictureInPictureRequest::OnServicePromiseSettled(bool aResolved) {
  // Note: We run when the "service promise" is settled and we should safely be
  // able to run script here, no queueing required.

  // 10.5 Queue a global task on the media element event task source given
  // global, to perform the following steps:
  Document* doc = mVideo->OwnerDoc();
  if (aResolved && mPromise) {
    // 1. Set pictureInPictureElement to this.
    doc->SetPictureInPictureElement(mVideo);
    // TODO: Maybe implement? I don't see the use case for it.
    // 2. Append relevant settings object’s origin to initiators of active
    // Picture-in-Picture sessions.

    mVideo->AddStates(ElementState::PICTURE_IN_PICTURE);
    mVideo->SetAssociatedPictureInPictureWindow(
        mPictureInPictureWindowInstance);

    // 3. If pictureInPictureElement is fullscreenElement, it is RECOMMENDED
    // to exit fullscreen.
    if (mVideo == doc->GetUnretargetedFullscreenElement()) {
      Document::AsyncExitFullscreen(doc);
    }

    // 4. Fire an event named enterpictureinpicture using
    // PictureInPictureEvent at the video with its bubbles attribute initialized
    // to true and its pictureInPictureWindow attribute initialized to
    // Picture-in-Picture window.
    PictureInPictureEventInit eventInit;
    eventInit.mBubbles = true;
    eventInit.mCancelable = false;
    eventInit.mPictureInPictureWindow = mPictureInPictureWindowInstance;

    RefPtr<PictureInPictureEvent> pipEvent = PictureInPictureEvent::Constructor(
        mVideo, u"enterpictureinpicture"_ns, eventInit);
    pipEvent->SetTrusted(true);
    mVideo->DispatchEvent(*pipEvent);

    // 5. Resolve p with the Picture-in-Picture window associated with
    // pictureInPictureElement.
    mPromise->MaybeResolve(mPictureInPictureWindowInstance);
  } else if (!aResolved && mPromise) {
    // This is basically also 10.3.1 the failure step.
    mPromise->MaybeRejectWithInvalidStateError(
        "Picture-in-Picture request failed");
  }
}

ExitPictureInPictureRequest::ExitPictureInPictureRequest(
    Promise* aPromise, HTMLVideoElement* aVideo)
    : PictureInPictureRequest(aPromise, aVideo,
                              aVideo->GetAssociatedPictureInPictureWindow()) {}

void ExitPictureInPictureRequest::OnServicePromiseSettled(bool aResolved) {
  // If we don't have a promise here, something requested exit but not via
  // document.exitPictureInPicture()
  if (!mPromise) {
    return;
  }

  if (!aResolved) {
    mPromise->MaybeRejectWithInvalidStateError("PiP request failed");
    return;
  }
  mPromise->MaybeResolveWithUndefined();
}

}  // namespace mozilla::dom
