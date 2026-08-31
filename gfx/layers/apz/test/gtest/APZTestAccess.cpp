/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "APZTestAccess.h"
#include "mozilla/layers/WebRenderScrollData.h"

namespace mozilla {
namespace layers {

/*static*/
void APZTestAccess::InitializeForTest(WebRenderLayerScrollData& aLayer,
                                      int32_t aDescendantCount) {
  aLayer.InitializeForTest(aDescendantCount);
}

/*static*/
ScrollMetadata& APZTestAccess::GetScrollMetadataMut(
    WebRenderLayerScrollData& aLayer, WebRenderScrollData& aOwner,
    size_t aIndex) {
  return aLayer.GetScrollMetadataMut(aOwner, aIndex);
}

}  // namespace layers
}  // namespace mozilla
