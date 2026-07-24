/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef TEX_UNPACK_BLOB_H_
#define TEX_UNPACK_BLOB_H_

#include <memory>

#include "GLContextTypes.h"
#include "WebGLStrongTypes.h"
#include "WebGLTypes.h"

namespace mozilla {

class UniqueBuffer;
class WebGLContext;
class WebGLTexture;

namespace dom {
class Element;
class HTMLCanvasElement;
class HTMLVideoElement;
}  // namespace dom

namespace gfx {
class DataSourceSurface;
}  // namespace gfx

namespace layers {
class Image;
class ImageContainer;
class SurfaceDescriptor;
}  // namespace layers

bool IsTarget3D(TexImageTarget target);

namespace webgl {

struct PackingInfo;
struct DriverUnpackInfo;

const char* BlitPreventReason(GLenum target, int32_t level, const ivec3& offset,
                              GLenum internalFormat, const webgl::PackingInfo&,
                              const TexUnpackBlobDesc&,
                              OptionalRenderableFormatBits, bool sameColorSpace,
                              bool allowConversion = false,
                              bool allowSRGB = false, bool allow3D = false);

class TexUnpackBlob {
 public:
  const TexUnpackBlobDesc& mDesc;
  bool mNeedsExactUpload = true;

  static std::unique_ptr<TexUnpackBlob> Create(const TexUnpackBlobDesc&);

 protected:
  explicit TexUnpackBlob(const TexUnpackBlobDesc& desc) : mDesc(desc) {
    MOZ_ASSERT_IF(!IsTarget3D(mDesc.imageTarget), mDesc.size.z == 1);
  }

 public:
  virtual ~TexUnpackBlob() = default;

 protected:
  bool ConvertIfNeeded(const WebGLContext*, const uint32_t rowLength,
                       const uint32_t rowCount, WebGLTexelFormat srcFormat,
                       const uint8_t* const srcBegin, const ptrdiff_t srcStride,
                       WebGLTexelFormat dstFormat, const ptrdiff_t dstStride,

                       const uint8_t** const out_begin,
                       UniqueBuffer* const out_anchoredBuffer) const;

 public:
  virtual bool HasData() const { return true; }

  virtual bool Validate(const WebGLContext*, const webgl::PackingInfo& pi) = 0;

  // Returns false when we've generated a WebGL error.
  // Returns true but with a non-zero *out_error if we still need to generate a
  // WebGL error.
  virtual bool TexOrSubImage(bool isSubImage, bool needsRespec,
                             WebGLTexture* tex, GLint level,
                             const webgl::DriverUnpackInfo* dui, GLint xOffset,
                             GLint yOffset, GLint zOffset,
                             const webgl::PackingInfo& pi,
                             GLenum* const out_error) const = 0;
};

class TexUnpackBytes final : public TexUnpackBlob {
 public:
  explicit TexUnpackBytes(const TexUnpackBlobDesc& desc) : TexUnpackBlob(desc) {
    MOZ_ASSERT(mDesc.srcAlphaType == gfxAlphaType::NonPremult);
  }

  virtual bool HasData() const override {
    return mDesc.pboOffset || mDesc.cpuData;
  }

  virtual bool Validate(const WebGLContext*,
                        const webgl::PackingInfo& pi) override;
  virtual bool TexOrSubImage(bool isSubImage, bool needsRespec,
                             WebGLTexture* tex, GLint level,
                             const webgl::DriverUnpackInfo* dui, GLint xOffset,
                             GLint yOffset, GLint zOffset,
                             const webgl::PackingInfo& pi,
                             GLenum* const out_error) const override;
};

class TexUnpackSurface final : public TexUnpackBlob {
 public:
  explicit TexUnpackSurface(const TexUnpackBlobDesc& desc)
      : TexUnpackBlob(desc) {}
  ~TexUnpackSurface();

  virtual bool Validate(const WebGLContext*,
                        const webgl::PackingInfo& pi) override;
  virtual bool TexOrSubImage(bool isSubImage, bool needsRespec,
                             WebGLTexture* tex, GLint level,
                             const webgl::DriverUnpackInfo* dui, GLint xOffset,
                             GLint yOffset, GLint zOffset,
                             const webgl::PackingInfo& dstPI,
                             GLenum* const out_error) const override;
  bool AllowBlitSd(WebGLContext* const webgl, const GLenum target,
                   const int32_t level, const ivec3& offset,
                   const GLenum internalFormat, const webgl::PackingInfo& pi,
                   bool allowConversion, bool allowSRGB, bool allow3D,
                   bool warn) const;
  bool BlitSd(const layers::SurfaceDescriptor& sd, bool isSubImage,
              bool needsRespec, WebGLTexture* tex, GLint level,
              const webgl::DriverUnpackInfo* dui, GLint xOffset, GLint yOffset,
              GLint zOffset, const webgl::PackingInfo& dstPI,
              GLenum* const out_error, bool allowFallback = false) const;
};

}  // namespace webgl
}  // namespace mozilla

#endif  // TEX_UNPACK_BLOB_H_
