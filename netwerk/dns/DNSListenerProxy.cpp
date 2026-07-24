/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set sw=2 ts=8 et tw=80 : */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/net/DNSListenerProxy.h"
#include "mozilla/StaticPrefs_network.h"
#include "nsICancelable.h"
#include "nsThreadUtils.h"

namespace mozilla {
namespace net {

NS_IMPL_ADDREF(DNSListenerProxy)
NS_IMPL_RELEASE(DNSListenerProxy)
NS_INTERFACE_MAP_BEGIN(DNSListenerProxy)
  NS_INTERFACE_MAP_ENTRY(nsIDNSListener)
  NS_INTERFACE_MAP_ENTRY_CONCRETE(DNSListenerProxy)
NS_INTERFACE_MAP_END

NS_IMETHODIMP
DNSListenerProxy::OnLookupComplete(nsICancelable* aRequest,
                                   nsIDNSRecord* aRecord, nsresult aStatus) {
  RefPtr<DNSListenerProxy> self = this;
  nsCOMPtr<nsICancelable> request = aRequest;
  nsCOMPtr<nsIDNSRecord> record = aRecord;

  nsCOMPtr<nsIRunnable> event = NS_NewRunnableFunction(
      "DNSListenerProxy::OnLookupComplete", [self, request, record, aStatus]() {
        (void)self->mListener->OnLookupComplete(request, record, aStatus);
        self->mListener = nullptr;
      });

  // XXX(valentin) We should also check if we are on the target thread and if
  // true call OnLookupComplete without dispatching.
  // Doing that now causes a deadlock, probably due to a held mutex.

  if (StaticPrefs::network_dns_high_priority_dispatch() &&
      (mTargetThread->GetFeatures() &
       nsIEventTarget::SUPPORTS_PRIORITIZATION)) {
    event = new PrioritizableRunnable(event.forget(),
                                      nsIRunnablePriority::PRIORITY_MEDIUMHIGH);
  }
  nsresult rv = mTargetThread->Dispatch(event.forget(), NS_DISPATCH_NORMAL);
  if (NS_FAILED(rv)) {
    NS_WARNING("DNSListenerProxy::OnLookupComplete dispatch failed.");
  }
  return rv;
}

}  // namespace net
}  // namespace mozilla
