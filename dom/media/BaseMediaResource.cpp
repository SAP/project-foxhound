/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "BaseMediaResource.h"

#include "ChannelMediaResource.h"
#include "CloneableWithRangeMediaResource.h"
#include "FileMediaResource.h"
#include "MediaContainerType.h"
#include "mozilla/InputStreamLengthHelper.h"
#include "mozilla/dom/BlobImpl.h"
#include "mozilla/dom/BlobURLChannel.h"
#include "mozilla/dom/BlobURLProtocolHandler.h"
#include "mozilla/dom/HTMLMediaElement.h"
#include "nsDebug.h"
#include "nsError.h"
#include "nsICloneableInputStream.h"
#include "nsIFile.h"
#include "nsIFileChannel.h"
#include "nsIInputStream.h"
#include "nsNetUtil.h"
#include "nsQueryObject.h"

namespace mozilla {

already_AddRefed<BaseMediaResource> BaseMediaResource::Create(
    MediaResourceCallback* aCallback, nsIChannel* aChannel,
    bool aIsPrivateBrowsing) {
  NS_ASSERTION(NS_IsMainThread(),
               "MediaResource::Open called on non-main thread");

  // If the channel was redirected, we want the post-redirect URI;
  // but if the URI scheme was expanded, say from chrome: to jar:file:,
  // we want the original URI.
  nsCOMPtr<nsIURI> uri;
  nsresult rv = NS_GetFinalChannelURI(aChannel, getter_AddRefs(uri));
  NS_ENSURE_SUCCESS(rv, nullptr);

  nsAutoCString contentTypeString;
  aChannel->GetContentType(contentTypeString);
  Maybe<MediaContainerType> containerType =
      MakeMediaContainerType(contentTypeString);
  if (!containerType) {
    return nullptr;
  }

  // Let's try to create a FileMediaResource in case the channel is a nsIFile
  nsCOMPtr<nsIFileChannel> fc = do_QueryInterface(aChannel);
  if (fc) {
    RefPtr<BaseMediaResource> resource =
        new FileMediaResource(aCallback, aChannel, uri);
    return resource.forget();
  }

  int64_t streamLength = -1;

  RefPtr<dom::BlobURLChannel> blobChan = do_QueryObject(aChannel);
  if (blobChan) {
    // All callers to BaseMediaResource::Create are performed from within an
    // OnStartRequest callback for aChannel, meaning that the backing BlobImpl
    // should be available in our process already.
    RefPtr<dom::BlobImpl> blobImpl;
    rv = blobChan->GetBackingBlob(getter_AddRefs(blobImpl));
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return nullptr;
    }

    IgnoredErrorResult error;

    nsCOMPtr<nsIInputStream> stream;
    blobImpl->CreateInputStream(getter_AddRefs(stream), error);
    if (NS_WARN_IF(error.Failed())) {
      return nullptr;
    }

    // If this stream knows its own size synchronously, we can still use
    // FileMediaResource. If the size is known, it means that the reading
    // doesn't require any async operation.  This is required because
    // FileMediaResource doesn't work with nsIAsyncInputStreams.
    int64_t length;
    if (InputStreamLengthHelper::GetSyncLength(stream, &length) &&
        length >= 0) {
      RefPtr<BaseMediaResource> resource =
          new FileMediaResource(aCallback, aChannel, uri, length);
      return resource.forget();
    }

    // Also if the stream doesn't know its own size synchronously, we can still
    // read the length from the blob.
    uint64_t size = blobImpl->GetSize(error);
    if (NS_WARN_IF(error.Failed())) {
      return nullptr;
    }

    // Maybe this blob URL can be cloned with a range.
    nsCOMPtr<nsICloneableInputStreamWithRange> cloneableWithRange =
        do_QueryInterface(stream);
    if (cloneableWithRange) {
      RefPtr<BaseMediaResource> resource = new CloneableWithRangeMediaResource(
          aCallback, aChannel, uri, stream, size);
      return resource.forget();
    }

    // We know the size of the stream for blobURLs, let's use it.
    streamLength = size;
  }

  RefPtr<BaseMediaResource> resource = new ChannelMediaResource(
      aCallback, aChannel, uri, streamLength, aIsPrivateBrowsing);
  return resource.forget();
}

void BaseMediaResource::SetLoadInBackground(bool aLoadInBackground) {
  if (aLoadInBackground == mLoadInBackground) {
    return;
  }
  mLoadInBackground = aLoadInBackground;
  if (!mChannel) {
    // No channel, resource is probably already loaded.
    return;
  }

  MediaDecoderOwner* owner = mCallback->GetMediaOwner();
  if (!owner) {
    NS_WARNING("Null owner in MediaResource::SetLoadInBackground()");
    return;
  }
  RefPtr<dom::HTMLMediaElement> element = owner->GetMediaElement();
  if (!element) {
    NS_WARNING("Null element in MediaResource::SetLoadInBackground()");
    return;
  }

  bool isPending = false;
  if (NS_SUCCEEDED(mChannel->IsPending(&isPending)) && isPending) {
    nsLoadFlags loadFlags;
    DebugOnly<nsresult> rv = mChannel->GetLoadFlags(&loadFlags);
    NS_ASSERTION(NS_SUCCEEDED(rv), "GetLoadFlags() failed!");

    if (aLoadInBackground) {
      loadFlags |= nsIRequest::LOAD_BACKGROUND;
    } else {
      loadFlags &= ~nsIRequest::LOAD_BACKGROUND;
    }
    (void)NS_WARN_IF(NS_FAILED(ModifyLoadFlags(loadFlags)));
  }
}

nsresult BaseMediaResource::ModifyLoadFlags(nsLoadFlags aFlags) {
  RefPtr<BaseMediaResource> kungFuDeathGrip(this);
  nsCOMPtr<nsIChannel> channel = mChannel;

  nsCOMPtr<nsILoadGroup> loadGroup;
  nsresult rv = channel->GetLoadGroup(getter_AddRefs(loadGroup));
  MOZ_ASSERT(NS_SUCCEEDED(rv), "GetLoadGroup() failed!");

  bool inLoadGroup = false;
  if (loadGroup) {
    nsresult status;
    channel->GetStatus(&status);

    rv = loadGroup->RemoveRequest(channel, nullptr, status);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return rv;
    }
    inLoadGroup = true;
  }

  rv = channel->SetLoadFlags(aFlags);
  MOZ_ASSERT(NS_SUCCEEDED(rv), "SetLoadFlags() failed!");

  if (inLoadGroup) {
    rv = loadGroup->AddRequest(channel, nullptr);
    MOZ_ASSERT(NS_SUCCEEDED(rv), "AddRequest() failed!");
  }

  return NS_OK;
}

}  // namespace mozilla
