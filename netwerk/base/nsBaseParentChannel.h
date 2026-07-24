/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsBaseParentChannel_h
#define nsBaseParentChannel_h

#include "nsIParentChannel.h"

// Basic type which implements a no-op nsIParentChannel instance.
//
// nsBaseChannel can be used when implementing simple channels which need to
// support cross-process redirects, and do not need the other features
// nsIParentChannel supports.
//
// The default behaviour if nothing is overridden is to close the channel as
// soon as `OnStartRequest` is received. The implementations of
// `nsIRequestObserver` and `nsIStreamListener` can be overridden to change this
// behaviour.
class nsBaseParentChannel : public nsIParentChannel {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIPARENTCHANNEL
  NS_DECL_NSIREQUESTOBSERVER
  NS_DECL_NSISTREAMLISTENER

  explicit nsBaseParentChannel(const nsACString& aRemoteType)
      : mRemoteType(aRemoteType) {}

 protected:
  virtual ~nsBaseParentChannel() = default;

  nsCString mRemoteType;
};

#endif  // nsBaseParentChannel_h
