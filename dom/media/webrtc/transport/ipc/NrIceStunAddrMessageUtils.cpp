/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifdef MOZ_WEBRTC

#  include "NrIceStunAddrMessageUtils.h"

#  include "ipc/IPCMessageUtilsSpecializations.h"
#  include "local_addr.h"

namespace IPC {

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::NrIceStunAddr::IPv4, address, port);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::NrIceStunAddr::IPv6, address, port,
                                  flowinfo, scope_id);

template <>
struct ParamTraits<mozilla::NrIceStunAddr::Protocol>
    : public ContiguousEnumSerializerInclusive<
          mozilla::NrIceStunAddr::Protocol,
          mozilla::NrIceStunAddr::Protocol::None,
          mozilla::NrIceStunAddr::Protocol::UDP> {};

template <>
struct ParamTraits<mozilla::NrIceStunAddr::InterfaceType>
    : public BitFlagsEnumSerializer<
          mozilla::NrIceStunAddr::InterfaceType,
          mozilla::NrIceStunAddr::InterfaceType::ALL_BITS> {};

IMPLEMENT_IPC_SERIALIZER_WITH_FIELDS(mozilla::NrIceStunAddr, protocol_,
                                     address_, ifname_, fqdn_, is_proxied_,
                                     tls_, interface_type_, estimated_speed_,
                                     temporary_);

}  // namespace IPC

#endif
