/* clang-format off */
/* -*- Mode: Objective-C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* clang-format on */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AccAttributes.h"
#include "HyperTextAccessible-inl.h"
#include "LocalAccessible-inl.h"
#include "mozilla/a11y/PDocAccessible.h"
#include "nsCocoaUtils.h"
#include "nsObjCExceptions.h"
#include "TextLeafAccessible.h"

#import "mozTextAccessible.h"
#import "GeckoTextMarker.h"
#import "MOXTextMarkerDelegate.h"

using namespace mozilla;
using namespace mozilla::a11y;

inline bool ToNSRange(id aValue, NSRange* aRange) {
  MOZ_ASSERT(aRange, "aRange is nil");

  if ([aValue isKindOfClass:[NSValue class]] &&
      strcmp([(NSValue*)aValue objCType], @encode(NSRange)) == 0) {
    *aRange = [aValue rangeValue];
    return true;
  }

  return false;
}

inline NSString* ToNSString(id aValue) {
  if ([aValue isKindOfClass:[NSString class]]) {
    return aValue;
  }

  return nil;
}

static GeckoTextMarkerRange GetSelectionInObject(mozAccessible* aObj) {
  id<MOXTextMarkerSupport> delegate = [aObj moxTextMarkerDelegate];
  GeckoTextMarkerRange selection =
      [static_cast<MOXTextMarkerDelegate*>(delegate) selection];

  if (!selection.IsValid() || !selection.Crop([aObj geckoAccessible])) {
    // The selection is not in this accessible. Return invalid range.
    return GeckoTextMarkerRange();
  }

  return selection;
}

static GeckoTextMarkerRange GetTextMarkerRangeFromRange(mozAccessible* aObj,
                                                        NSValue* aRange) {
  NSRange r = [aRange rangeValue];
  Accessible* acc = [aObj geckoAccessible];

  GeckoTextMarker startMarker =
      GeckoTextMarker::MarkerFromIndex(acc, r.location);

  GeckoTextMarker endMarker =
      GeckoTextMarker::MarkerFromIndex(acc, r.location + r.length);

  return GeckoTextMarkerRange(startMarker, endMarker);
}

@implementation mozAccessible (TextField)

- (NSNumber*)moxInsertionPointLineNumber {
  MOZ_ASSERT(mGeckoAccessible);

  int32_t lineNumber = -1;
  if (HyperTextAccessibleBase* textAcc = mGeckoAccessible->AsHyperTextBase()) {
    lineNumber = textAcc->CaretLineNumber() - 1;
  }

  return (lineNumber >= 0) ? [NSNumber numberWithInt:lineNumber] : nil;
}

- (NSNumber*)moxNumberOfCharacters {
  return @([[self moxValue] length]);
}

- (NSString*)moxSelectedText {
  GeckoTextMarkerRange selection = GetSelectionInObject(self);
  if (!selection.IsValid()) {
    return nil;
  }

  return selection.Text();
}

- (NSValue*)moxSelectedTextRange {
  GeckoTextMarkerRange selection = GetSelectionInObject(self);
  if (!selection.IsValid()) {
    return nil;
  }

  GeckoTextMarkerRange fromStartToSelection(
      GeckoTextMarker(mGeckoAccessible, 0), selection.Start());

  return [NSValue valueWithRange:NSMakeRange(fromStartToSelection.Length(),
                                             selection.Length())];
}

- (NSValue*)moxVisibleCharacterRange {
  // XXX this won't work with Textarea and such as we actually don't give
  // the visible character range.
  return [NSValue valueWithRange:NSMakeRange(0, [[self moxValue] length])];
}

- (void)moxSetValue:(id)value {
  MOZ_ASSERT(mGeckoAccessible);

  nsString text;
  nsCocoaUtils::GetStringForNSString(value, text);
  if (HyperTextAccessibleBase* textAcc = mGeckoAccessible->AsHyperTextBase()) {
    textAcc->ReplaceText(text);
  }
}

- (void)moxSetSelectedText:(NSString*)selectedText {
  MOZ_ASSERT(mGeckoAccessible);

  NSString* stringValue = ToNSString(selectedText);
  if (!stringValue) {
    return;
  }

  HyperTextAccessibleBase* textAcc = mGeckoAccessible->AsHyperTextBase();
  if (!textAcc) {
    return;
  }
  int32_t start = 0, end = 0;
  textAcc->SelectionBoundsAt(0, &start, &end);
  nsString text;
  nsCocoaUtils::GetStringForNSString(stringValue, text);
  textAcc->SelectionBoundsAt(0, &start, &end);
  textAcc->DeleteText(start, end - start);
  textAcc->InsertText(text, start);
}

- (void)moxSetSelectedTextRange:(NSValue*)selectedTextRange {
  GeckoTextMarkerRange markerRange =
      GetTextMarkerRangeFromRange(self, selectedTextRange);

  if (markerRange.IsValid()) {
    markerRange.Select();
  }
}

- (void)moxSetVisibleCharacterRange:(NSValue*)visibleCharacterRange {
  MOZ_ASSERT(mGeckoAccessible);

  NSRange range;
  if (!ToNSRange(visibleCharacterRange, &range)) {
    return;
  }

  if (HyperTextAccessibleBase* textAcc = mGeckoAccessible->AsHyperTextBase()) {
    textAcc->ScrollSubstringTo(range.location, range.location + range.length,
                               nsIAccessibleScrollType::SCROLL_TYPE_TOP_EDGE);
  }
}

- (NSString*)moxStringForRange:(NSValue*)range {
  GeckoTextMarkerRange markerRange = GetTextMarkerRangeFromRange(self, range);

  if (!markerRange.IsValid()) {
    return nil;
  }

  return markerRange.Text();
}

- (NSAttributedString*)moxAttributedStringForRange:(NSValue*)range {
  GeckoTextMarkerRange markerRange = GetTextMarkerRangeFromRange(self, range);

  if (!markerRange.IsValid()) {
    return nil;
  }

  return markerRange.AttributedText();
}

- (NSValue*)moxRangeForLine:(NSNumber*)line {
  // XXX: actually get the integer value for the line #
  return [NSValue valueWithRange:NSMakeRange(0, [[self moxValue] length])];
}

- (NSNumber*)moxLineForIndex:(NSNumber*)index {
  // XXX: actually return the line #
  return @0;
}

- (NSValue*)moxBoundsForRange:(NSValue*)range {
  GeckoTextMarkerRange markerRange = GetTextMarkerRangeFromRange(self, range);

  if (!markerRange.IsValid()) {
    return nil;
  }

  return markerRange.Bounds();
}

- (BOOL)moxIsTextField {
  return !mGeckoAccessible->HasNumericValue() &&
         mGeckoAccessible->IsEditableRoot();
}

- (BOOL)blockTextFieldMethod:(SEL)selector {
  // These are the editable text methods defined in this category.
  // We want to block them in certain cases.
  if (selector != @selector(moxNumberOfCharacters) &&
      selector != @selector(moxInsertionPointLineNumber) &&
      selector != @selector(moxSelectedText) &&
      selector != @selector(moxSelectedTextRange) &&
      selector != @selector(moxVisibleCharacterRange) &&
      selector != @selector(moxSetSelectedText:) &&
      selector != @selector(moxSetSelectedTextRange:) &&
      selector != @selector(moxSetVisibleCharacterRange:) &&
      selector != @selector(moxStringForRange:) &&
      selector != @selector(moxAttributedStringForRange:) &&
      selector != @selector(moxRangeForLine:) &&
      selector != @selector(moxLineForIndex:) &&
      selector != @selector(moxBoundsForRange:) &&
      selector != @selector(moxSetValue:)) {
    return NO;
  }

  if ([[mozAccessible class] instanceMethodForSelector:selector] !=
      [self methodForSelector:selector]) {
    // This method was overridden by a subclass, so let it through.
    return NO;
  }

  if (![self moxIsTextField]) {
    // This is not an editable root, so block these methods.
    return YES;
  }

  if (selector == @selector(moxSetValue:) &&
      [self stateWithMask:states::EDITABLE] == 0) {
    // The editable is read-only, so block setValue:
    // Bug 1995330 - should rely on READONLY/UNAVAILABLE here.
    return YES;
  }

  // Let these methods through.
  return NO;
}

- (void)handleAccessibleTextChangeEvent:(NSString*)change
                               inserted:(BOOL)isInserted
                            inContainer:(Accessible*)container
                                     at:(int32_t)start {
  MOZ_ASSERT([self moxIsTextField]);
  GeckoTextMarker startMarker(container, start);
  NSDictionary* userInfo = @{
    @"AXTextChangeElement" : self,
    @"AXTextStateChangeType" : @(AXTextStateChangeTypeEdit),
    @"AXTextChangeValues" : @[ @{
      @"AXTextChangeValue" : (change ? change : @""),
      @"AXTextChangeValueStartMarker" :
          (__bridge id)startMarker.CreateAXTextMarker(),
      @"AXTextEditType" : isInserted ? @(AXTextEditTypeTyping)
                                     : @(AXTextEditTypeDelete)
    } ]
  };

  mozAccessible* webArea = [self topWebArea];
  [webArea moxPostNotification:NSAccessibilityValueChangedNotification
                  withUserInfo:userInfo];
  [self moxPostNotification:NSAccessibilityValueChangedNotification
               withUserInfo:userInfo];

  [self moxPostNotification:NSAccessibilityValueChangedNotification];
}

@end

@implementation mozTextLeafAccessible

- (BOOL)moxBlockSelector:(SEL)selector {
  if (selector == @selector(moxChildren) || selector == @selector
                                                (moxTitleUIElement)) {
    return YES;
  }

  return [super moxBlockSelector:selector];
}

- (NSString*)moxValue {
  MOZ_ASSERT(mGeckoAccessible);

  nsAutoString name;
  mGeckoAccessible->Name(name);

  if (nsCoreUtils::IsWhitespaceString(name)) {
    return nil;
  }

  return nsCocoaUtils::ToNSString(name);
}

- (NSString*)moxTitle {
  return nil;
}

- (NSString*)moxLabel {
  return nil;
}

- (BOOL)moxIgnoreWithParent:(mozAccessible*)parent {
  // Don't render text nodes that are completely empty
  // or those that should be ignored based on our
  // standard ignore rules
  return [self moxValue] == nil || [super moxIgnoreWithParent:parent];
}

static GeckoTextMarkerRange TextMarkerSubrange(Accessible* aAccessible,
                                               NSValue* aRange) {
  GeckoTextMarkerRange textMarkerRange(aAccessible);
  GeckoTextMarker start = textMarkerRange.Start();
  GeckoTextMarker end = textMarkerRange.End();

  NSRange r = [aRange rangeValue];
  start.Offset() += r.location;
  end.Offset() = start.Offset() + r.length;

  textMarkerRange = GeckoTextMarkerRange(start, end);
  // Crop range to accessible
  textMarkerRange.Crop(aAccessible);

  return textMarkerRange;
}

- (NSString*)moxStringForRange:(NSValue*)range {
  MOZ_ASSERT(mGeckoAccessible);
  GeckoTextMarkerRange textMarkerRange =
      TextMarkerSubrange(mGeckoAccessible, range);

  return textMarkerRange.Text();
}

- (NSAttributedString*)moxAttributedStringForRange:(NSValue*)range {
  MOZ_ASSERT(mGeckoAccessible);
  GeckoTextMarkerRange textMarkerRange =
      TextMarkerSubrange(mGeckoAccessible, range);

  return textMarkerRange.AttributedText();
}

- (NSValue*)moxBoundsForRange:(NSValue*)range {
  MOZ_ASSERT(mGeckoAccessible);
  GeckoTextMarkerRange textMarkerRange =
      TextMarkerSubrange(mGeckoAccessible, range);

  return textMarkerRange.Bounds();
}

@end
