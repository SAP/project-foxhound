/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_XMLHttpRequestWorker_h
#define mozilla_dom_XMLHttpRequestWorker_h

#include "XMLHttpRequest.h"
#include "XMLHttpRequestString.h"
#include "mozilla/WeakPtr.h"
#include "mozilla/dom/BodyExtractor.h"
#include "mozilla/dom/TypedArray.h"

// XXX Avoid including this here by moving function bodies to the cpp file
#include "mozilla/dom/BlobImpl.h"

namespace mozilla::dom {

class Proxy;
class DOMString;
class SendRunnable;
class ThreadSafeWorkerRef;
class WorkerPrivate;

class XMLHttpRequestWorker final : public SupportsWeakPtr,
                                   public XMLHttpRequest {
 public:
  // This defines the xhr.response value.
  struct ResponseData {
    nsresult mResponseResult;

    // responseType is empty or text.
    XMLHttpRequestStringSnapshot mResponseText;

    // responseType is blob
    RefPtr<BlobImpl> mResponseBlobImpl;

    // responseType is arrayBuffer;
    RefPtr<ArrayBufferBuilder> mResponseArrayBufferBuilder;

    // responseType is json
    nsString mResponseJSON;

    ResponseData() : mResponseResult(NS_OK) {}
  };

  struct StateData {
    nsString mResponseURL;
    uint32_t mStatus{0};
    nsCString mStatusText;
    uint16_t mReadyState{0};
    nsresult mStatusResult{NS_OK};
  };

 private:
  RefPtr<XMLHttpRequestUpload> mUpload;

  // This is set by SendRunnable::RunOnMainThread when the send process starts
  // and is cleared by Proxy::Teardown and is held for the duration of the send.
  // Additionally, it will be temporarily saved off by various sync runnables
  // and replaced with their own reference to make a ThreadSafeWorkerRef
  // available to the proxy for the duration of the sync runnables.
  // They will restore the state when their sync runnable completes its main
  // thread work.
  RefPtr<ThreadSafeWorkerRef> mWorkerRef;
  RefPtr<XMLHttpRequestWorker> mPinnedSelfRef;
  RefPtr<Proxy> mProxy;

  XMLHttpRequestResponseType mResponseType;

  UniquePtr<StateData> mStateData;

  UniquePtr<ResponseData> mResponseData;
  RefPtr<Blob> mResponseBlob;
  JS::Heap<JSObject*> mResponseArrayBufferValue;
  JS::Heap<JS::Value> mResponseJSONValue;

  uint32_t mEventStreamId{0};
  uint32_t mTimeout;

  bool mBackgroundRequest;
  bool mWithCredentials;
  bool mCanceled;
  bool mFlagSend{false};  // spec flag
  bool mFlagSendActive;

  bool mMozAnon;
  bool mMozSystem;

  nsString mMimeTypeOverride;

 public:
  NS_DECL_ISUPPORTS_INHERITED
  NS_DECL_CYCLE_COLLECTION_SCRIPT_HOLDER_CLASS_INHERITED(XMLHttpRequestWorker,
                                                         XMLHttpRequest)

  static already_AddRefed<XMLHttpRequest> Construct(
      const GlobalObject& aGlobal, const MozXMLHttpRequestParameters& aParams,
      ErrorResult& aRv);

  void Unpin();

  virtual uint16_t ReadyState() const override;

  virtual void Open(const nsACString& aMethod, const nsAString& aUrl,
                    ErrorResult& aRv) override {
    Open(aMethod, aUrl, true, Optional<nsAString>(), Optional<nsAString>(),
         aRv);
  }

  uint32_t EventStreamId() const { return mEventStreamId; }

  virtual void Open(const nsACString& aMethod, const nsAString& aUrl,
                    bool aAsync, const nsAString& aUsername,
                    const nsAString& aPassword, ErrorResult& aRv) override {
    Optional<nsAString> username;
    username = &aUsername;
    Optional<nsAString> password;
    password = &aPassword;
    Open(aMethod, aUrl, aAsync, username, password, aRv);
  }

  void Open(const nsACString& aMethod, const nsAString& aUrl, bool aAsync,
            const Optional<nsAString>& aUser,
            const Optional<nsAString>& aPassword, ErrorResult& aRv);

  virtual void SetRequestHeader(const nsACString& aHeader,
                                const nsACString& aValue,
                                ErrorResult& aRv) override;

  virtual uint32_t Timeout() const override { return mTimeout; }

  virtual void SetTimeout(uint32_t aTimeout, ErrorResult& aRv) override;

  virtual bool WithCredentials() const override { return mWithCredentials; }

  virtual void SetWithCredentials(bool aWithCredentials,
                                  ErrorResult& aRv) override;

  virtual bool MozBackgroundRequest() const override {
    return mBackgroundRequest;
  }

  virtual void SetMozBackgroundRequest(bool aBackgroundRequest,
                                       ErrorResult& aRv) override;

  virtual nsIChannel* GetChannel() const override {
    MOZ_CRASH("This method cannot be called on workers.");
  }

  virtual XMLHttpRequestUpload* GetUpload(ErrorResult& aRv) override;

  virtual void Send(
      const Nullable<
          DocumentOrBlobOrArrayBufferViewOrArrayBufferOrFormDataOrURLSearchParamsOrUSVString>&
          aData,
      ErrorResult& aRv) override;

  virtual void SendInputStream(nsIInputStream* aInputStream,
                               ErrorResult& aRv) override {
    MOZ_CRASH("nsIInputStream is not a valid argument for XHR in workers.");
  }

  virtual void Abort(ErrorResult& aRv) override;

  virtual void GetResponseURL(nsAString& aUrl) override {
    aUrl = mStateData->mResponseURL;
  }

  uint32_t GetStatus(ErrorResult& aRv) override {
    aRv = mStateData->mStatusResult;
    return mStateData->mStatus;
  }

  virtual void GetStatusText(nsACString& aStatusText,
                             ErrorResult& aRv) override {
    aStatusText = mStateData->mStatusText;
  }

  virtual void GetResponseHeader(const nsACString& aHeader,
                                 nsACString& aResponseHeader,
                                 ErrorResult& aRv) override;

  virtual void GetAllResponseHeaders(nsACString& aResponseHeaders,
                                     ErrorResult& aRv) override;

  virtual void OverrideMimeType(const nsAString& aMimeType,
                                ErrorResult& aRv) override;

  virtual XMLHttpRequestResponseType ResponseType() const override {
    return mResponseType;
  }

  virtual void SetResponseType(XMLHttpRequestResponseType aResponseType,
                               ErrorResult& aRv) override;

  virtual void GetResponse(JSContext* /* unused */,
                           JS::MutableHandle<JS::Value> aResponse,
                           ErrorResult& aRv) override;

  virtual void GetResponseText(DOMString& aResponseText,
                               ErrorResult& aRv) override;

  virtual Document* GetResponseXML(ErrorResult& aRv) override {
    MOZ_CRASH("This method should not be called.");
  }

  virtual void GetInterface(JSContext* aCx, JS::Handle<JS::Value> aIID,
                            JS::MutableHandle<JS::Value> aRetval,
                            ErrorResult& aRv) override {
    aRv.Throw(NS_ERROR_FAILURE);
  }

  virtual void SetOriginAttributes(
      const mozilla::dom::OriginAttributesDictionary& aAttrs) override {
    MOZ_CRASH("This method cannot be called on workers.");
  }

  XMLHttpRequestUpload* GetUploadObjectNoCreate() const { return mUpload; }

  void UpdateState(UniquePtr<StateData>&& aStateData,
                   UniquePtr<ResponseData>&& aResponseData);

  virtual uint16_t ErrorCode() const override {
    return 0;  // eOK
  }

  virtual bool MozAnon() const override { return mMozAnon; }

  virtual bool MozSystem() const override { return mMozSystem; }

  bool SendInProgress() const { return !!mWorkerRef; }

 private:
  XMLHttpRequestWorker(WorkerPrivate* aWorkerPrivate,
                       nsIGlobalObject* aGlobalObject);
  ~XMLHttpRequestWorker();

  enum ReleaseType { Default, XHRIsGoingAway, WorkerIsGoingAway };

  void ReleaseProxy(ReleaseType aType = Default);

  void MaybePin(ErrorResult& aRv);

  void SetResponseToNetworkError();

  void RequestErrorSteps(ErrorResult& aRv,
                         const ErrorProgressEventType& aEventType,
                         nsresult aException = NS_ERROR_DOM_INVALID_STATE_ERR);

  bool FireEvent(EventTarget* aTarget, const EventType& aEventType,
                 bool aUploadTarget, ErrorResult& aRv);

  void Send(JSContext* aCx, JS::Handle<JSObject*> aBody, ErrorResult& aRv);

  void SendInternal(const BodyExtractorBase* aBody, ErrorResult& aRv);

  void ResetResponseData();
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_workers_xmlhttprequest_h__
