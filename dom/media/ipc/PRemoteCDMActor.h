/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef include_dom_media_ipc_PRemoteCDMActor_h
#define include_dom_media_ipc_PRemoteCDMActor_h

#include "nsISupportsImpl.h"

namespace mozilla {

class PRemoteCDMChild;
class PRemoteCDMParent;
enum class RemoteMediaIn;

class PRemoteCDMActor {
 public:
  NS_INLINE_DECL_PURE_VIRTUAL_REFCOUNTING

  virtual PRemoteCDMChild* AsPRemoteCDMChild() { return nullptr; }

  virtual PRemoteCDMParent* AsPRemoteCDMParent() { return nullptr; }

  virtual RemoteMediaIn GetLocation() const = 0;
};

}  // namespace mozilla

#endif  // include_dom_media_ipc_PRemoteCDMActor_h
