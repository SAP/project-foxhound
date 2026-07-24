/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_GFX_HELPERSWIN_H_
#define MOZILLA_GFX_HELPERSWIN_H_

#include <dxgiformat.h>
#include "2D.h"

namespace mozilla {
namespace gfx {

static inline DXGI_FORMAT DXGIFormat(SurfaceFormat aFormat) {
  switch (aFormat) {
    case SurfaceFormat::B8G8R8A8:
      return DXGI_FORMAT_B8G8R8A8_UNORM;
    case SurfaceFormat::B8G8R8X8:
      return DXGI_FORMAT_B8G8R8A8_UNORM;
    case SurfaceFormat::A8:
      return DXGI_FORMAT_A8_UNORM;
    default:
      return DXGI_FORMAT_UNKNOWN;
  }
}

static inline SurfaceFormat ToPixelFormat(const DXGI_FORMAT& aFormat) {
  switch (aFormat) {
    case DXGI_FORMAT_A8_UNORM:
    case DXGI_FORMAT_R8_UNORM:
      return SurfaceFormat::A8;
    default:
      return SurfaceFormat::B8G8R8A8;
  }
}

}  // namespace gfx
}  // namespace mozilla

#endif /* MOZILLA_GFX_HELPERSWIN_H_ */
