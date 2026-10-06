/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "RTCError.h"

#include "mozilla/dom/RTCErrorBinding.h"

namespace mozilla::dom {

RTCError::RTCError(const RTCErrorInit& aInit, const nsACString& aMessage)
    : DOMException(NS_ERROR_DOM_OPERATION_ERR, aMessage, "OperationError"_ns,
                   0),
      mErrorDetail(aInit.mErrorDetail) {
  if (aInit.mSdpLineNumber.WasPassed()) {
    mSdpLineNumber.SetValue(aInit.mSdpLineNumber.Value());
  }
  if (aInit.mSctpCauseCode.WasPassed()) {
    mSctpCauseCode.SetValue(aInit.mSctpCauseCode.Value());
  }
  if (aInit.mReceivedAlert.WasPassed()) {
    mReceivedAlert.SetValue(aInit.mReceivedAlert.Value());
  }
  if (aInit.mSentAlert.WasPassed()) {
    mSentAlert.SetValue(aInit.mSentAlert.Value());
  }
}

JSObject* RTCError::WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) {
  return RTCError_Binding::Wrap(aCx, this, aGivenProto);
}

/* static */
already_AddRefed<RTCError> RTCError::Constructor(const GlobalObject& aGlobal,
                                                 const RTCErrorInit& aInit,
                                                 const nsACString& aMessage) {
  return MakeAndAddRef<RTCError>(aInit, aMessage);
}

}  // namespace mozilla::dom
