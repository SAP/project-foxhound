/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_ipc_nsIIPCSerializableURI_h
#define mozilla_ipc_nsIIPCSerializableURI_h

#include "nsISupports.h"

namespace mozilla {
namespace ipc {
class URIParams;
}  // namespace ipc
}  // namespace mozilla

#define NS_IIPCSERIALIZABLEURI_IID \
  {0xc1b67333, 0x8462, 0x4540, {0x93, 0x97, 0x34, 0x57, 0x3c, 0x3c, 0x35, 0x80}}

class NS_NO_VTABLE nsIIPCSerializableURI : public nsISupports {
 public:
  NS_INLINE_DECL_STATIC_IID(NS_IIPCSERIALIZABLEURI_IID)

  virtual void Serialize(mozilla::ipc::URIParams& aParams) = 0;
};

#define NS_DECL_NSIIPCSERIALIZABLEURI \
  virtual void Serialize(mozilla::ipc::URIParams& aParams) override;

#define NS_FORWARD_NSIIPCSERIALIZABLEURI(_to)                         \
  virtual void Serialize(mozilla::ipc::URIParams& aParams) override { \
    _to Serialize(aParams);                                           \
  }

#endif  // mozilla_ipc_nsIIPCSerializableURI_h
