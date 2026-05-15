/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_image_remote_RemoteImageProtocolHandler_h
#define mozilla_image_remote_RemoteImageProtocolHandler_h

#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/StaticPtr.h"
#include "mozilla/dom/ContentParent.h"
#include "mozilla/MozPromise.h"
#include "nsIProtocolHandler.h"
#include "nsThreadUtils.h"
#include "nsWeakReference.h"

namespace mozilla::image {

class RemoteImageProtocolHandler : public nsIProtocolHandler,
                                   public nsSupportsWeakReference {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIPROTOCOLHANDLER

  static already_AddRefed<RemoteImageProtocolHandler> GetSingleton() {
    MOZ_ASSERT(NS_IsMainThread());
    if (MOZ_UNLIKELY(!sSingleton)) {
      sSingleton = new RemoteImageProtocolHandler();
      ClearOnShutdown(&sSingleton);
    }
    return do_AddRef(sSingleton);
  }

  static already_AddRefed<gfx::SourceSurface> GetImageSurface(
      imgIContainer* aContainer, gfx::IntSize aSize, ColorScheme aColorScheme);

 private:
  virtual ~RemoteImageProtocolHandler() = default;

  static StaticRefPtr<RemoteImageProtocolHandler> sSingleton;
};

}  // namespace mozilla::image

#endif  // mozilla_image_remote_RemoteImageProtocolHandler_h
