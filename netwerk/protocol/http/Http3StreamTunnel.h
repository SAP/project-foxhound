/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_Http3StreamTunnel_h
#define mozilla_net_Http3StreamTunnel_h

#include "Http3Stream.h"
#include "nsHttpConnection.h"
#include "SimpleBuffer.h"

namespace mozilla::net {

class Http3StreamTunnel;

class Http3TransportLayer final : public nsISocketTransport,
                                  public nsIInputStreamCallback,
                                  public nsIOutputStreamCallback {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSITRANSPORT
  NS_DECL_NSISOCKETTRANSPORT
  NS_DECL_NSIINPUTSTREAMCALLBACK
  NS_DECL_NSIOUTPUTSTREAMCALLBACK

  explicit Http3TransportLayer(Http3StreamTunnel* aStream);

  already_AddRefed<Http3StreamTunnel> GetStream();
  nsresult Condition() const { return mCondition; }
  nsIAsyncInputStream* GetInput();
  nsIAsyncOutputStream* GetOutput();
  nsresult CallToReadData();
  nsresult CallToWriteData();
  void OnStreamClosed(nsresult aReason);

 private:
  class InputStreamTunnel : public nsIAsyncInputStream {
   public:
    NS_DECL_THREADSAFE_ISUPPORTS
    NS_DECL_NSIINPUTSTREAM
    NS_DECL_NSIASYNCINPUTSTREAM

    explicit InputStreamTunnel(Http3TransportLayer* aTransport);

    nsresult OnSocketReady(nsresult condition);
    bool HasCallback() { return !!mCallback; }

   private:
    friend class Http3TransportLayer;
    virtual ~InputStreamTunnel() = default;

    // The lifetime of InputStreamTunnel and OutputStreamTunnel are bound to
    // Http3TransportLayer, so using |mTransport| as a raw pointer should be
    // safe.
    Http3TransportLayer* MOZ_OWNING_REF mTransport;
    nsCOMPtr<nsIInputStreamCallback> mCallback;
    nsresult mCondition{NS_OK};
  };
  class OutputStreamTunnel : public nsIAsyncOutputStream {
   public:
    NS_DECL_THREADSAFE_ISUPPORTS
    NS_DECL_NSIOUTPUTSTREAM
    NS_DECL_NSIASYNCOUTPUTSTREAM

    explicit OutputStreamTunnel(Http3TransportLayer* aTransport);

    nsresult OnSocketReady(nsresult condition);

   private:
    friend class Http3TransportLayer;
    virtual ~OutputStreamTunnel() = default;

    Http3TransportLayer* MOZ_OWNING_REF mTransport;
    nsCOMPtr<nsIOutputStreamCallback> mCallback;
    nsresult mCondition{NS_OK};
  };
  virtual ~Http3TransportLayer();

  RefPtr<Http3StreamTunnel> mStream;
  InputStreamTunnel mInput;
  OutputStreamTunnel mOutput;
  nsresult mCondition{NS_OK};
};

class Http3StreamTunnel final : public Http3Stream {
 public:
  explicit Http3StreamTunnel(nsAHttpTransaction* aTrans, Http3Session* aSession,
                             uint64_t aCurrentBrowserId);

  Http3WebTransportSession* GetHttp3WebTransportSession() override {
    return nullptr;
  }
  Http3WebTransportStream* GetHttp3WebTransportStream() override {
    return nullptr;
  }
  Http3Stream* GetHttp3Stream() override { return this; }
  Http3ConnectUDPStream* GetHttp3ConnectUDPStream() override { return nullptr; }
  Http3StreamTunnel* GetHttp3StreamTunnel() override { return this; }

  nsresult TryActivating() override;

  void Close(nsresult aResult) override;

  already_AddRefed<nsHttpConnection> CreateHttpConnection(
      nsIInterfaceRequestor* aCallbacks, PRIntervalTime aRtt,
      bool aIsExtendedCONNECT);

  void CleanupStream(nsresult aReason);

  void HasDataToWrite();
  void HasDataToRead();

  [[nodiscard]] nsresult ReadSegments() override;
  [[nodiscard]] nsresult WriteSegments() override;

  [[nodiscard]] nsresult OnWriteSegment(char* buf, uint32_t count,
                                        uint32_t* countWritten) override;

 private:
  virtual ~Http3StreamTunnel();
  nsresult BufferInput();

  RefPtr<Http3TransportLayer> mTransport;
  SimpleBuffer mSimpleBuffer;
};

}  // namespace mozilla::net

#endif  // mozilla_net_Http3StreamTunnel_h
