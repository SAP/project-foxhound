/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cin: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_GeckoViewContentChannelChild_h_
#define mozilla_net_GeckoViewContentChannelChild_h_

#include "nsBaseChannel.h"
#include "nsIChildChannel.h"
#include "mozilla/net/ChannelEventQueue.h"
#include "mozilla/net/PGeckoViewContentChannelChild.h"
#include "mozilla/NotNull.h"

namespace mozilla::net {

class GeckoViewContentChannelChild final
    : public nsBaseChannel,
      public nsIChildChannel,
      public PGeckoViewContentChannelChild {
 public:
  explicit GeckoViewContentChannelChild(nsIURI* aUri);

  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_NSICHILDCHANNEL

  NS_IMETHOD Cancel(nsresult aStatus) override;
  NS_IMETHOD Suspend() override;
  NS_IMETHOD Resume() override;

  NS_IMETHOD AsyncOpen(nsIStreamListener* aListener) override;

  nsresult OpenContentStream(bool aAsync, nsIInputStream** aStream,
                             nsIChannel** aChannel) override;

  mozilla::ipc::IPCResult RecvOnStartRequest(const nsresult& aChannelStatus,
                                             const nsACString& aContentType,
                                             const nsACString& aEntityID,
                                             mozilla::NotNull<nsIURI*> aURI);

  mozilla::ipc::IPCResult RecvOnDataAvailable(const nsresult& aChannelStatus,
                                              const nsACString& aData,
                                              const uint64_t& aOffset,
                                              const uint32_t& aCount);

  mozilla::ipc::IPCResult RecvOnStopRequest(const nsresult& aChannelStatus);

  mozilla::ipc::IPCResult RecvOnAsyncOpenFailed(const nsresult& aResult);

  mozilla::ipc::IPCResult RecvDeleteSelf();

  friend class NeckoTargetChannelFunctionEvent;

 protected:
  virtual void ActorDestroy(ActorDestroyReason why) override;

 private:
  virtual ~GeckoViewContentChannelChild() = default;

  void DoOnStartRequest(const nsresult& aChannelStatus,
                        const nsCString& aContentType,
                        const nsCString& aEntityID, nsIURI* aURI);

  void DoOnDataAvailable(const nsresult& aChannelStatus, const nsCString& aData,
                         const uint64_t& aOffset, const uint32_t& aCount);

  void DoOnStopRequest(const nsresult& aChannelStatus);

  void DoOnAsyncOpenFailed(const nsresult& aResult);

  void DoDeleteSelf();

  const RefPtr<ChannelEventQueue> mEventQ;
  uint32_t mSuspendCount = 0;
  bool mSuspendSent = false;
};

}  // namespace mozilla::net

#endif
