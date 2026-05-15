/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_image_FetchDecodedImage_h
#define mozilla_image_FetchDecodedImage_h

#include "mozilla/MozPromise.h"
#include "mozilla/gfx/Point.h"
#include "nsILoadInfo.h"
#include "nsIContentPolicy.h"

class imgIContainer;
class nsIChannel;

namespace mozilla::image {

using FetchDecodedImagePromise =
    mozilla::MozPromise<already_AddRefed<imgIContainer>, nsresult, true>;

/*
 * This method fetches an image URI and starts decoding the image soon as
 * possible. Either resolves the promise with the decoded imgIContainer or
 * rejects with an nsresult, for e.g. network failures or decoding errors.
 *
 * @param aURI URI of the image to download.
 * @param aSize Size to decode the image at (if possible). Use zero width or
 * height to prevent resizing.
 */
RefPtr<FetchDecodedImagePromise> FetchDecodedImage(
    nsIURI* aURI, gfx::IntSize aSize, nsIPrincipal* aLoadingPrincipal,
    nsSecurityFlags aSecurityFlags =
        nsILoadInfo::SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL,
    nsContentPolicyType aContentPolicyType =
        nsIContentPolicy::TYPE_INTERNAL_IMAGE);

RefPtr<FetchDecodedImagePromise> FetchDecodedImage(nsIURI* aURI,
                                                   nsIChannel* aChannel,
                                                   gfx::IntSize aSize);

}  // namespace mozilla::image

#endif  // mozilla_image_FetchDecodedImage_h
