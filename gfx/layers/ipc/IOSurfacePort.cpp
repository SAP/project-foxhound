/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IOSurfacePort.h"

#ifdef XP_DARWIN
#  include <IOSurface/IOSurfaceRef.h>
#  include "CFTypeRefPtr.h"
#endif

namespace mozilla::layers {

#ifdef XP_DARWIN
CFTypeRefPtr<IOSurfaceRef> IOSurfacePort::GetSurface() const {
  // Note that IOSurfaceLookupFromMachPort does *not* consume the port.
  if (IOSurfaceRef s = IOSurfaceLookupFromMachPort(mPort.get())) {
    return CFTypeRefPtr<IOSurfaceRef>::WrapUnderCreateRule(s);
  }
  return {};
}

IOSurfacePort IOSurfacePort::FromSurface(
    const CFTypeRefPtr<IOSurfaceRef>& aSurface) {
  return {UniqueMachSendRight(IOSurfaceCreateMachPort(aSurface.get()))};
}

bool IOSurfacePort::operator==(const IOSurfacePort& aOther) const {
  return mPort.get() == aOther.mPort.get();
}
#endif

}  // namespace mozilla::layers
