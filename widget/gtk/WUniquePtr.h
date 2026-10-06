/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef WUniquePtr_h_
#define WUniquePtr_h_

// Provides WUniquePtr to wayland classes.

#include "mozilla/UniquePtr.h"
#include "nsWaylandDisplay.h"

namespace mozilla {

struct WFreeDeleter {
  constexpr WFreeDeleter() = default;
  void operator()(wl_data_device* aPtr) const { wl_data_device_destroy(aPtr); }
  void operator()(zwp_primary_selection_device_v1* aPtr) const {
    zwp_primary_selection_device_v1_destroy(aPtr);
  }
  void operator()(gtk_primary_selection_device* aPtr) const {
    gtk_primary_selection_device_destroy(aPtr);
  }
};

template <typename T>
using WUniquePtr = UniquePtr<T, WFreeDeleter>;

}  // namespace mozilla

#endif
