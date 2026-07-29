/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_PictureInPictureService_h
#define mozilla_dom_PictureInPictureService_h

#include "mozilla/dom/PictureInPictureEvent.h"
#include "mozilla/dom/PictureInPictureEventBinding.h"
#include "mozilla/dom/PromiseNativeHandler.h"
#include "nsIMediaPictureInPictureProvider.h"

namespace mozilla::dom {

class PictureInPictureRequest;
class PictureInPictureWindow;

/**
 * Service that communicates with platform specific implementation of PIP
 * via nsIMediaPictureInPictureProvider.idl.
 * Also maintains the parallel queue for the picture in picture requests.
 */
class PictureInPictureService {
 public:
  NS_INLINE_DECL_REFCOUNTING(PictureInPictureService)

  static void EnsureInit();
  static bool IsSupported();

  MOZ_CAN_RUN_SCRIPT static void OpenPictureInPictureWindow(
      Promise* aPromise, HTMLVideoElement* aVideo);

  MOZ_CAN_RUN_SCRIPT static void ExitPictureInPictureWindow(
      Promise* aPromise, HTMLVideoElement* aVideo);

  /**
   * Dispatches the runnable that will run the exit picture in picture steps.
   * Accepts a promise nullptr for the cases where it's not a script that
   * requested exit (but exit was caused by something).
   */
  static void DispatchExitPictureInPictureRunnable(Promise* aPromise,
                                                   HTMLVideoElement* aVideo);

 private:
  ~PictureInPictureService() = default;
  bool InitializeProvider();

  static RefPtr<Promise> AssociatePictureInPictureWindowWith(
      HTMLVideoElement* aElement, PictureInPictureWindow* aWindow);
  static RefPtr<Promise> ClosePictureInPictureWindow(Element* aElement);

  nsCOMPtr<nsIMediaPictureInPictureProvider> mPictureInPictureProvider;
};

class PictureInPictureRequest : public PromiseNativeHandler {
 public:
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS
  NS_DECL_CYCLE_COLLECTION_CLASS(PictureInPictureRequest)

  PictureInPictureRequest(Promise* aPromise, HTMLVideoElement* aVideo,
                          PictureInPictureWindow* aPipWindow);

  // PromiseNativeHandler implementation
  void ResolvedCallback(JSContext* aCx, JS::Handle<JS::Value> aValue,
                        ErrorResult& aRv) override;
  void RejectedCallback(JSContext* aCx, JS::Handle<JS::Value> aValue,
                        ErrorResult& aRv) override;

 protected:
  virtual void OnServicePromiseSettled(bool aWasResolved) = 0;
  ~PictureInPictureRequest();

  RefPtr<PictureInPictureWindow> mPictureInPictureWindowInstance;
  RefPtr<HTMLVideoElement> mVideo;
  RefPtr<Promise> mPromise;
};

class EnterPictureInPictureRequest final : public PictureInPictureRequest {
 public:
  EnterPictureInPictureRequest(Promise* aPromise, HTMLVideoElement* aVideo,
                               PictureInPictureWindow* aPipWindow);
  ~EnterPictureInPictureRequest() override = default;
  MOZ_CAN_RUN_SCRIPT_BOUNDARY void OnServicePromiseSettled(
      bool aResolved) override;
};

class ExitPictureInPictureRequest final : public PictureInPictureRequest {
 public:
  ExitPictureInPictureRequest(Promise* aPromise, HTMLVideoElement* aVideo);
  ~ExitPictureInPictureRequest() override = default;
  MOZ_CAN_RUN_SCRIPT_BOUNDARY void OnServicePromiseSettled(
      bool aResolved) override;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_PictureInPictureService_h
