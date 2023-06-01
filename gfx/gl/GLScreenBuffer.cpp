/* -*- Mode: c++; c-basic-offset: 2; indent-tabs-mode: nil; tab-width: 4; -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GLScreenBuffer.h"

#include "CompositorTypes.h"
#include "GLContext.h"
#include "gfx2DGlue.h"
#include "MozFramebuffer.h"
#include "SharedSurface.h"

namespace mozilla::gl {

// -
// SwapChainPresenter

// We need to apply pooling on Android because of the AndroidSurface slow
// destructor bugs. They cause a noticeable performance hit. See bug
// #1646073.
static constexpr size_t kPoolSize =
#if defined(MOZ_WIDGET_ANDROID)
    4;
#else
    0;
#endif

UniquePtr<SwapChainPresenter> SwapChain::Acquire(
    const gfx::IntSize& size, const gfx::ColorSpace2 colorSpace) {
  MOZ_ASSERT(mFactory);

  std::shared_ptr<SharedSurface> surf;
  if (!mPool.empty()) {
    // Try reuse
    const auto& existingDesc = mPool.front()->mDesc;
    auto newDesc = existingDesc;
    newDesc.size = size;
    newDesc.colorSpace = colorSpace;
    if (newDesc != existingDesc || !mPool.front()->IsValid()) {
      mPool = {};
    }
  }

  // When mDestroyedCallback exists, recycling of SharedSurfaces is managed by
  // the owner of the SwapChain by calling StoreRecycledSurface().
  const auto poolSize = mDestroyedCallback ? 0 : kPoolSize;

  if (!mPool.empty() && (!poolSize || mPool.size() == poolSize)) {
    surf = mPool.front();
    mPool.pop();
  }
  if (!surf) {
    auto uniquePtrSurf = mFactory->CreateShared(size, colorSpace);
    if (!uniquePtrSurf) return nullptr;
    surf.reset(uniquePtrSurf.release());
  }
  mPool.push(surf);
  while (mPool.size() > poolSize) {
    mPool.pop();
  }

  auto ret = MakeUnique<SwapChainPresenter>(*this);
  const auto old = ret->SwapBackBuffer(surf);
  MOZ_ALWAYS_TRUE(!old);
  return ret;
}

void SwapChain::ClearPool() {
  mPool = {};
  mPrevFrontBuffer = nullptr;
}

void SwapChain::StoreRecycledSurface(
    const std::shared_ptr<SharedSurface>& surf) {
  mPool.push(surf);
}

// -

SwapChainPresenter::SwapChainPresenter(SwapChain& swapChain)
    : mSwapChain(&swapChain) {
  MOZ_RELEASE_ASSERT(mSwapChain->mPresenter == nullptr);
  mSwapChain->mPresenter = this;
}

SwapChainPresenter::~SwapChainPresenter() {
  if (!mSwapChain) return;
  MOZ_RELEASE_ASSERT(mSwapChain->mPresenter == this);
  mSwapChain->mPresenter = nullptr;

  auto newFront = SwapBackBuffer(nullptr);
  if (newFront) {
    mSwapChain->mPrevFrontBuffer = mSwapChain->mFrontBuffer;
    mSwapChain->mFrontBuffer = newFront;
  }
}

std::shared_ptr<SharedSurface> SwapChainPresenter::SwapBackBuffer(
    std::shared_ptr<SharedSurface> back) {
  if (mBackBuffer) {
    mBackBuffer->UnlockProd();
    mBackBuffer->ProducerRelease();
    mBackBuffer->Commit();
  }
  auto old = mBackBuffer;
  mBackBuffer = back;
  if (mBackBuffer) {
    mBackBuffer->WaitForBufferOwnership();
    mBackBuffer->ProducerAcquire();
    mBackBuffer->LockProd();
  }
  return old;
}

GLuint SwapChainPresenter::Fb() const {
  if (!mBackBuffer) return 0;
  const auto& fb = mBackBuffer->mFb;
  if (!fb) return 0;
  return fb->mFB;
}

// -
// SwapChain

SwapChain::SwapChain() = default;

SwapChain::~SwapChain() {
  if (mPresenter) {
    // Out of order destruction, but ok.
    (void)mPresenter->SwapBackBuffer(nullptr);
    mPresenter->mSwapChain = nullptr;
    mPresenter = nullptr;
  }
  if (mDestroyedCallback) {
    mDestroyedCallback();
  }
}

}  // namespace mozilla::gl
