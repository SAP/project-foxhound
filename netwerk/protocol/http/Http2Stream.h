/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_Http2Stream_h
#define mozilla_net_Http2Stream_h

#include "Http2StreamBase.h"

namespace mozilla::net {

class Http2Stream : public Http2StreamBase {
 public:
  NS_INLINE_DECL_REFCOUNTING_INHERITED(Http2Stream, Http2StreamBase)

  Http2Stream(nsAHttpTransaction* httpTransaction, Http2Session* session,
              int32_t priority, uint64_t bcId);

  void CloseStream(nsresult reason) override;
  Http2Stream* GetHttp2Stream() override { return this; }
  uint32_t GetWireStreamId() override;

  nsresult OnWriteSegment(char* buf, uint32_t count,
                          uint32_t* countWritten) override;

  nsAHttpTransaction* Transaction() override { return mTransaction; }
  nsIRequestContext* RequestContext() override {
    return mTransaction ? mTransaction->RequestContext() : nullptr;
  }
  // Replace the stream's backing transaction. Used by the HE / 0-RTT
  // flow when a HappyEyeballsTransaction shim is adopted by the real
  // nsHttpTransaction. The caller is responsible for keeping the hash
  // key consistent (see Http2Session::SwapTransaction); otherwise the
  // invariant in the field's comment below holds.
  void SetTransaction(nsAHttpTransaction* aTrans) { mTransaction = aTrans; }

 protected:
  ~Http2Stream();
  nsresult CallToReadData(uint32_t count, uint32_t* countRead) override;
  nsresult CallToWriteData(uint32_t count, uint32_t* countWritten) override;
  nsresult GenerateHeaders(nsCString& aCompressedData,
                           uint8_t& firstFrameFlags) override;

 private:
  // The underlying HTTP transaction. This pointer is used as the key
  // in the Http2Session mStreamTransactionHash so it is important to
  // keep a reference to it as long as this stream is a member of that hash.
  // (i.e. don't change it or release it after it is set in the ctor,
  // except atomically with updating the hash — see
  // Http2Session::SwapTransaction.)
  RefPtr<nsAHttpTransaction> mTransaction;
};

}  // namespace mozilla::net

#endif  // mozilla_net_Http2Stream_h
