/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_NrIceStunAddrMessageUtils_h
#define mozilla_net_NrIceStunAddrMessageUtils_h

// forward declare NrIceStunAddr for --disable-webrtc builds where
// the header will not be available.
namespace mozilla {
class NrIceStunAddr;
}  // namespace mozilla

#include "ipc/IPCMessageUtils.h"
#ifdef MOZ_WEBRTC
#  include "transport/nricestunaddr.h"
#endif

namespace IPC {

#ifdef MOZ_WEBRTC
DECLARE_IPC_SERIALIZER(mozilla::NrIceStunAddr);
#else
template <>
struct ParamTraits<mozilla::NrIceStunAddr> {
  typedef mozilla::NrIceStunAddr paramType;

  static void Write(MessageWriter* aWriter,
                    const mozilla::NrIceStunAddr& aParam) {}
  static bool Read(MessageReader* aReader, mozilla::NrIceStunAddr* aResult) {
    return false;
  }
};
#endif

}  // namespace IPC

#endif  // mozilla_net_NrIceStunAddrMessageUtils_h
