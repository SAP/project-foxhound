/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_BlobURLChannel_h
#define mozilla_dom_BlobURLChannel_h

#include "mozilla/net/ContentRange.h"
#include "nsBaseChannel.h"
#include "nsCOMPtr.h"
#include "nsContentUtils.h"
#include "nsIInputStream.h"

class nsIURI;

namespace mozilla::dom {

#define MOZ_BLOBURLCHANNEL_IID \
  {0xe6d2a388, 0x0007, 0x42e4, {0xbf, 0x0b, 0xa1, 0x2b, 0xc8, 0x1a, 0x8c, 0x1f}}

class BlobImpl;

class BlobURLChannel final : public nsBaseChannel {
 public:
  NS_INLINE_DECL_STATIC_IID(MOZ_BLOBURLCHANNEL_IID)

  NS_DECL_ISUPPORTS_INHERITED

  BlobURLChannel(nsIURI* aURI, nsILoadInfo* aLoadInfo);

  // Unlike other non-http(s) channels, blob channels may specify a content
  // range which will be used to read a subset of the full blob. This method can
  // be used by callers to provide the relevant information before AsyncOpen.
  nsresult SetRequestContentRangeHeader(const nsACString& aContentRangeHeader);
  const Maybe<nsContentUtils::ParsedRange>& GetRequestContentRange() {
    return mRequestContentRange;
  }

  // Getter/Setter for the response ContentRange object. This is derived from
  // the request content range, with the additional context of the true
  // content-length of the underlying BlobImpl.
  // The response ContentRange is only available after OnStartRequest, and only
  // if the channel has not been cancelled.
  net::ContentRange* GetResponseContentRange() { return mResponseContentRange; }
  nsresult SetResponseContentRange(net::ContentRange* aContentRange);

  // Get the BlobImpl backing this BlobURLChannel.
  // The BlobImpl is only available after OnStartRequest, and only if the
  // channel has not been cancelled.
  nsresult GetBackingBlob(BlobImpl** aBlobImpl);
  nsresult SetBackingBlob(BlobImpl* aBlobImpl);

  NS_IMETHOD SetContentType(const nsACString& aContentType) override;

 private:
  ~BlobURLChannel() override;

  nsresult OpenContentStream(bool aAsync, nsIInputStream** aResult,
                             nsIChannel** aChannel) override;

  bool mContentStreamOpened;

  Maybe<nsContentUtils::ParsedRange> mRequestContentRange;

  RefPtr<BlobImpl> mBlobImpl;
  RefPtr<net::ContentRange> mResponseContentRange;
};

}  // namespace mozilla::dom

#endif /* mozilla_dom_BlobURLChannel_h */
