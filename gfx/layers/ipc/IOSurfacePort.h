/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_gfx_IOSurfacePort_h_
#define mozilla_gfx_IOSurfacePort_h_

#include "chrome/common/ipc_message_utils.h"

#ifdef XP_DARWIN
#  include "mozilla/UniquePtrExtensions.h"

template <typename T>
class CFTypeRefPtr;
struct __IOSurface;
typedef __IOSurface* IOSurfaceRef;
#endif

// This header file defines an IOSurface struct.
//
// It is a separate file for the following reasons:
// - Forward-declaring CFTypeRefPtr<IOSurfaceRef> correctly is tricky.
// - IOSurfaceRef.h defines global types like "Point" which can interfere with
// name resolution.
// - Smaller header files allow limiting the scope of the name pollution.

namespace mozilla::layers {

// The IPC descriptor for an IOSurface.
// As long as the port is alive, the IOSurface is automatically marked as "in
// use", including while the port is in IPC transit.
struct IOSurfacePort {
#ifdef XP_DARWIN
  UniqueMachSendRight mPort;

  CFTypeRefPtr<IOSurfaceRef> GetSurface() const;
  static IOSurfacePort FromSurface(const CFTypeRefPtr<IOSurfaceRef>& aSurface);

  bool operator==(const IOSurfacePort& aOther) const;
#endif
};

}  // namespace mozilla::layers

namespace IPC {

template <>
struct ParamTraits<mozilla::layers::IOSurfacePort> {
  using paramType = mozilla::layers::IOSurfacePort;

  static void Write(MessageWriter* writer, paramType&& param) {
#ifdef XP_DARWIN
    WriteParam(writer, std::move(param.mPort));
#endif
  }
  static bool Read(MessageReader* reader, paramType* result) {
#ifdef XP_DARWIN
    return ReadParam(reader, &result->mPort);
#else
    return true;
#endif
  }
};

}  // namespace IPC

#endif /* mozilla_gfx_IOSurfacePort_h_ */
