/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_DimensionRequest_h
#define mozilla_DimensionRequest_h

#include "Units.h"
#include "mozilla/Maybe.h"

class nsIBaseWindow;
class nsIDocShellTreeOwner;

namespace mozilla {

enum class DimensionKind { Inner, Outer };

/**
 * DimensionRequest allows to request the change of some dimensions without
 * having to specify the unchanged dimensions. This is specifically necessary
 * when a change is initiated from a child process, which might not have an
 * up-to-date view of its latest dimensions. Having to specify the missing
 * dimensions with an outdated view can revert a previous change.
 *
 * The following series of changes `window.screenX = 10; window.screenY = 10;`
 * essentially translates into two moveTo() calls. For the second call we want
 * to account for changes made by the first call. From a child process we would
 * end up crafting the second call without knowing the results of the first
 * call. In the parent process we have access to results of the first call
 * before crafting the second one. Although on Linux even the parent process
 * doesn't have immediate access to the results of the last change.
 *
 * Note: The concept of an inner position is not present on
 * nsIDocShellTreeOwner and nsIBaseWindow. A request specifying an inner
 * position will return an NS_ERROR_NOT_IMPLEMENTED.
 */
struct DimensionRequest {
  DimensionKind mDimensionKind;
  Maybe<LayoutDeviceIntCoord> mX;
  Maybe<LayoutDeviceIntCoord> mY;
  Maybe<LayoutDeviceIntCoord> mWidth;
  Maybe<LayoutDeviceIntCoord> mHeight;

  /**
   * Fills the missing dimensions with values obtained from `aSource`. Whether
   * inner dimensions are supported depends on the implementation of
   * `nsIBaseWindow::GetDimensions` for `aSource`.
   *
   * @param aSource  The source for the missing dimensions.
   */
  nsresult SupplementFrom(nsIBaseWindow* aSource);

  /**
   * Changes the outer size and or position of `aTarget`. Only outer dimensions
   * are supported.
   *
   * @param aTarget  The target whose size or position we want to change.
   */
  nsresult ApplyOuterTo(nsIBaseWindow* aTarget);

  /**
   * Changes the inner size of `aTarget`. Only inner dimensions are supported.
   *
   * @param aTarget  The target whose size we want to change.
   */
  nsresult ApplyInnerTo(nsIDocShellTreeOwner* aTarget, bool aAsRootShell);
};

}  // namespace mozilla

#endif  // mozilla_DimensionRequest_h
