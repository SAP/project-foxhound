/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_a11y_AccTypes_h
#define mozilla_a11y_AccTypes_h

#include "mozilla/DefineEnum.h"
#include "mozilla/TypedEnumBits.h"

namespace mozilla {
namespace a11y {

/**
 * Accessible object types. Each accessible class can have own type.
 */
// clang-format off
MOZ_DEFINE_ENUM_WITH_BASE(AccType, uint8_t,
  /**
   * This set of types is used for accessible creation, keep them together in
   * alphabetical order since they are used in switch statement.
   */
  (eNoType,
  eHTMLAbbrevType,
  eHTMLBRType,
  eHTMLButtonType,
  eHTMLCanvasType,
  eHTMLCaptionType,
  eHTMLCheckboxType,
  eHTMLComboboxType,
  eHTMLDateTimeFieldType,
  eHTMLFileInputType,
  eHTMLGroupboxType,
  eHTMLHRType,
  eHTMLImageMapType,
  eHTMLLiType,
  eHTMLSelectListType,
  eHTMLMediaType,
  eHTMLRadioButtonType,
  eHTMLRangeType,
  eHTMLSpinnerType,
  eHTMLTableType,
  eHTMLTableCellType,
  eHTMLTableRowType,
  eHTMLTextFieldType,
  eHTMLTextPasswordFieldType,
  eHyperTextType,
  eImageType,
  eOuterDocType,
  eTextLeafType,

  /**
   * Other accessible types.
   */
  eApplicationType,
  eHTMLLinkType,
  eHTMLOptGroupType,
  eImageMapType,
  eMenuPopupType,
  eProgressType,
  eRootType,
  eXULLabelType,
  eXULListItemType,
  eXULTabpanelsType,
  eXULTooltipType,
  eXULTreeType)
);
// clang-format on

/**
 * Generic accessible type, different accessible classes can share the same
 * type, the same accessible class can have several types.
 */
enum AccGenericType : int32_t {
  eAlert = 1 << 0,
  eAutoCompletePopup = 1 << 1,
  eButton = 1 << 2,
  eCombobox = 1 << 3,
  eDocument = 1 << 4,
  eHyperText = 1 << 5,
  eLandmark = 1 << 6,
  eList = 1 << 7,
  eListControl = 1 << 8,
  eMenuButton = 1 << 9,
  eSelect = 1 << 10,
  eTable = 1 << 11,
  eTableCell = 1 << 12,
  eTableRow = 1 << 13,
  eText = 1 << 14,
  eNumericValue = 1 << 15,
  eDPub = 1 << 16,

  eLastAccGenericType = eDPub,
  eAllGenericTypes = (eLastAccGenericType << 1) - 1
};

MOZ_MAKE_ENUM_CLASS_BITWISE_OPERATORS(AccGenericType)

}  // namespace a11y
}  // namespace mozilla

#endif  // mozilla_a11y_AccTypes_h
