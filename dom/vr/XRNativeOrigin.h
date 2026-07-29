/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_XRNativeOrigin_h_
#define mozilla_dom_XRNativeOrigin_h_

#include "gfxVR.h"

namespace mozilla::dom {

class XRNativeOrigin {
 public:
  NS_INLINE_DECL_PURE_VIRTUAL_REFCOUNTING
  XRNativeOrigin() = default;

  virtual gfx::PointDouble3D GetPosition() = 0;
  virtual gfx::QuaternionDouble GetOrientation() {
    static const gfx::QuaternionDouble orientation;
    return orientation;
  }

 protected:
  virtual ~XRNativeOrigin() = default;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_XRNativeOrigin_h_
