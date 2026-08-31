/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_toolkit_system_windowsproxy_WindowsInternetFunctionsWrapper_h
#define mozilla_toolkit_system_windowsproxy_WindowsInternetFunctionsWrapper_h

#include <windows.h>

#include "mozilla/Atomics.h"
#include "mozilla/Mutex.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/WeakPtr.h"
#include "nsCOMPtr.h"
#include "nsError.h"
#include "nsIObserver.h"
#include "nsISupportsImpl.h"
#include "nsString.h"

namespace mozilla::widget::WinRegistry {
class KeyWatcher;
}

namespace mozilla {
namespace toolkit {
namespace system {

class NetworkLinkObserver;

class WindowsInternetFunctionsWrapper : public mozilla::SupportsWeakPtr {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(WindowsInternetFunctionsWrapper)

  WindowsInternetFunctionsWrapper();

  void Init();
  void Shutdown();
  virtual nsresult ReadInternetOption(uint32_t aOption, uint32_t& aFlags,
                                      nsAString& aValue);
  uint32_t GetCachedFlags() const { return mAtomicFlags; }

 protected:
  virtual ~WindowsInternetFunctionsWrapper();

 private:
  friend class NetworkLinkObserver;

  nsresult ReadAllOptionsLocked(DWORD aConnFlags, const nsString& aConnName)
      MOZ_REQUIRES(mMutex);

  mozilla::Mutex mMutex{"WindowsInternetFunctionsWrapper"};

  // Connection state cache, invalidated by NS_NETWORK_LINK_TOPIC.
  bool mConnCacheValid MOZ_GUARDED_BY(mMutex){false};
  DWORD mCachedConnFlags MOZ_GUARDED_BY(mMutex){0};
  // Empty string means LAN/WiFi; non-empty stores the modem connection name.
  nsString mCachedConnName MOZ_GUARDED_BY(mMutex);

  // Proxy options cache, invalidated by registry key changes.
  bool mCacheValid MOZ_GUARDED_BY(mMutex){false};
  uint32_t mCachedFlags MOZ_GUARDED_BY(mMutex) = 0;
  // Atomic mirror of mCachedFlags, readable from any thread without mMutex.
  // UINT32_MAX means "not yet cached or currently invalidated".
  mozilla::Atomic<uint32_t, mozilla::Relaxed> mAtomicFlags{UINT32_MAX};
  nsString mCachedProxyServer MOZ_GUARDED_BY(mMutex);
  nsString mCachedProxyBypass MOZ_GUARDED_BY(mMutex);
  nsString mCachedAutoConfigUrl MOZ_GUARDED_BY(mMutex);

  mozilla::UniquePtr<mozilla::widget::WinRegistry::KeyWatcher> mKeyWatcher;
  nsCOMPtr<nsIObserver> mNetworkLinkObserver;
};

}  // namespace system
}  // namespace toolkit
}  // namespace mozilla

#endif  // mozilla_toolkit_system_windowsproxy_WindowsInternetFunctionsWrapper_h
