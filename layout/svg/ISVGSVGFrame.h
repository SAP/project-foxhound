/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef LAYOUT_SVG_ISVGSVGFRAME_H_
#define LAYOUT_SVG_ISVGSVGFRAME_H_

#include "mozilla/ISVGDisplayableFrame.h"
#include "nsQueryFrame.h"

namespace mozilla {

class ISVGSVGFrame {
 public:
  NS_DECL_QUERYFRAME_TARGET(ISVGSVGFrame)

  /**
   * Called when non-attribute changes have caused the element's width/height
   * or its for-children transform to change, and to get the element to notify
   * its children appropriately. aFlags must be set to
   * ISVGDisplayableFrame::ChangeFlag::CoordContextChanged and/or
   * ISVGDisplayableFrame::ChangeFlag::TransformChanged.
   */
  virtual void NotifyViewportOrTransformChanged(
      ISVGDisplayableFrame::ChangeFlags aFlags) = 0;
};

}  // namespace mozilla

#endif  // LAYOUT_SVG_ISVGSVGFRAME_H_
