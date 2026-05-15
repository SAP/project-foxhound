/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsBaseParentChannel.h"

NS_IMPL_ISUPPORTS(nsBaseParentChannel, nsIParentChannel, nsIStreamListener,
                  nsIRequestObserver)

NS_IMETHODIMP
nsBaseParentChannel::SetParentListener(
    mozilla::net::ParentChannelListener* aListener) {
  // Nothing to do.
  return NS_OK;
}

NS_IMETHODIMP
nsBaseParentChannel::NotifyClassificationFlags(uint32_t aClassificationFlags,
                                               bool aIsThirdParty) {
  // Nothing to do
  return NS_OK;
}

NS_IMETHODIMP
nsBaseParentChannel::SetClassifierMatchedInfo(const nsACString& aList,
                                              const nsACString& aProvider,
                                              const nsACString& aPrefix) {
  // Nothing to do
  return NS_OK;
}

NS_IMETHODIMP
nsBaseParentChannel::SetClassifierMatchedTrackingInfo(
    const nsACString& aLists, const nsACString& aFullHashes) {
  // Nothing to do
  return NS_OK;
}

NS_IMETHODIMP
nsBaseParentChannel::Delete() {
  // Nothing to do
  return NS_OK;
}

NS_IMETHODIMP
nsBaseParentChannel::GetRemoteType(nsACString& aRemoteType) {
  aRemoteType = mRemoteType;
  return NS_OK;
}

NS_IMETHODIMP
nsBaseParentChannel::OnStartRequest(nsIRequest* aRequest) {
  // The redirect unconditionally resumes the channel we're bound to.
  // We cancel the channel ASAP so we stop receiving further data.
  return NS_BINDING_ABORTED;
}

NS_IMETHODIMP
nsBaseParentChannel::OnStopRequest(nsIRequest* aRequest, nsresult aStatusCode) {
  // See above.
  MOZ_ASSERT(NS_FAILED(aStatusCode));
  return NS_OK;
}

NS_IMETHODIMP
nsBaseParentChannel::OnDataAvailable(nsIRequest* aRequest,
                                     nsIInputStream* aInputStream,
                                     uint64_t aOffset, uint32_t aCount) {
  // See above.
  MOZ_CRASH("Should never be called unless overridden");
}
