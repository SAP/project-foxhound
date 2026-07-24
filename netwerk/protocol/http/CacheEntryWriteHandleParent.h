/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set sw=2 ts=8 et tw=80 : */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_CacheEntryWriteHandleParent_h
#define mozilla_net_CacheEntryWriteHandleParent_h

#include "mozilla/net/PCacheEntryWriteHandleParent.h"
#include "nsCOMPtr.h"
#include "nsICacheEntry.h"
#include "nsICacheInfoChannel.h"

namespace mozilla {
namespace net {

/**
 * CacheEntryWriteHandleParent is a wrapper for nsICacheEntry, for the
 * asynchronous OpenAlternativeOutputStream call.
 */
class CacheEntryWriteHandleParent final : public nsICacheEntryWriteHandle,
                                          public PCacheEntryWriteHandleParent {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSICACHEENTRYWRITEHANDLE
  explicit CacheEntryWriteHandleParent(nsICacheEntry* aCacheEntry);

 private:
  virtual ~CacheEntryWriteHandleParent() = default;

  nsCOMPtr<nsICacheEntry> mCacheEntry;
};

}  // namespace net
}  // namespace mozilla

#endif  // mozilla_net_DocumentChannelChild_h
