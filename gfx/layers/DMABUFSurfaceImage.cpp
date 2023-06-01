/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "DMABUFSurfaceImage.h"
#include "mozilla/widget/DMABufSurface.h"
#include "mozilla/layers/CompositableClient.h"
#include "mozilla/layers/CompositableForwarder.h"
#include "mozilla/layers/DMABUFTextureClientOGL.h"
#include "mozilla/layers/TextureForwarder.h"
#include "mozilla/ScopeExit.h"
#include "mozilla/StaticMutex.h"
#include "GLContext.h"
#include "GLContextProvider.h"
#include "GLBlitHelper.h"
#include "GLReadTexImageHelper.h"
#include "GLContextTypes.h"  // for GLContext, etc
#include "GLContextEGL.h"
#include "GLContextProvider.h"
#include "ScopedGLHelpers.h"

using namespace mozilla;
using namespace mozilla::layers;
using namespace mozilla::gfx;
using namespace mozilla::gl;

DMABUFSurfaceImage::DMABUFSurfaceImage(DMABufSurface* aSurface)
    : Image(nullptr, ImageFormat::DMABUF), mSurface(aSurface) {
  MOZ_DIAGNOSTIC_ASSERT(mSurface->IsGlobalRefSet(),
                        "DMABufSurface must be marked as used!");
}

DMABUFSurfaceImage::~DMABUFSurfaceImage() {
  // Unref as we're done with this surface.
  mSurface->GlobalRefRelease();
}

already_AddRefed<gfx::SourceSurface> DMABUFSurfaceImage::GetAsSourceSurface() {
  return mSurface->GetAsSourceSurface();
}

TextureClient* DMABUFSurfaceImage::GetTextureClient(
    KnowsCompositor* aKnowsCompositor) {
  if (!mTextureClient) {
    BackendType backend = BackendType::NONE;
    mTextureClient = TextureClient::CreateWithData(
        DMABUFTextureData::Create(mSurface, backend), TextureFlags::DEFAULT,
        aKnowsCompositor->GetTextureForwarder());
  }
  return mTextureClient;
}

gfx::IntSize DMABUFSurfaceImage::GetSize() const {
  return gfx::IntSize::Truncate(mSurface->GetWidth(), mSurface->GetHeight());
}
