/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_GFX_SourceSurfaceD3D11_H_
#define MOZILLA_GFX_SourceSurfaceD3D11_H_

#include <d3d11.h>

#include "mozilla/gfx/2D.h"
#include "mozilla/layers/LayersTypes.h"

namespace mozilla {
namespace gfx {

class SourceSurfaceD3D11 : public SourceSurface {
 public:
  MOZ_DECLARE_REFCOUNTED_VIRTUAL_TYPENAME(SourceSurfaceD3D11, override)

  static RefPtr<SourceSurfaceD3D11> Create(
      ID3D11Texture2D* aTexture, const uint32_t aArrayIndex,
      const gfx::ColorSpace2 aColorSpace, const gfx::ColorRange aColorRange,
      const Maybe<layers::CompositeProcessFencesHolderId> aFencesHolderId);

  SourceSurfaceD3D11(
      const SurfaceFormat aFormat, const IntSize aSize,
      ID3D11Texture2D* aTexture, const uint32_t aArrayIndex,
      const gfx::ColorSpace2 aColorSpace, const gfx::ColorRange aColorRange,
      const Maybe<layers::CompositeProcessFencesHolderId> aFencesHolderId);
  ~SourceSurfaceD3D11();

  SurfaceType GetType() const override { return SurfaceType::D3D11_TEXTURE; }
  IntSize GetSize() const override { return mSize; }
  SurfaceFormat GetFormat() const override { return mFormat; }
  bool IsValid() const override;
  already_AddRefed<DataSourceSurface> GetDataSurface() override;

  ID3D11Texture2D* GetD3D11Texture() { return mTexture; }

  const SurfaceFormat mFormat;
  const IntSize mSize;
  const RefPtr<ID3D11Texture2D> mTexture;
  const uint32_t mArrayIndex;
  const ColorSpace2 mColorSpace;
  const ColorRange mColorRange;
  const Maybe<layers::CompositeProcessFencesHolderId> mFencesHolderId;
};

}  // namespace gfx
}  // namespace mozilla

#endif /* MOZILLA_GFX_SourceSurfaceD3D11_H_ */
