/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef SharedLcpMarkerState_h_
#define SharedLcpMarkerState_h_

#include "mozilla/BaseProfilerMarkersPrerequisites.h"
#include "mozilla/DataMutex.h"
#include "mozilla/TimeStamp.h"
#include "nsString.h"

class SharedLcpMarkerState {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(SharedLcpMarkerState)

  void MaybeAddLCPProfilerMarker(mozilla::MarkerInnerWindowId aInnerWindowID);

  struct Inner {
    mozilla::TimeStamp mNavStartTime;
    mozilla::TimeStamp mLargestContentfulRender;
    nsString mLCPElement;
    nsCString mLCPImageURL;
  };

  mozilla::DataMutex<Inner> mInner{"SharedLcpMarkerState"};

 private:
  Inner CopyInner() {
    auto lock = mInner.Lock();
    return *lock;
  }

  ~SharedLcpMarkerState() = default;
};

#endif  // SharedLcpMarkerState_h_
