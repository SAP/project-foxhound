/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_WebTransportEventService_h
#define mozilla_net_WebTransportEventService_h

#include "mozilla/AlreadyAddRefed.h"
#include "nsIWebTransportEventService.h"
#include "nsCOMPtr.h"
#include "nsTArray.h"
#include "nsIObserver.h"
#include "nsISupportsImpl.h"
#include "nsTHashMap.h"
#include "nsClassHashtable.h"
#include "nsHashKeys.h"

namespace mozilla {
namespace net {

class WebTransportEventService final : public nsIWebTransportEventService,
                                       public nsIObserver {
 public:
  NS_DECL_THREADSAFE_ISUPPORTS
  NS_DECL_NSIOBSERVER
  NS_DECL_NSIWEBTRANSPORTEVENTSERVICE

  static already_AddRefed<WebTransportEventService> GetOrCreate();

  using WebTransportEventListeners =
      nsTArray<nsCOMPtr<nsIWebTransportEventListener>>;

  void GetListeners(uint64_t aInnerWindowID,
                    WebTransportEventListeners& aListeners) const;

  void WebTransportSessionCreated(uint64_t aInnerWindowID,
                                  uint64_t aHttpChannelId);

  void WebTransportSessionClosed(uint64_t aInnerWindowID,
                                 uint64_t aHttpChannelId, uint32_t aCode,
                                 const nsAString& aReason);

 private:
  WebTransportEventService();
  ~WebTransportEventService();

  bool HasListeners() const;

  struct WindowListener {
    WebTransportEventListeners mListeners;
  };

  void Shutdown();

  nsClassHashtable<nsUint64HashKey, WindowListener> mWindows;

  uint64_t mCountListeners;
};

}  // namespace net
}  // namespace mozilla

#endif  // mozilla_net_WebTransportEventService_h
