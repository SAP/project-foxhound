/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef RTCError_h_
#define RTCError_h_

#include "mozilla/dom/DOMException.h"
#include "mozilla/dom/Nullable.h"
#include "mozilla/dom/RTCErrorBinding.h"

namespace mozilla::dom {

class RTCError final : public DOMException {
 public:
  RTCError(const RTCErrorInit& aInit, const nsACString& aMessage);

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  static already_AddRefed<RTCError> Constructor(const GlobalObject& aGlobal,
                                                const RTCErrorInit& aInit,
                                                const nsACString& aMessage);

  RTCErrorDetailType ErrorDetail() const { return mErrorDetail; }
  Nullable<int32_t> GetSdpLineNumber() const { return mSdpLineNumber; }
  Nullable<int32_t> GetSctpCauseCode() const { return mSctpCauseCode; }
  Nullable<uint32_t> GetReceivedAlert() const { return mReceivedAlert; }
  Nullable<uint32_t> GetSentAlert() const { return mSentAlert; }

 private:
  virtual ~RTCError() = default;

  RTCErrorDetailType mErrorDetail;
  Nullable<int32_t> mSdpLineNumber;
  Nullable<int32_t> mSctpCauseCode;
  Nullable<uint32_t> mReceivedAlert;
  Nullable<uint32_t> mSentAlert;
};

}  // namespace mozilla::dom

#endif  // RTCError_h_
