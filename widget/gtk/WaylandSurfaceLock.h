/* -*- Mode: C; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:expandtab:shiftwidth=2:tabstop=2:
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZ_WAYLAND_SURFACE_LOCK_H_
#define MOZ_WAYLAND_SURFACE_LOCK_H_

#include "mozilla/RefPtr.h"

struct wl_surface;
struct _MozContainer;
typedef struct _MozContainer MozContainer;

namespace mozilla::widget {

class WaylandSurface;

// WaylandSurfaceLock is used to change and commit to wl_surface in atomic way
// and prevents failures if explicit sync is used (Bug 1898476).
// Also it's used as an argument if we need to make sure WaylandSurface is
// locked.
class WaylandSurfaceLock final {
 public:
  explicit WaylandSurfaceLock(RefPtr<WaylandSurface> aWaylandSurface,
                              bool aSkipCommit = false);
  ~WaylandSurfaceLock();

  WaylandSurface* GetWaylandSurface() const;
  void RequestForceCommit() {
#ifdef MOZ_WAYLAND
    mForceCommit = true;
#endif
  }

#ifdef MOZ_WAYLAND
  void Commit();
#endif

 private:
#ifdef MOZ_WAYLAND
  RefPtr<WaylandSurface> mWaylandSurface;
  wl_surface* mSurface = nullptr;
  bool mForceCommit = false;
  bool mSkipCommit = false;
#endif
};

}  // namespace mozilla::widget

#endif /* MOZ_WAYLAND_SURFACE_LOCK_H_ */
