/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set sw=2 ts=8 et tw=80 : */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_net_CacheEntryWriteHandleChild_h
#define mozilla_net_CacheEntryWriteHandleChild_h

#include "mozilla/net/PCacheEntryWriteHandleChild.h"
#include "nsICacheInfoChannel.h"

namespace mozilla {
namespace net {

/**
 * CacheEntryWriteHandleChild is a wrapper for nsICacheEntry, for the
 * asynchronous OpenAlternativeOutputStream call.
 */
class CacheEntryWriteHandleChild final : public nsICacheEntryWriteHandle,
                                         public PCacheEntryWriteHandleChild {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSICACHEENTRYWRITEHANDLE
  CacheEntryWriteHandleChild() = default;

  void AddIPDLReference();
  void ReleaseIPDLReference();

 private:
  virtual ~CacheEntryWriteHandleChild() = default;
};

}  // namespace net
}  // namespace mozilla

#endif  // mozilla_net_DocumentChannelChild_h
