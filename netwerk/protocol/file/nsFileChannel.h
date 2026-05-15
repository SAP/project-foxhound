/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cin: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsFileChannel_h_
#define nsFileChannel_h_

#include "nsBaseChannel.h"
#include "nsIChildChannel.h"
#include "nsIFileChannel.h"
#include "nsIUploadChannel.h"

namespace mozilla::net {
class FileChannelInfo;
}

class nsFileChannel : public nsBaseChannel,
                      public nsIFileChannel,
                      public nsIUploadChannel,
                      public nsIIdentChannel,
                      public nsIChildChannel {
 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_NSIFILECHANNEL
  NS_DECL_NSIUPLOADCHANNEL
  NS_FORWARD_NSIREQUEST(nsBaseChannel::)
  NS_FORWARD_NSICHANNEL(nsBaseChannel::)
  NS_DECL_NSIIDENTCHANNEL
  NS_DECL_NSICHILDCHANNEL

  explicit nsFileChannel(nsIURI* uri);

  nsresult Init();

  static nsresult DoNotifyFileChannelOpened(
      const nsACString& aRemoteType,
      const mozilla::net::FileChannelInfo& aFileChannelInfo);

 protected:
  ~nsFileChannel() = default;

  // Called to construct a blocking file input stream for the given file.  This
  // method also returns a best guess at the content-type for the data stream.
  // NOTE: If the channel has a type hint set, contentType will be left
  // untouched. The caller should not use it in that case.
  [[nodiscard]] nsresult MakeFileInputStream(nsIFile* file,
                                             nsCOMPtr<nsIInputStream>& stream,
                                             nsCString& contentType,
                                             bool async);

  [[nodiscard]] nsresult OpenContentStream(bool async, nsIInputStream** result,
                                           nsIChannel** channel) override;

  // Implementing the pump blocking promise to fixup content length on a
  // background thread prior to calling on mListener
  nsresult ListenerBlockingPromise(BlockingPromise** promise) override;
  uint64_t mChannelId = 0;

 private:
  nsresult FixupContentLength(bool async);
  nsresult MaybeSendFileOpenNotification();

  nsCOMPtr<nsIInputStream> mUploadStream;
  int64_t mUploadLength;
  nsCOMPtr<nsIURI> mFileURI;
};

#endif  // !nsFileChannel_h_
