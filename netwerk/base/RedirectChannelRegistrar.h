/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef RedirectChannelRegistrar_h_
#define RedirectChannelRegistrar_h_

#include "nsIRedirectChannelRegistrar.h"

#include "nsIChannel.h"
#include "nsIParentChannel.h"
#include "nsInterfaceHashtable.h"
#include "nsTHashMap.h"
#include "mozilla/Mutex.h"

namespace mozilla {
namespace net {

class RedirectChannelRegistrar final : public nsIRedirectChannelRegistrar {
  NS_DECL_ISUPPORTS
  NS_DECL_NSIREDIRECTCHANNELREGISTRAR

  RedirectChannelRegistrar();

 private:
  ~RedirectChannelRegistrar() = default;

 public:
  // Singleton accessor
  static already_AddRefed<nsIRedirectChannelRegistrar> GetOrCreate();

 protected:
  using ChannelHashtable = nsInterfaceHashtable<nsUint64HashKey, nsIChannel>;
  using ParentChannelHashtable =
      nsInterfaceHashtable<nsUint64HashKey, nsIParentChannel>;

  ChannelHashtable mRealChannels MOZ_GUARDED_BY(mLock);
  ParentChannelHashtable mParentChannels MOZ_GUARDED_BY(mLock);

  // Maps a registered channel id to the ContentParentId (as a raw uint64_t,
  // 0 for the parent process) of the process the redirect is destined for.
  // linkChannels refuses to pair a real channel with a parent actor coming
  // from any other process.
  nsTHashMap<nsUint64HashKey, uint64_t> mChannelOwners MOZ_GUARDED_BY(mLock);

  Mutex mLock;

  static StaticRefPtr<RedirectChannelRegistrar> gSingleton;
};

}  // namespace net
}  // namespace mozilla

#endif
