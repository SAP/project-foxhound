/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SourceSurfaceD3D11.h"

namespace mozilla {
namespace gfx {

/* static */
RefPtr<SourceSurfaceD3D11> SourceSurfaceD3D11::Create(
    ID3D11Texture2D* aTexture, const uint32_t aArrayIndex,
    const gfx::ColorSpace2 aColorSpace, const gfx::ColorRange aColorRange,
    const Maybe<layers::CompositeProcessFencesHolderId> aFencesHolderId) {
  MOZ_ASSERT(aTexture);

  if (!aTexture) {
    return nullptr;
  }

  CD3D11_TEXTURE2D_DESC desc;
  aTexture->GetDesc(&desc);

  if (desc.Format != DXGI_FORMAT_B8G8R8A8_UNORM &&
      desc.Format != DXGI_FORMAT_NV12 && desc.Format != DXGI_FORMAT_P010 &&
      desc.Format != DXGI_FORMAT_P016) {
    MOZ_ASSERT_UNREACHABLE("unexpected to be called");
    return nullptr;
  }

  return MakeAndAddRef<SourceSurfaceD3D11>(
      SurfaceFormat::B8G8R8A8, IntSize(desc.Width, desc.Height), aTexture,
      aArrayIndex, aColorSpace, aColorRange, aFencesHolderId);
}

SourceSurfaceD3D11::SourceSurfaceD3D11(
    const SurfaceFormat aFormat, const IntSize aSize, ID3D11Texture2D* aTexture,
    const uint32_t aArrayIndex, const gfx::ColorSpace2 aColorSpace,
    const gfx::ColorRange aColorRange,
    const Maybe<layers::CompositeProcessFencesHolderId> aFencesHolderId)
    : mFormat(aFormat),
      mSize(aSize),
      mTexture(aTexture),
      mArrayIndex(aArrayIndex),
      mColorSpace(aColorSpace),
      mColorRange(aColorRange),
      mFencesHolderId(aFencesHolderId) {}

SourceSurfaceD3D11::~SourceSurfaceD3D11() {}

bool SourceSurfaceD3D11::IsValid() const { return true; }

already_AddRefed<DataSourceSurface> SourceSurfaceD3D11::GetDataSurface() {
  RefPtr<DataSourceSurface> src =
      Factory::CreateBGRA8DataSourceSurfaceForD3D11Texture(
          mTexture, mArrayIndex, mColorSpace, mColorRange);
  return src.forget();
}

}  // namespace gfx
}  // namespace mozilla
