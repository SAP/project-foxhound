/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"

#include "FrameMetrics.h"
#include "mozilla/ScrollPositionUpdate.h"

using namespace mozilla;
using namespace mozilla::layers;

TEST(FrameMetricsTest, UpdatePendingScrollInfoKeepsVisualAndLayoutInSync)
{
  // The main thread clamps the scroll position in app units before sending it
  // as a ScrollPositionUpdate: 42576 - 18000 = 24576 app units, which converts
  // to 409.6 CSS pixels == 0x43cccccd. UpdatePendingScrollInfo sets the layout
  // scroll offset to that raw destination, but clamps the visual scroll offset
  // against CalculateScrollRange(), which subtracts *after* converting to CSS
  // pixels: FromAppUnits(42576) - FromAppUnits(18000) lands on 0x43cccccc (one
  // ULP lower, because 709.6 sits on the coarser 2^-14 grid of the [512, 1024)
  // binade). The destination is therefore one ULP above the CSS-space maximum
  // and gets clamped down. For non-root content the visual and layout offsets
  // must remain equal, so UpdatePendingScrollInfo adjusts the layout offset
  // so the invariant that the layout viewport encloses the visual viewport
  // continues to hold.
  FrameMetrics metrics;
  // mIsRootContent defaults to false, so the visual/layout relative offset must
  // remain zero.
  ASSERT_FALSE(metrics.IsRootContent());
  metrics.SetZoom(CSSToParentLayerScale(1.0f));
  metrics.SetScrollableRect(CSSRect(0, 0, 1000, CSSPixel::FromAppUnits(42576)));
  metrics.SetCompositionBounds(
      ParentLayerRect(0, 0, 1000, CSSPixel::FromAppUnits(18000)));

  ScrollPositionUpdate update =
      ScrollPositionUpdate::NewScroll(ScrollOrigin::Other, nsPoint(0, 24576));

  metrics.UpdatePendingScrollInfo(update);

  // The visual and layout offsets must stay equal for non-root content.
  EXPECT_EQ(metrics.GetVisualScrollOffset(), metrics.GetLayoutScrollOffset());

  // A second update reads back the offsets to compute the relative offset; with
  // the offsets kept in sync it stays zero and does not trip the assertion in
  // UpdatePendingScrollInfo.
  metrics.UpdatePendingScrollInfo(update);
  EXPECT_EQ(metrics.GetVisualScrollOffset(), metrics.GetLayoutScrollOffset());
}
