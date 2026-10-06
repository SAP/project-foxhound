/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef include_dom_media_ipc_RemoteMediaDataEncoderChild_h
#define include_dom_media_ipc_RemoteMediaDataEncoderChild_h

#include "mozilla/PRemoteEncoderChild.h"
#include "mozilla/ShmemRecycleAllocator.h"

namespace mozilla {

class RemoteMediaDataEncoderChild final
    : public ShmemRecycleAllocator<RemoteMediaDataEncoderChild>,
      public PRemoteEncoderChild {
  friend class PRemoteEncoderChild;

 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(RemoteMediaDataEncoderChild, final);

  RemoteMediaDataEncoderChild();
  void ActorDestroy(ActorDestroyReason aWhy) override;
  bool HasRemoteCrashed() const { return mRemoteCrashed; }

 private:
  virtual ~RemoteMediaDataEncoderChild();

  bool mRemoteCrashed = false;
};

}  // namespace mozilla

#endif  // include_dom_media_ipc_RemoteMediaDataEncoderChild_h
