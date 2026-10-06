/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef WEBRTC_IPC_TRAITS_H_
#define WEBRTC_IPC_TRAITS_H_

#include <vector>

#include "ipc/EnumSerializer.h"
#include "ipc/IPCMessageUtils.h"
#include "ipc/IPCMessageUtilsSpecializations.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/BindingIPCUtils.h"
#include "mozilla/dom/CandidateInfo.h"
#include "mozilla/dom/RTCConfigurationBinding.h"
#include "mozilla/dom/RTCIceTransportBinding.h"
#include "mozilla/media/webrtc/WebrtcGlobal.h"
#include "transport/dtlsidentity.h"
#include "transport/transportlayer.h"

namespace mozilla {
typedef std::vector<std::string> StringVector;
using TransportLayerState = TransportLayer::State;
}  // namespace mozilla

namespace IPC {

template <>
struct ParamTraits<mozilla::dom::OwningStringOrStringSequence> {
  typedef mozilla::dom::OwningStringOrStringSequence paramType;

  // Ugh. OwningStringOrStringSequence already has this enum, but it is
  // private generated code. So we have to re-create it.
  enum Type { kUninitialized, kString, kStringSequence };

  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    if (aParam.IsString()) {
      aWriter->WriteInt16(kString);
      WriteParam(aWriter, aParam.GetAsString());
    } else if (aParam.IsStringSequence()) {
      aWriter->WriteInt16(kStringSequence);
      WriteParam(aWriter, aParam.GetAsStringSequence());
    } else {
      aWriter->WriteInt16(kUninitialized);
    }
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    int16_t type;
    if (!aReader->ReadInt16(&type)) {
      return false;
    }

    switch (type) {
      case kUninitialized:
        aResult->Uninit();
        return true;
      case kString:
        return ReadParam(aReader, &aResult->SetAsString());
      case kStringSequence:
        return ReadParam(aReader, &aResult->SetAsStringSequence());
    }

    return false;
  }
};

template <>
struct ParamTraits<mozilla::TransportLayer::State>
    : public ContiguousEnumSerializerInclusive<
          mozilla::TransportLayer::State, mozilla::TransportLayer::TS_NONE,
          mozilla::TransportLayer::TS_ERROR> {};

template <>
struct ParamTraits<SSLKEAType>
    : public ContiguousEnumSerializer<SSLKEAType, ssl_kea_null, ssl_kea_size> {
};

template <>
struct ParamTraits<mozilla::dom::RTCIceCredentialType>
    : public mozilla::dom::WebIDLEnumSerializer<
          mozilla::dom::RTCIceCredentialType> {};

template <>
struct ParamTraits<mozilla::dom::RTCIceTransportPolicy>
    : public mozilla::dom::WebIDLEnumSerializer<
          mozilla::dom::RTCIceTransportPolicy> {};

template <>
struct ParamTraits<mozilla::dom::RTCIceGathererState>
    : public mozilla::dom::WebIDLEnumSerializer<
          mozilla::dom::RTCIceGathererState> {};

template <>
struct ParamTraits<mozilla::dom::RTCIceTransportState>
    : public mozilla::dom::WebIDLEnumSerializer<
          mozilla::dom::RTCIceTransportState> {};

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::dom::RTCIceServer, mCredential,
                                  mCredentialType, mUrl, mUrls, mUsername)

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::CandidateInfo, mCandidate, mUfrag,
                                  mDefaultHostRtp, mDefaultPortRtp,
                                  mDefaultHostRtcp, mDefaultPortRtcp,
                                  mMDNSAddress, mActualAddress)

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::IceCandidateErrorInfo, mAddress,
                                  mPort, mUrl, mErrorCode, mErrorText)

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::DtlsDigest, algorithm_, value_)

}  // namespace IPC

#endif  // WEBRTC_IPC_TRAITS_H_
