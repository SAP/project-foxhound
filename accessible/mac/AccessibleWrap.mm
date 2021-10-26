/* clang-format off */
/* -*- Mode: Objective-C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* clang-format on */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "DocAccessible.h"
#include "nsObjCExceptions.h"
#include "nsCocoaUtils.h"

#include "Accessible-inl.h"
#include "nsAccUtils.h"
#include "Role.h"
#include "TextRange.h"
#include "gfxPlatform.h"

#import "MOXLandmarkAccessibles.h"
#import "MOXMathAccessibles.h"
#import "MOXTextMarkerDelegate.h"
#import "MOXWebAreaAccessible.h"
#import "mozAccessible.h"
#import "mozActionElements.h"
#import "mozHTMLAccessible.h"
#import "mozSelectableElements.h"
#import "mozTableAccessible.h"
#import "mozTextAccessible.h"

using namespace mozilla;
using namespace mozilla::a11y;

AccessibleWrap::AccessibleWrap(nsIContent* aContent, DocAccessible* aDoc)
    : Accessible(aContent, aDoc), mNativeObject(nil), mNativeInited(false) {}

AccessibleWrap::~AccessibleWrap() {}

mozAccessible* AccessibleWrap::GetNativeObject() {
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK_NIL;

  if (!mNativeInited && !mNativeObject) {
    // We don't creat OSX accessibles for xul tooltips, defunct accessibles,
    // <br> (whitespace) elements, or pruned children.
    //
    // We also don't create a native object if we're child of a "flat"
    // accessible; for example, on OS X buttons shouldn't have any children,
    // because that makes the OS confused.
    //
    // To maintain a scripting environment where the XPCOM accessible hierarchy
    // look the same on all platforms, we still let the C++ objects be created
    // though.
    Accessible* parent = Parent();
    bool mustBePruned = parent && nsAccUtils::MustPrune(parent);
    if (!IsXULTooltip() && !IsDefunct() && !mustBePruned &&
        Role() != roles::WHITESPACE) {
      mNativeObject = [[GetNativeType() alloc] initWithAccessible:this];
    }
  }

  mNativeInited = true;

  return mNativeObject;

  NS_OBJC_END_TRY_ABORT_BLOCK_NIL;
}

void AccessibleWrap::GetNativeInterface(void** aOutInterface) {
  *aOutInterface = static_cast<void*>(GetNativeObject());
}

// overridden in subclasses to create the right kind of object. by default we
// create a generic 'mozAccessible' node.
Class AccessibleWrap::GetNativeType() {
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK_NIL;

  if (IsXULTabpanels()) {
    return [mozPaneAccessible class];
  }

  if (IsTable()) {
    return [mozTableAccessible class];
  }

  if (IsTableRow()) {
    return [mozTableRowAccessible class];
  }

  if (IsTableCell()) {
    return [mozTableCellAccessible class];
  }

  if (IsDoc()) {
    return [MOXWebAreaAccessible class];
  }

  return GetTypeFromRole(Role());

  NS_OBJC_END_TRY_ABORT_BLOCK_NIL;
}

// this method is very important. it is fired when an accessible object "dies".
// after this point the object might still be around (because some 3rd party
// still has a ref to it), but it is in fact 'dead'.
void AccessibleWrap::Shutdown() {
  // this ensure we will not try to re-create the native object.
  mNativeInited = true;

  // we really intend to access the member directly.
  if (mNativeObject) {
    [mNativeObject expire];
    [mNativeObject release];
    mNativeObject = nil;
  }

  Accessible::Shutdown();
}

nsresult AccessibleWrap::HandleAccEvent(AccEvent* aEvent) {
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK_NSRESULT;

  nsresult rv = Accessible::HandleAccEvent(aEvent);
  NS_ENSURE_SUCCESS(rv, rv);

  if (IPCAccessibilityActive()) {
    return NS_OK;
  }

  uint32_t eventType = aEvent->GetEventType();
  Accessible* eventTarget = nullptr;

  switch (eventType) {
    case nsIAccessibleEvent::EVENT_SELECTION:
    case nsIAccessibleEvent::EVENT_SELECTION_ADD:
    case nsIAccessibleEvent::EVENT_SELECTION_REMOVE: {
      AccSelChangeEvent* selEvent = downcast_accEvent(aEvent);
      // The "widget" is the selected widget's container. In OSX
      // it is the target of the selection changed event.
      eventTarget = selEvent->Widget();
      break;
    }
    case nsIAccessibleEvent::EVENT_TEXT_INSERTED:
    case nsIAccessibleEvent::EVENT_TEXT_REMOVED: {
      Accessible* acc = aEvent->GetAccessible();
      // If there is a text input ancestor, use it as the event source.
      while (acc && GetTypeFromRole(acc->Role()) != [mozTextAccessible class]) {
        acc = acc->Parent();
      }
      eventTarget = acc ? acc : aEvent->GetAccessible();
      break;
    }
    default:
      eventTarget = aEvent->GetAccessible();
      break;
  }

  mozAccessible* nativeAcc = nil;
  eventTarget->GetNativeInterface((void**)&nativeAcc);
  if (!nativeAcc) {
    return NS_ERROR_FAILURE;
  }

  switch (eventType) {
    case nsIAccessibleEvent::EVENT_STATE_CHANGE: {
      AccStateChangeEvent* event = downcast_accEvent(aEvent);
      [nativeAcc stateChanged:event->GetState()
                    isEnabled:event->IsStateEnabled()];
      break;
    }

    case nsIAccessibleEvent::EVENT_TEXT_SELECTION_CHANGED: {
      MOXTextMarkerDelegate* delegate =
          [MOXTextMarkerDelegate getOrCreateForDoc:aEvent->Document()];
      AccTextSelChangeEvent* event = downcast_accEvent(aEvent);
      AutoTArray<TextRange, 1> ranges;
      event->SelectionRanges(&ranges);

      if (ranges.Length()) {
        // Cache selection in delegate.
        [delegate setSelectionFrom:ranges[0].StartContainer()
                                at:ranges[0].StartOffset()
                                to:ranges[0].EndContainer()
                                at:ranges[0].EndOffset()];
      }

      [nativeAcc handleAccessibleEvent:eventType];
      break;
    }

    case nsIAccessibleEvent::EVENT_TEXT_CARET_MOVED: {
      AccCaretMoveEvent* event = downcast_accEvent(aEvent);
      if (event->IsSelectionCollapsed()) {
        // If the selection is collapsed, invalidate our text selection cache.
        MOXTextMarkerDelegate* delegate =
            [MOXTextMarkerDelegate getOrCreateForDoc:aEvent->Document()];
        int32_t caretOffset = event->GetCaretOffset();
        [delegate setSelectionFrom:eventTarget
                                at:caretOffset
                                to:eventTarget
                                at:caretOffset];
      }

      [nativeAcc handleAccessibleEvent:eventType];
      break;
    }

    case nsIAccessibleEvent::EVENT_TEXT_INSERTED:
    case nsIAccessibleEvent::EVENT_TEXT_REMOVED: {
      AccTextChangeEvent* tcEvent = downcast_accEvent(aEvent);
      [nativeAcc handleAccessibleTextChangeEvent:nsCocoaUtils::ToNSString(
                                                     tcEvent->ModifiedText())
                                        inserted:tcEvent->IsTextInserted()
                                     inContainer:aEvent->GetAccessible()
                                              at:tcEvent->GetStartOffset()];
      break;
    }

    case nsIAccessibleEvent::EVENT_FOCUS:
    case nsIAccessibleEvent::EVENT_TEXT_VALUE_CHANGE:
    case nsIAccessibleEvent::EVENT_DOCUMENT_LOAD_COMPLETE:
    case nsIAccessibleEvent::EVENT_MENUPOPUP_START:
    case nsIAccessibleEvent::EVENT_MENUPOPUP_END:
    case nsIAccessibleEvent::EVENT_REORDER:
    case nsIAccessibleEvent::EVENT_SELECTION:
    case nsIAccessibleEvent::EVENT_SELECTION_ADD:
    case nsIAccessibleEvent::EVENT_SELECTION_REMOVE:
      [nativeAcc handleAccessibleEvent:eventType];
      break;

    default:
      break;
  }

  return NS_OK;

  NS_OBJC_END_TRY_ABORT_BLOCK_NSRESULT;
}

////////////////////////////////////////////////////////////////////////////////
// AccessibleWrap protected

Class a11y::GetTypeFromRole(roles::Role aRole) {
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK_NIL;

  switch (aRole) {
    case roles::COMBOBOX:
      return [mozPopupButtonAccessible class];

    case roles::PUSHBUTTON:
      return [mozButtonAccessible class];

    case roles::PAGETAB:
      return [mozTabAccessible class];

    case roles::CHECKBUTTON:
    case roles::TOGGLE_BUTTON:
      return [mozCheckboxAccessible class];

    case roles::RADIOBUTTON:
      return [mozRadioButtonAccessible class];

    case roles::SPINBUTTON:
    case roles::SLIDER:
      return [mozIncrementableAccessible class];

    case roles::HEADING:
      return [mozHeadingAccessible class];

    case roles::PAGETABLIST:
      return [mozTabGroupAccessible class];

    case roles::ENTRY:
    case roles::CAPTION:
    case roles::ACCEL_LABEL:
    case roles::PASSWORD_TEXT:
      // normal textfield (static or editable)
      return [mozTextAccessible class];

    case roles::TEXT_LEAF:
    case roles::STATICTEXT:
      return [mozTextLeafAccessible class];

    case roles::LANDMARK:
      return [MOXLandmarkAccessible class];

    case roles::LINK:
      return [mozLinkAccessible class];

    case roles::LISTBOX:
      return [mozListboxAccessible class];

    case roles::LISTITEM:
      return [MOXListItemAccessible class];

    case roles::OPTION: {
      return [mozOptionAccessible class];
    }

    case roles::COMBOBOX_LIST:
    case roles::MENUBAR:
    case roles::MENUPOPUP: {
      return [mozMenuAccessible class];
    }

    case roles::COMBOBOX_OPTION:
    case roles::PARENT_MENUITEM:
    case roles::MENUITEM: {
      return [mozMenuItemAccessible class];
    }

    case roles::MATHML_ROOT:
      return [MOXMathRootAccessible class];

    case roles::MATHML_SQUARE_ROOT:
      return [MOXMathSquareRootAccessible class];

    case roles::MATHML_FRACTION:
      return [MOXMathFractionAccessible class];

    case roles::MATHML_SUB:
    case roles::MATHML_SUP:
    case roles::MATHML_SUB_SUP:
      return [MOXMathSubSupAccessible class];

    case roles::MATHML_UNDER:
    case roles::MATHML_OVER:
    case roles::MATHML_UNDER_OVER:
      return [MOXMathUnderOverAccessible class];

    case roles::SUMMARY:
      return [MOXSummaryAccessible class];

    case roles::OUTLINE:
    case roles::TREE_TABLE:
      return [mozOutlineAccessible class];

    case roles::OUTLINEITEM:
      return [mozOutlineRowAccessible class];

    default:
      return [mozAccessible class];
  }

  return nil;

  NS_OBJC_END_TRY_ABORT_BLOCK_NIL;
}
