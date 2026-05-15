/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_ipc_EagerIPCStream_h
#define mozilla_ipc_EagerIPCStream_h

#include "mozilla/NotNull.h"
#include "nsCOMPtr.h"
#include "nsIInputStream.h"

namespace mozilla::ipc {

// A NotNull<nsCOMPtr<nsIInputStream>> which sets `aAllowLazy = false` when
// being serialized.
struct EagerIPCStream {
  NotNull<nsCOMPtr<nsIInputStream>> mStream;
};

}  // namespace mozilla::ipc

#endif  // mozilla_ipc_EagerIPCStream_h
