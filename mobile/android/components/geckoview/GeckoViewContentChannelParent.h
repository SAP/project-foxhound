/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=4 sw=2 sts=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_GeckoViewContentChannelParent_h
#define mozilla_net_GeckoViewContentChannelParent_h

#include "nsIInterfaceRequestor.h"
#include "nsIParentChannel.h"
#include "nsISupportsImpl.h"

#include "mozilla/dom/BrowserParent.h"
#include "mozilla/net/NeckoParent.h"
#include "mozilla/net/PGeckoViewContentChannelParent.h"

namespace mozilla::net {

class GeckoViewContentChannelParent final
    : public nsIParentChannel,
      public nsIInterfaceRequestor,
      public PGeckoViewContentChannelParent {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIPARENTCHANNEL
  NS_DECL_NSIREQUESTOBSERVER
  NS_DECL_NSISTREAMLISTENER
  NS_DECL_NSIINTERFACEREQUESTOR

  GeckoViewContentChannelParent(dom::BrowserParent* aIframeEmbedding,
                                nsILoadContext* aLoadContext);

  bool Init(const GeckoViewContentChannelArgs& aArgs);

  mozilla::ipc::IPCResult RecvCancel(const nsresult& aStatus);
  mozilla::ipc::IPCResult RecvSuspend();
  mozilla::ipc::IPCResult RecvResume();

 private:
  ~GeckoViewContentChannelParent() = default;

  bool Init(const GeckoViewContentChannelOpenArgs& aArgs);
  bool Init(const GeckoViewContentChannelConnectArgs& aArgs);

  nsCOMPtr<nsIChannel> mChannel;
  nsCOMPtr<nsILoadContext> mLoadContext;
  RefPtr<dom::BrowserParent> mBrowserParent;
};

}  // namespace mozilla::net
#endif
