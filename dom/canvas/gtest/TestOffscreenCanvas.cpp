/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "OffscreenCanvasDisplayHelper.h"
#include "gtest/gtest.h"
#include "mozilla/dom/CanvasRenderingContextHelper.h"
#include "mozilla/dom/WorkerRef.h"

namespace mozilla::dom {

// Bug 2004797: Verify UpdateContext preserves ImageContainer.
// Recreating ImageContainer on each call discards existing frames, causing
// flicker when getContext() is called repeatedly.
TEST(OffscreenCanvasDisplayHelper, UpdateContextPreservesImageContainer)
{
  RefPtr<OffscreenCanvasDisplayHelper> helper =
      MakeRefPtr<OffscreenCanvasDisplayHelper>(nullptr, 100, 100);

  // Initially no ImageContainer
  EXPECT_EQ(helper->GetImageContainer(), nullptr);

  // First UpdateContext creates an ImageContainer
  helper->UpdateContext(nullptr, nullptr, CanvasContextType::Canvas2D,
                        Nothing());
  RefPtr<layers::ImageContainer> container1 = helper->GetImageContainer();
  EXPECT_NE(container1, nullptr);

  // Second UpdateContext should preserve the same ImageContainer
  helper->UpdateContext(nullptr, nullptr, CanvasContextType::Canvas2D,
                        Nothing());
  RefPtr<layers::ImageContainer> container2 = helper->GetImageContainer();
  EXPECT_EQ(container1.get(), container2.get());
}

}  // namespace mozilla::dom
