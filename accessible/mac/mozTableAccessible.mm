/* clang-format off */
/* -*- Mode: Objective-C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* clang-format on */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#import "mozTableAccessible.h"
#import "nsCocoaUtils.h"
#import "MacUtils.h"
#import "RotorRules.h"

#include "AccIterator.h"
#include "Accessible.h"
#include "TableAccessible.h"
#include "TableCellAccessible.h"
#include "Pivot.h"
#include "Relation.h"

using namespace mozilla;
using namespace mozilla::a11y;

@implementation mozColumnContainer

- (id)initWithIndex:(uint32_t)aIndex andParent:(mozAccessible*)aParent {
  self = [super init];
  mIndex = aIndex;
  mParent = aParent;
  return self;
}

- (NSString*)moxRole {
  return NSAccessibilityColumnRole;
}

- (NSString*)moxRoleDescription {
  return NSAccessibilityRoleDescription(NSAccessibilityColumnRole, nil);
}

- (mozAccessible*)moxParent {
  return mParent;
}

- (NSArray*)moxUnignoredChildren {
  if (mChildren) return mChildren;

  mChildren = [[NSMutableArray alloc] init];

  if (Accessible* acc = [mParent geckoAccessible].AsAccessible()) {
    TableAccessible* table = acc->AsTable();
    MOZ_ASSERT(table, "Got null table when fetching column children!");
    uint32_t numRows = table->RowCount();

    for (uint32_t j = 0; j < numRows; j++) {
      Accessible* cell = table->CellAt(j, mIndex);
      mozAccessible* nativeCell =
          cell ? GetNativeFromGeckoAccessible(cell) : nil;
      if ([nativeCell isAccessibilityElement]) {
        [mChildren addObject:nativeCell];
      }
    }

  } else if (ProxyAccessible* proxy = [mParent geckoAccessible].AsProxy()) {
    uint32_t numRows = proxy->TableRowCount();

    for (uint32_t j = 0; j < numRows; j++) {
      ProxyAccessible* cell = proxy->TableCellAt(j, mIndex);
      mozAccessible* nativeCell =
          cell ? GetNativeFromGeckoAccessible(cell) : nil;
      if ([nativeCell isAccessibilityElement]) {
        [mChildren addObject:nativeCell];
      }
    }
  }

  return mChildren;
}

- (void)dealloc {
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK;

  [self invalidateChildren];
  [super dealloc];

  NS_OBJC_END_TRY_ABORT_BLOCK;
}

- (void)expire {
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK;

  [self invalidateChildren];

  mParent = nil;

  [super expire];

  NS_OBJC_END_TRY_ABORT_BLOCK;
}

- (BOOL)isExpired {
  MOZ_ASSERT((mChildren == nil && mParent == nil) == mIsExpired);

  return [super isExpired];
}

- (void)invalidateChildren {
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK;

  // make room for new children
  if (mChildren) {
    [mChildren release];
    mChildren = nil;
  }

  NS_OBJC_END_TRY_ABORT_BLOCK;
}

@end

@implementation mozTablePartAccessible

- (NSString*)moxTitle {
  return @"";
}

- (NSString*)moxRole {
  return [self isLayoutTablePart] ? NSAccessibilityGroupRole : [super moxRole];
}

- (BOOL)isLayoutTablePart {
  if (Accessible* acc = mGeckoAccessible.AsAccessible()) {
    while (acc) {
      if (acc->Role() == roles::TREE_TABLE) {
        return false;
      }
      if (acc->IsTable()) {
        return acc->AsTable()->IsProbablyLayoutTable();
      }
      acc = acc->Parent();
    }
    return false;
  }

  if (ProxyAccessible* proxy = mGeckoAccessible.AsProxy()) {
    while (proxy) {
      if (proxy->Role() == roles::TREE_TABLE) {
        return false;
      }
      if (proxy->IsTable()) {
        return proxy->TableIsProbablyForLayout();
      }
      proxy = proxy->Parent();
    }
  }

  return false;
}

@end

@implementation mozTableAccessible

- (void)handleAccessibleEvent:(uint32_t)eventType {
  if (eventType == nsIAccessibleEvent::EVENT_REORDER) {
    [self invalidateColumns];
  }

  [super handleAccessibleEvent:eventType];
}

- (void)dealloc {
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK;

  [self invalidateColumns];
  [super dealloc];

  NS_OBJC_END_TRY_ABORT_BLOCK;
}

- (NSNumber*)moxRowCount {
  MOZ_ASSERT(!mGeckoAccessible.IsNull());

  return mGeckoAccessible.IsAccessible()
             ? @(mGeckoAccessible.AsAccessible()->AsTable()->RowCount())
             : @(mGeckoAccessible.AsProxy()->TableRowCount());
}

- (NSNumber*)moxColumnCount {
  MOZ_ASSERT(!mGeckoAccessible.IsNull());

  return mGeckoAccessible.IsAccessible()
             ? @(mGeckoAccessible.AsAccessible()->AsTable()->ColCount())
             : @(mGeckoAccessible.AsProxy()->TableColumnCount());
}

- (NSArray*)moxRows {
  // Create a new array with the list of table rows.
  return [[self moxChildren]
      filteredArrayUsingPredicate:[NSPredicate predicateWithBlock:^BOOL(
                                                   mozAccessible* child,
                                                   NSDictionary* bindings) {
        return [child isKindOfClass:[mozTableRowAccessible class]];
      }]];
}

- (NSArray*)moxColumns {
  MOZ_ASSERT(!mGeckoAccessible.IsNull());

  if (mColContainers) {
    return mColContainers;
  }

  mColContainers = [[NSMutableArray alloc] init];
  uint32_t numCols = 0;

  if (Accessible* acc = mGeckoAccessible.AsAccessible()) {
    numCols = acc->AsTable()->ColCount();
  } else {
    numCols = mGeckoAccessible.AsProxy()->TableColumnCount();
  }

  for (uint32_t i = 0; i < numCols; i++) {
    mozColumnContainer* container =
        [[mozColumnContainer alloc] initWithIndex:i andParent:self];
    [mColContainers addObject:container];
  }

  return mColContainers;
}

- (NSArray*)moxUnignoredChildren {
  if (![self isLayoutTablePart]) {
    return [[super moxUnignoredChildren]
        arrayByAddingObjectsFromArray:[self moxColumns]];
  }

  return [super moxUnignoredChildren];
}

- (NSArray*)moxColumnHeaderUIElements {
  MOZ_ASSERT(!mGeckoAccessible.IsNull());

  uint32_t numCols = 0;
  TableAccessible* table = nullptr;

  if (Accessible* acc = mGeckoAccessible.AsAccessible()) {
    table = mGeckoAccessible.AsAccessible()->AsTable();
    numCols = table->ColCount();
  } else {
    numCols = mGeckoAccessible.AsProxy()->TableColumnCount();
  }

  NSMutableArray* colHeaders =
      [[NSMutableArray alloc] initWithCapacity:numCols];

  for (uint32_t i = 0; i < numCols; i++) {
    AccessibleOrProxy cell;
    if (table) {
      cell = table->CellAt(0, i);
    } else {
      cell = mGeckoAccessible.AsProxy()->TableCellAt(0, i);
    }

    if (!cell.IsNull() && cell.Role() == roles::COLUMNHEADER) {
      mozAccessible* colHeader = GetNativeFromGeckoAccessible(cell);
      [colHeaders addObject:colHeader];
    }
  }

  return colHeaders;
}

- (id)moxCellForColumnAndRow:(NSArray*)columnAndRow {
  if (columnAndRow == nil || [columnAndRow count] != 2) {
    return nil;
  }

  uint32_t col = [[columnAndRow objectAtIndex:0] unsignedIntValue];
  uint32_t row = [[columnAndRow objectAtIndex:1] unsignedIntValue];

  MOZ_ASSERT(!mGeckoAccessible.IsNull());

  AccessibleOrProxy cell;
  if (mGeckoAccessible.IsAccessible()) {
    cell = mGeckoAccessible.AsAccessible()->AsTable()->CellAt(row, col);
  } else {
    cell = mGeckoAccessible.AsProxy()->TableCellAt(row, col);
  }

  if (cell.IsNull()) {
    return nil;
  }

  return GetNativeFromGeckoAccessible(cell);
}

- (void)invalidateColumns {
  NS_OBJC_BEGIN_TRY_ABORT_BLOCK;
  if (mColContainers) {
    [mColContainers release];
    mColContainers = nil;
  }
  NS_OBJC_END_TRY_ABORT_BLOCK;
}

@end

@implementation mozTableRowAccessible

- (void)handleAccessibleEvent:(uint32_t)eventType {
  if (eventType == nsIAccessibleEvent::EVENT_REORDER) {
    id parent = [self moxParent];
    if ([parent isKindOfClass:[mozTableAccessible class]]) {
      [parent invalidateColumns];
    }
  }

  [super handleAccessibleEvent:eventType];
}

- (NSNumber*)moxIndex {
  mozTableAccessible* parent = (mozTableAccessible*)[self moxParent];
  return @([[parent moxRows] indexOfObjectIdenticalTo:self]);
}

@end

@implementation mozTableCellAccessible

- (NSValue*)moxRowIndexRange {
  MOZ_ASSERT(!mGeckoAccessible.IsNull());

  if (mGeckoAccessible.IsAccessible()) {
    TableCellAccessible* cell = mGeckoAccessible.AsAccessible()->AsTableCell();
    return
        [NSValue valueWithRange:NSMakeRange(cell->RowIdx(), cell->RowExtent())];
  } else {
    ProxyAccessible* proxy = mGeckoAccessible.AsProxy();
    return [NSValue
        valueWithRange:NSMakeRange(proxy->RowIdx(), proxy->RowExtent())];
  }
}

- (NSValue*)moxColumnIndexRange {
  MOZ_ASSERT(!mGeckoAccessible.IsNull());

  if (mGeckoAccessible.IsAccessible()) {
    TableCellAccessible* cell = mGeckoAccessible.AsAccessible()->AsTableCell();
    return
        [NSValue valueWithRange:NSMakeRange(cell->ColIdx(), cell->ColExtent())];
  } else {
    ProxyAccessible* proxy = mGeckoAccessible.AsProxy();
    return [NSValue
        valueWithRange:NSMakeRange(proxy->ColIdx(), proxy->ColExtent())];
  }
}

- (NSArray*)moxRowHeaderUIElements {
  MOZ_ASSERT(!mGeckoAccessible.IsNull());

  if (mGeckoAccessible.IsAccessible()) {
    TableCellAccessible* cell = mGeckoAccessible.AsAccessible()->AsTableCell();
    AutoTArray<Accessible*, 10> headerCells;
    cell->RowHeaderCells(&headerCells);
    return utils::ConvertToNSArray(headerCells);
  } else {
    ProxyAccessible* proxy = mGeckoAccessible.AsProxy();
    nsTArray<ProxyAccessible*> headerCells;
    proxy->RowHeaderCells(&headerCells);
    return utils::ConvertToNSArray(headerCells);
  }
}

- (NSArray*)moxColumnHeaderUIElements {
  MOZ_ASSERT(!mGeckoAccessible.IsNull());

  if (mGeckoAccessible.IsAccessible()) {
    TableCellAccessible* cell = mGeckoAccessible.AsAccessible()->AsTableCell();
    AutoTArray<Accessible*, 10> headerCells;
    cell->ColHeaderCells(&headerCells);
    return utils::ConvertToNSArray(headerCells);
  } else {
    ProxyAccessible* proxy = mGeckoAccessible.AsProxy();
    nsTArray<ProxyAccessible*> headerCells;
    proxy->ColHeaderCells(&headerCells);
    return utils::ConvertToNSArray(headerCells);
  }
}

@end

@implementation mozOutlineAccessible

- (NSArray*)moxRows {
  // Create a new array with the list of outline rows. We
  // use pivot here to do a deep traversal of all rows nested
  // in this outline, not just those which are direct
  // children, since that's what VO expects.
  NSMutableArray* allRows = [[NSMutableArray alloc] init];
  Pivot p = Pivot(mGeckoAccessible);
  OutlineRule rule = OutlineRule();
  AccessibleOrProxy firstChild = mGeckoAccessible.FirstChild();
  AccessibleOrProxy match = p.Next(firstChild, rule, true);
  while (!match.IsNull()) {
    [allRows addObject:GetNativeFromGeckoAccessible(match)];
    match = p.Next(match, rule);
  }
  return allRows;
}

- (NSArray*)moxColumns {
  // Webkit says we shouldn't do anything here
  return @[];
}

- (NSArray*)moxSelectedRows {
  NSMutableArray* selectedRows = [[NSMutableArray alloc] init];
  NSArray* allRows = [self moxRows];
  for (mozAccessible* row in allRows) {
    if ([row stateWithMask:states::SELECTED] != 0) {
      [selectedRows addObject:row];
    }
  }

  return selectedRows;
}

@end

@implementation mozOutlineRowAccessible

- (BOOL)isLayoutTablePart {
  return NO;
}

- (NSNumber*)moxDisclosing {
  return @([self stateWithMask:states::EXPANDED] != 0);
}

- (id)moxDisclosedByRow {
  // According to webkit: this attr corresponds to the row
  // that contains this row. It should be the same as the
  // first parent that is a treeitem. If the parent is the tree
  // itself, this should be nil. This is tricky for xul trees because
  // all rows are direct children of the outline; they use
  // relations to expose their heirarchy structure.

  mozAccessible* disclosingRow = nil;
  // first we check the relations to see if we're in a xul tree
  // with weird row semantics
  if (mGeckoAccessible.IsAccessible()) {
    Relation rel = mGeckoAccessible.AsAccessible()->RelationByType(
        RelationType::NODE_CHILD_OF);
    Accessible* maybeParent = rel.Next();
    disclosingRow =
        maybeParent ? GetNativeFromGeckoAccessible(maybeParent) : nil;
  } else {
    nsTArray<ProxyAccessible*> accs =
        mGeckoAccessible.AsProxy()->RelationByType(RelationType::NODE_CHILD_OF);
    disclosingRow =
        accs.Length() > 0 ? GetNativeFromGeckoAccessible(accs[0]) : nil;
  }

  if (disclosingRow) {
    // if we find a row from our relation check,
    // verify it isn't the outline itself and return
    // appropriately
    if ([[disclosingRow moxRole] isEqualToString:@"AXOutline"]) {
      return nil;
    }

    return disclosingRow;
  }
  mozAccessible* parent = (mozAccessible*)[self moxUnignoredParent];
  // otherwise, its likely we're in an aria tree, so we can use
  // these role and subrole checks
  if ([[parent moxRole] isEqualToString:@"AXOutline"]) {
    return nil;
  }

  if ([[parent moxSubrole] isEqualToString:@"AXOutlineRow"]) {
    disclosingRow = parent;
  }

  return nil;
}

- (NSNumber*)moxDisclosureLevel {
  GroupPos groupPos;
  if (Accessible* acc = mGeckoAccessible.AsAccessible()) {
    groupPos = acc->GroupPosition();
  } else if (ProxyAccessible* proxy = mGeckoAccessible.AsProxy()) {
    groupPos = proxy->GroupPosition();
  }

  return @(groupPos.level);
}

- (NSArray*)moxDisclosedRows {
  // According to webkit: this attr corresponds to the rows
  // that are considered inside this row. Again, this is weird for
  // xul trees so we have to use relations first and then fall-back
  // to the children filter for non-xul outlines.

  NSMutableArray* disclosedRows = [[NSMutableArray alloc] init];
  // first we check the relations to see if we're in a xul tree
  // with weird row semantics
  if (mGeckoAccessible.IsAccessible()) {
    Relation rel = mGeckoAccessible.AsAccessible()->RelationByType(
        RelationType::NODE_PARENT_OF);
    Accessible* acc = nullptr;
    while ((acc = rel.Next())) {
      [disclosedRows addObject:GetNativeFromGeckoAccessible(acc)];
    }
  } else {
    nsTArray<ProxyAccessible*> accs =
        mGeckoAccessible.AsProxy()->RelationByType(
            RelationType::NODE_PARENT_OF);
    disclosedRows = utils::ConvertToNSArray(accs);
  }

  if (disclosedRows) {
    // if we find rows from our relation check, return them here
    return disclosedRows;
  }

  // otherwise, filter our children for outline rows
  return [[self moxChildren]
      filteredArrayUsingPredicate:[NSPredicate predicateWithBlock:^BOOL(
                                                   mozAccessible* child,
                                                   NSDictionary* bindings) {
        return [child isKindOfClass:[mozOutlineRowAccessible class]];
      }]];
}

- (NSNumber*)moxIndex {
  mozAccessible* parent = (mozAccessible*)[self moxUnignoredParent];
  while (parent) {
    if ([[parent moxRole] isEqualToString:@"AXOutline"]) {
      break;
    }
    parent = (mozAccessible*)[parent moxUnignoredParent];
  }

  NSUInteger index =
      [[(mozOutlineAccessible*)parent moxRows] indexOfObjectIdenticalTo:self];
  return index == NSNotFound ? nil : @(index);
}

- (NSString*)moxLabel {
  nsAutoString title;
  if (Accessible* acc = mGeckoAccessible.AsAccessible()) {
    acc->Name(title);
  } else {
    mGeckoAccessible.AsProxy()->Name(title);
  }
  // XXX: When parsing outlines built with ul/lu's, we
  // include the bullet in this description even
  // though webkit doesn't. Not all outlines are built with
  // ul/lu's so we can't strip the first character here.

  return nsCocoaUtils::ToNSString(title);
}

@end
