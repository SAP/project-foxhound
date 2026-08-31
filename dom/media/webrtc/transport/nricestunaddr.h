/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nricestunaddr_h_
#define nricestunaddr_h_

#include <array>
#include <cstdint>

#include "mozilla/Variant.h"
#include "nsString.h"

typedef struct nr_local_addr_ nr_local_addr;
typedef struct nr_transport_addr_ nr_transport_addr;

namespace IPC {
template <typename P>
struct ParamTraits;
}

namespace mozilla {

class NrIceStunAddr {
 public:
  // Default constructor used for deserialization
  NrIceStunAddr() = default;
  explicit NrIceStunAddr(const nr_local_addr* addr);
  NrIceStunAddr(const NrIceStunAddr& rhs);

  ~NrIceStunAddr();

  void toNrLocalAddr(nr_local_addr& addr) const;

  friend struct IPC::ParamTraits<NrIceStunAddr>;

 private:
  struct IPv4 {
    uint32_t address;
    uint16_t port;
  };
  friend struct IPC::ParamTraits<IPv4>;

  struct IPv6 {
    std::array<uint8_t, 16> address;
    uint16_t port;
    uint32_t flowinfo;
    uint32_t scope_id;
  };
  friend struct IPC::ParamTraits<IPv6>;

  enum class Protocol { None, TCP, UDP };
  friend struct IPC::ParamTraits<Protocol>;

  enum class InterfaceType : int {
    None = 0,
    Wired = 1 << 0,
    Wifi = 1 << 1,
    Mobile = 1 << 2,
    VPN = 1 << 3,
    Teredo = 1 << 4,
    ALL_BITS = (1 << 5) - 1,
  };
  friend struct IPC::ParamTraits<InterfaceType>;

  // nr_local_addr.addr (nr_transport_addr) fields
  Protocol protocol_ = Protocol::None;
  mozilla::Variant<IPv4, IPv6> address_ = AsVariant(IPv4{0, 0});
  nsCString ifname_;
  // `as_string` is rebuilt in `toNrLocalAddr`
  nsCString fqdn_;
  bool is_proxied_ = false;
  bool tls_ = false;

  static Protocol protocolFromNrTransportAddr(const nr_transport_addr& addr);
  static decltype(address_) addressFromNrTransportAddr(
      const nr_transport_addr& addr);

  // nr_local_addr.interface (nr_interface) fields
  InterfaceType interface_type_ = InterfaceType::None;
  int estimated_speed_ = 0;

  // nr_local_addr.flags
  bool temporary_ = false;  // NR_ADDR_FLAG_TEMPORARY
};

}  // namespace mozilla

#endif  // nricestunaddr_h_
