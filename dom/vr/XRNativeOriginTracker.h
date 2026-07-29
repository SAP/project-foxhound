/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_XRNativeOriginTracker_h_
#define mozilla_dom_XRNativeOriginTracker_h_

#include "XRNativeOrigin.h"
#include "gfxVR.h"

namespace mozilla::dom {

class XRNativeOriginTracker : public XRNativeOrigin {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(XRNativeOriginTracker, override)
  explicit XRNativeOriginTracker(const gfx::VRPose* aPose);

  gfx::PointDouble3D GetPosition() override;
  gfx::QuaternionDouble GetOrientation() override;

 private:
  ~XRNativeOriginTracker() = default;
  const gfx::VRPose* mPose;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_XRNativeOriginTracker_h_
