/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=4 sw=2 sts=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GeckoViewContentChannelChild.h"

#include "mozilla/dom/BrowserChild.h"
#include "mozilla/dom/ContentChild.h"
#include "mozilla/ipc/URIUtils.h"
#include "mozilla/net/NeckoChild.h"
#include "nsContentSecurityManager.h"
#include "nsGkAtoms.h"
#include "nsIBrowserChild.h"
#include "nsIURIMutator.h"
#include "nsStringStream.h"
#include "SerializedLoadContext.h"

namespace mozilla::net {

NS_IMPL_ISUPPORTS_INHERITED(GeckoViewContentChannelChild, nsBaseChannel,
                            nsIChildChannel)

GeckoViewContentChannelChild::GeckoViewContentChannelChild(nsIURI* aURI)
    : mEventQ(new ChannelEventQueue(static_cast<nsIChildChannel*>(this))) {
  SetURI(aURI);
  SetOriginalURI(aURI);
}

NS_IMETHODIMP
GeckoViewContentChannelChild::ConnectParent(uint32_t aId) {
  mozilla::dom::BrowserChild* browserChild = nullptr;
  nsCOMPtr<nsIBrowserChild> iBrowserChild;
  NS_QueryNotificationCallbacks(mCallbacks, mLoadGroup,
                                NS_GET_IID(nsIBrowserChild),
                                getter_AddRefs(iBrowserChild));
  GetCallback(iBrowserChild);
  if (iBrowserChild) {
    browserChild =
        static_cast<mozilla::dom::BrowserChild*>(iBrowserChild.get());
  }

  GeckoViewContentChannelConnectArgs connectArgs(aId);
  if (!gNeckoChild->SendPGeckoViewContentChannelConstructor(
          this, browserChild, IPC::SerializedLoadContext(this), connectArgs)) {
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

NS_IMETHODIMP
GeckoViewContentChannelChild::CompleteRedirectSetup(
    nsIStreamListener* aListener) {
  mListener = aListener;

  if (mLoadGroup) {
    mLoadGroup->AddRequest(this, nullptr);
  }

  return NS_OK;
}

void GeckoViewContentChannelChild::ActorDestroy(ActorDestroyReason why) {}

NS_IMETHODIMP
GeckoViewContentChannelChild::AsyncOpen(nsIStreamListener* aListener) {
  nsCOMPtr<nsIStreamListener> listener = aListener;

  nsresult rv =
      nsContentSecurityManager::doContentSecurityCheck(this, listener);
  if (MOZ_UNLIKELY(NS_FAILED(rv))) {
    return rv;
  }

  NS_ENSURE_TRUE(!!gNeckoChild, NS_ERROR_FAILURE);
  NS_ENSURE_TRUE(!dom::ContentChild::GetSingleton()->IsShuttingDown(),
                 NS_ERROR_FAILURE);
  NS_ENSURE_TRUE(!mWasOpened, NS_ERROR_ALREADY_OPENED);
  NS_ENSURE_ARG(listener);

  // Ensure that this is an allowed port before proceeding.
  rv = NS_CheckPortSafety(nsBaseChannel::URI());
  if (MOZ_UNLIKELY(NS_FAILED(rv))) {
    return rv;
  }

  if (mLoadGroup) {
    mLoadGroup->AddRequest(this, nullptr);
  }

  uint32_t loadFlags = 0;
  GetLoadFlags(&loadFlags);

  GeckoViewContentChannelOpenArgs openArgs;
  ipc::SerializeURI(nsBaseChannel::URI(), openArgs.uri());
  openArgs.loadFlags() = loadFlags;

  nsCOMPtr<nsILoadInfo> loadInfo = nsBaseChannel::LoadInfo();
  rv = mozilla::ipc::LoadInfoToLoadInfoArgs(loadInfo, &openArgs.loadInfo());
  if (MOZ_UNLIKELY(NS_FAILED(rv))) {
    return rv;
  }

  mozilla::dom::BrowserChild* browserChild = nullptr;
  nsCOMPtr<nsIBrowserChild> iBrowserChild;
  NS_QueryNotificationCallbacks(mCallbacks, mLoadGroup,
                                NS_GET_IID(nsIBrowserChild),
                                getter_AddRefs(iBrowserChild));
  GetCallback(iBrowserChild);
  if (iBrowserChild) {
    browserChild =
        static_cast<mozilla::dom::BrowserChild*>(iBrowserChild.get());
  }

  if (!gNeckoChild->SendPGeckoViewContentChannelConstructor(
          this, browserChild, IPC::SerializedLoadContext(this), openArgs)) {
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

NS_IMETHODIMP
GeckoViewContentChannelChild::Cancel(nsresult aStatus) {
  if (mCanceled) {
    return NS_OK;
  }

  mCanceled = true;
  mStatus = aStatus;

  if (CanSend()) {
    SendCancel(aStatus);
  }

  return NS_OK;
}

NS_IMETHODIMP
GeckoViewContentChannelChild::Suspend() {
  if (!mSuspendCount++) {
    SendSuspend();
    mSuspendSent = true;
  }
  mEventQ->Suspend();

  return NS_OK;
}

NS_IMETHODIMP
GeckoViewContentChannelChild::Resume() {
  if (!mSuspendCount) {
    return NS_ERROR_UNEXPECTED;
  }

  if (!--mSuspendCount && mSuspendSent) {
    SendResume();
  }
  mEventQ->Resume();

  return NS_OK;
}

nsresult GeckoViewContentChannelChild::OpenContentStream(
    bool aAsync, nsIInputStream** aStream, nsIChannel** aChannel) {
  MOZ_ASSERT_UNREACHABLE(
      "GeckoViewContentChannel*Child* should never have OpenContentStream "
      "called!");
  return NS_OK;
}

mozilla::ipc::IPCResult GeckoViewContentChannelChild::RecvOnStartRequest(
    const nsresult& aChannelStatus, const nsACString& aContentType,
    const nsACString& aEntityID, mozilla::NotNull<nsIURI*> aURI) {
  mEventQ->RunOrEnqueue(new NeckoTargetChannelFunctionEvent(
      this, [self = UnsafePtr<GeckoViewContentChannelChild>(this),
             aChannelStatus, aContentType = nsCString(aContentType),
             aEntityID = nsCString(aEntityID), aURI = RefPtr{aURI.get()}]() {
        self->DoOnStartRequest(aChannelStatus, aContentType, aEntityID, aURI);
      }));
  return IPC_OK();
}

void GeckoViewContentChannelChild::DoOnStartRequest(
    const nsresult& aChannelStatus, const nsCString& aContentType,
    const nsCString& aEntityID, nsIURI* aURI) {
  // content:// doesn't know data length at this time.
  mContentLength = -1;
  SetContentType(aContentType);

  nsCString spec;
  nsresult rv = aURI->GetSpec(spec);
  if (NS_SUCCEEDED(rv)) {
    // Changes nsBaseChannel::URI()
    rv = NS_MutateURI(mURI).SetSpec(spec).Finalize(mURI);
  }

  if (NS_FAILED(rv)) {
    Cancel(rv);
  }

  AutoEventEnqueuer ensureSerialDispatch(mEventQ);
  rv = mListener->OnStartRequest(reinterpret_cast<nsBaseChannel*>(this));
  if (MOZ_UNLIKELY(NS_FAILED(rv))) {
    Cancel(rv);
  }
}

mozilla::ipc::IPCResult GeckoViewContentChannelChild::RecvOnDataAvailable(
    const nsresult& aChannelStatus, const nsACString& aData,
    const uint64_t& aOffset, const uint32_t& aCount) {
  mEventQ->RunOrEnqueue(new NeckoTargetChannelFunctionEvent(
      this, [self = UnsafePtr<GeckoViewContentChannelChild>(this),
             aChannelStatus, aData = nsCString(aData), aOffset, aCount]() {
        self->DoOnDataAvailable(aChannelStatus, aData, aOffset, aCount);
      }));
  return IPC_OK();
}

void GeckoViewContentChannelChild::DoOnDataAvailable(
    const nsresult& aChannelStatus, const nsCString& aData,
    const uint64_t& aOffset, const uint32_t& aCount) {
  nsCOMPtr<nsIInputStream> stringStream;
  nsresult rv =
      NS_NewByteInputStream(getter_AddRefs(stringStream),
                            Span(aData).To(aCount), NS_ASSIGNMENT_DEPEND);
  if (MOZ_UNLIKELY(NS_FAILED(rv))) {
    Cancel(rv);
    return;
  }

  AutoEventEnqueuer ensureSerialDispatch(mEventQ);
  rv = mListener->OnDataAvailable(reinterpret_cast<nsBaseChannel*>(this),
                                  stringStream, aOffset, aCount);
  stringStream->Close();
  if (MOZ_UNLIKELY(NS_FAILED(rv))) {
    Cancel(rv);
  }
}

mozilla::ipc::IPCResult GeckoViewContentChannelChild::RecvOnStopRequest(
    const nsresult& aChannelStatus) {
  mEventQ->RunOrEnqueue(new NeckoTargetChannelFunctionEvent(
      this, [self = UnsafePtr<GeckoViewContentChannelChild>(this),
             aChannelStatus]() { self->DoOnStopRequest(aChannelStatus); }));
  return IPC_OK();
}

void GeckoViewContentChannelChild::DoOnStopRequest(
    const nsresult& aChannelStatus) {
  if (!mCanceled) {
    mStatus = aChannelStatus;
  }

  {
    AutoEventEnqueuer ensureSerialDispatch(mEventQ);
    mListener->OnStopRequest(reinterpret_cast<nsBaseChannel*>(this),
                             aChannelStatus);
    mListener = nullptr;

    if (mLoadGroup) {
      mLoadGroup->RemoveRequest(this, nullptr, aChannelStatus);
    }
  }

  Send__delete__(this);
}

mozilla::ipc::IPCResult GeckoViewContentChannelChild::RecvOnAsyncOpenFailed(
    const nsresult& aChannelStatus) {
  mEventQ->RunOrEnqueue(new NeckoTargetChannelFunctionEvent(
      this, [self = UnsafePtr<GeckoViewContentChannelChild>(this),
             aChannelStatus]() { self->DoOnAsyncOpenFailed(aChannelStatus); }));
  return IPC_OK();
}

void GeckoViewContentChannelChild::DoOnAsyncOpenFailed(
    const nsresult& aChannelStatus) {
  mStatus = aChannelStatus;

  if (mLoadGroup) {
    mLoadGroup->RemoveRequest(this, nullptr, aChannelStatus);
  }

  if (mListener) {
    mListener->OnStartRequest(reinterpret_cast<nsBaseChannel*>(this));
    mListener->OnStopRequest(reinterpret_cast<nsBaseChannel*>(this),
                             aChannelStatus);
  }

  mListener = nullptr;

  if (CanSend()) {
    Send__delete__(this);
  }
}

mozilla::ipc::IPCResult GeckoViewContentChannelChild::RecvDeleteSelf() {
  mEventQ->RunOrEnqueue(new NeckoTargetChannelFunctionEvent(
      this, [self = UnsafePtr<GeckoViewContentChannelChild>(this)]() {
        self->DoDeleteSelf();
      }));
  return IPC_OK();
}

void GeckoViewContentChannelChild::DoDeleteSelf() {
  if (CanSend()) {
    Send__delete__(this);
  }
}

}  // namespace mozilla::net
