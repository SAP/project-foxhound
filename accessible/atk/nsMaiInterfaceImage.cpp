/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "InterfaceInitFuncs.h"

#include "AccessibleWrap.h"
#include "mozilla/a11y/Accessible.h"
#include "mozilla/Likely.h"
#include "nsMai.h"
#include "nsIAccessibleTypes.h"

using namespace mozilla;
using namespace mozilla::a11y;

extern "C" {
const gchar* getDescriptionCB(AtkObject* aAtkObj);

static void getImagePositionCB(AtkImage* aImage, gint* aAccX, gint* aAccY,
                               AtkCoordType aCoordType) {
  LayoutDeviceIntPoint pos(-1, -1);
  uint32_t geckoCoordType =
      (aCoordType == ATK_XY_WINDOW)
          ? nsIAccessibleCoordinateType::COORDTYPE_WINDOW_RELATIVE
          : nsIAccessibleCoordinateType::COORDTYPE_SCREEN_RELATIVE;

  if (Accessible* acc = GetInternalObj(ATK_OBJECT(aImage))) {
    pos = acc->Position(geckoCoordType);
  }

  *aAccX = pos.x;
  *aAccY = pos.y;
}

static const gchar* getImageDescriptionCB(AtkImage* aImage) {
  return getDescriptionCB(ATK_OBJECT(aImage));
}

static void getImageSizeCB(AtkImage* aImage, gint* aAccWidth,
                           gint* aAccHeight) {
  LayoutDeviceIntSize size(-1, -1);
  if (Accessible* acc = GetInternalObj(ATK_OBJECT(aImage))) {
    size = acc->Size();
  }

  *aAccWidth = size.width;
  *aAccHeight = size.height;
}

}  // extern "C"

void imageInterfaceInitCB(AtkImageIface* aIface) {
  NS_ASSERTION(aIface, "no interface!");
  if (MOZ_UNLIKELY(!aIface)) return;

  aIface->get_image_position = getImagePositionCB;
  aIface->get_image_description = getImageDescriptionCB;
  aIface->get_image_size = getImageSizeCB;
}
