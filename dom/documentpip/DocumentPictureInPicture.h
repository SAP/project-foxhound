/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_documentpip_DocumentPictureInPicture_h
#define mozilla_dom_documentpip_DocumentPictureInPicture_h

#include "mozilla/DOMEventTargetHelper.h"
#include "mozilla/dom/DocumentPictureInPictureBinding.h"

namespace mozilla::dom {

class DocumentPictureInPicture final : public DOMEventTargetHelper,
                                       public nsIObserver {
 public:
  NS_DECL_NSIOBSERVER

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_CLASS_INHERITED(DocumentPictureInPicture,
                                           DOMEventTargetHelper)

  explicit DocumentPictureInPicture(nsPIDOMWindowInner* aWindow);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  already_AddRefed<Promise> RequestWindow(
      const DocumentPictureInPictureOptions& aOptions, ErrorResult& aRv);

  // Get the current PiP window, exposed as webidl property
  nsGlobalWindowInner* GetWindow();

  IMPL_EVENT_HANDLER(enter);

  static Maybe<CSSIntRect> GetScreenRect(nsPIDOMWindowOuter* aWindow);

  static CSSIntSize CalcMaxDimensions(const CSSIntRect& aScreen);

  CSSIntRect DetermineExtent(bool aPreferInitialWindowPlacement,
                             const CSSIntSize& aRequestedSize,
                             const CSSIntRect& aScreen);

 private:
  ~DocumentPictureInPicture();

  MOZ_CAN_RUN_SCRIPT void OnPiPResized();

  void OnPiPClosed();

  static const CSSIntSize sDefaultSize, sMinSize;

  // The extent of the most recently closed PiP
  Maybe<CSSIntRect> mPreviousExtent;

  // The size with which the most recent PiP was requested
  Maybe<CSSIntSize> mLastRequestedSize;

  // The currently open PiP (if any)
  RefPtr<nsPIDOMWindowInner> mLastOpenedWindow;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_documentpip_DocumentPictureInPicture_h
