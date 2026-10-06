/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ScrollingInteractionContext.h"

namespace mozilla::layers {

/*static*/
bool ScrollingInteractionContext::sScrollingToAnchor = false;

/*static*/
bool ScrollingInteractionContext::IsScrollingToAnchor() {
  return sScrollingToAnchor;
}

ScrollingInteractionContext::ScrollingInteractionContext(
    bool aScrollingToAnchor)
    : mOldScrollingToAnchor(sScrollingToAnchor) {
  sScrollingToAnchor = aScrollingToAnchor;
}

ScrollingInteractionContext::~ScrollingInteractionContext() {
  sScrollingToAnchor = mOldScrollingToAnchor;
}

}  // namespace mozilla::layers
