/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_NeckoChild_h
#define mozilla_net_NeckoChild_h

#include "mozilla/net/PNeckoChild.h"
#include "mozilla/net/NeckoCommon.h"

namespace mozilla {
namespace net {

// Header file contents
class NeckoChild : public PNeckoChild {
  friend class PNeckoChild;

 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(NeckoChild, override)

  NeckoChild() = default;

  static void InitNeckoChild();

 protected:
  virtual ~NeckoChild();

  PCacheEntryWriteHandleChild* AllocPCacheEntryWriteHandleChild(
      PHttpChannelChild* channel);
  bool DeallocPCacheEntryWriteHandleChild(PCacheEntryWriteHandleChild* aActor);

  PAltDataOutputStreamChild* AllocPAltDataOutputStreamChild(
      const nsACString& type, const int64_t& predictedSize,
      const mozilla::Maybe<mozilla::NotNull<PHttpChannelChild*>>& channel,
      const mozilla::Maybe<mozilla::NotNull<PCacheEntryWriteHandleChild*>>&
          handle);
  bool DeallocPAltDataOutputStreamChild(PAltDataOutputStreamChild* aActor);

  PCookieServiceChild* AllocPCookieServiceChild();
  bool DeallocPCookieServiceChild(PCookieServiceChild*);
  PWebSocketChild* AllocPWebSocketChild(PBrowserChild*,
                                        const SerializedLoadContext&,
                                        const uint32_t&);
  bool DeallocPWebSocketChild(PWebSocketChild*);
  PTCPSocketChild* AllocPTCPSocketChild(const nsAString& host,
                                        const uint16_t& port);
  bool DeallocPTCPSocketChild(PTCPSocketChild*);
  PTransportProviderChild* AllocPTransportProviderChild();
  bool DeallocPTransportProviderChild(PTransportProviderChild* aActor);
  PWebSocketEventListenerChild* AllocPWebSocketEventListenerChild(
      const uint64_t& aInnerWindowID);
  bool DeallocPWebSocketEventListenerChild(PWebSocketEventListenerChild*);

  mozilla::ipc::IPCResult RecvSpeculativeConnectRequest();
  mozilla::ipc::IPCResult RecvNetworkChangeNotification(nsCString const& type);

  mozilla::ipc::IPCResult RecvSetTRRDomain(const nsCString& domain);
};

/**
 * Reference to the PNecko Child protocol.
 * Null if this is not a content process.
 */
extern PNeckoChild* gNeckoChild;

}  // namespace net
}  // namespace mozilla

#endif  // mozilla_net_NeckoChild_h
