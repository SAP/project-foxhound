/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef AndroidSurfaceTexture_h_
#define AndroidSurfaceTexture_h_

#include "mozilla/gfx/Matrix.h"

typedef uint64_t AndroidSurfaceTextureHandle;

#ifdef MOZ_WIDGET_ANDROID

#  include "SurfaceTexture.h"

namespace mozilla {
namespace gl {

class AndroidSurfaceTexture {
 public:
  static void Init();
  static void GetTransformMatrix(
      const java::sdk::SurfaceTexture::Ref& surfaceTexture,
      mozilla::gfx::Matrix4x4* outMatrix);
};

}  // namespace gl
}  // namespace mozilla

#endif  // MOZ_WIDGET_ANDROID

#endif  // AndroidSurfaceTexture_h_
