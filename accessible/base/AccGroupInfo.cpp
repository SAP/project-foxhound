/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AccGroupInfo.h"
#include "mozilla/a11y/Accessible.h"
#include "mozilla/a11y/TableAccessibleBase.h"

#include "nsAccUtils.h"
#include "nsIAccessiblePivot.h"

#include "Pivot.h"
#include "States.h"

using namespace mozilla::a11y;

static bool IsGenericContainer(role aRole);
static Accessible* GetRelevantParent(const Accessible* aAcc);
static role BaseRole(role aRole);

// This rule finds candidate siblings for compound widget children.
class CompoundWidgetSiblingRule : public PivotRule {
 public:
  CompoundWidgetSiblingRule() = delete;
  explicit CompoundWidgetSiblingRule(role aRole) : mRole(aRole) {}

  uint16_t Match(Accessible* aAcc) override {
    // If the acc has a matching role, that's a valid sibling. If the acc is
    // separator then the group is ended. Return a match for separators with
    // the assumption that the caller will check for the role of the returned
    // accessible.
    const role accRole = aAcc->Role();
    if (BaseRole(accRole) == mRole || accRole == role::SEPARATOR) {
      return nsIAccessibleTraversalRule::FILTER_MATCH |
             nsIAccessibleTraversalRule::FILTER_IGNORE_SUBTREE;
    }

    // Ignore generic accessibles, but keep searching through the subtree for
    // siblings.
    if (IsGenericContainer(accRole)) {
      return nsIAccessibleTraversalRule::FILTER_IGNORE;
    }

    return nsIAccessibleTraversalRule::FILTER_IGNORE_SUBTREE;
  }

 private:
  role mRole = role::NOTHING;
};

AccGroupInfo::AccGroupInfo(const Accessible* aItem, role aRole)
    : mPosInSet(0), mSetSize(0), mParent(nullptr), mItem(aItem), mRole(aRole) {
  MOZ_COUNT_CTOR(AccGroupInfo);
  Update();
}

void AccGroupInfo::Update() {
  mParent = nullptr;

  Accessible* parent = GetRelevantParent(mItem);
  if (!parent) {
    return;
  }

  const int32_t level = GetARIAOrDefaultLevel(mItem);

  // Compute position in set.
  mPosInSet = 1;

  // Search backwards through the tree for candidate siblings.
  Accessible* candidateSibling = const_cast<Accessible*>(mItem);
  Pivot pivot{parent};
  CompoundWidgetSiblingRule widgetSiblingRule{mRole};
  while ((candidateSibling = pivot.Prev(candidateSibling, widgetSiblingRule)) &&
         candidateSibling != parent) {
    // If the sibling is separator then the group is ended.
    if (candidateSibling->Role() == roles::SEPARATOR) {
      break;
    }

    const AccGroupInfo* siblingGroupInfo = candidateSibling->GetGroupInfo();
    // Skip invisible siblings.
    // If the sibling has calculated group info, that means it's visible.
    if (!siblingGroupInfo && candidateSibling->State() & states::INVISIBLE) {
      continue;
    }

    // Check if it's hierarchical flatten structure, i.e. if the sibling
    // level is lesser than this one then group is ended, if the sibling level
    // is greater than this one then the group is split by some child elements
    // (group will be continued).
    const int32_t siblingLevel = GetARIAOrDefaultLevel(candidateSibling);
    if (siblingLevel < level) {
      mParent = candidateSibling;
      break;
    }

    // Skip subset.
    if (siblingLevel > level) {
      continue;
    }

    // If the previous item in the group has calculated group information then
    // build group information for this item based on found one.
    if (siblingGroupInfo) {
      mPosInSet += siblingGroupInfo->mPosInSet;
      mParent = siblingGroupInfo->mParent;
      mSetSize = siblingGroupInfo->mSetSize;
      return;
    }

    mPosInSet++;
  }

  // Compute set size.
  mSetSize = mPosInSet;

  candidateSibling = const_cast<Accessible*>(mItem);
  while ((candidateSibling = pivot.Next(candidateSibling, widgetSiblingRule)) &&
         candidateSibling != parent) {
    // If the sibling is separator then the group is ended.
    if (candidateSibling->Role() == roles::SEPARATOR) {
      break;
    }

    const AccGroupInfo* siblingGroupInfo = candidateSibling->GetGroupInfo();
    // Skip invisible siblings.
    // If the sibling has calculated group info, that means it's visible.
    if (!siblingGroupInfo && candidateSibling->State() & states::INVISIBLE) {
      continue;
    }

    // and check if it's hierarchical flatten structure.
    const int32_t siblingLevel = GetARIAOrDefaultLevel(candidateSibling);
    if (siblingLevel < level) {
      break;
    }

    // Skip subset.
    if (siblingLevel > level) {
      continue;
    }

    // If the next item in the group has calculated group information then
    // build group information for this item based on found one.
    if (siblingGroupInfo) {
      mParent = siblingGroupInfo->mParent;
      mSetSize = siblingGroupInfo->mSetSize;
      return;
    }

    mSetSize++;
  }

  if (mParent) {
    return;
  }

  roles::Role parentRole = parent->Role();
  if (ShouldReportRelations(mRole, parentRole)) {
    mParent = parent;
  }

  // ARIA tree and list can be arranged by using ARIA groups to organize levels.
  if (parentRole != roles::GROUPING) {
    return;
  }

  // Way #1 for ARIA tree (not ARIA treegrid): previous sibling of a group is a
  // parent. In other words the parent of the tree item will be a group and
  // the previous tree item of the group is a conceptual parent of the tree
  // item.
  if (mRole == roles::OUTLINEITEM) {
    // Find the relevant grandparent of the item. Use that parent as the root
    // and find the previous outline item sibling within that root.
    Accessible* grandParent = GetRelevantParent(parent);
    MOZ_ASSERT(grandParent);
    Pivot pivot{grandParent};
    CompoundWidgetSiblingRule parentSiblingRule{mRole};
    Accessible* parentPrevSibling = pivot.Prev(parent, widgetSiblingRule);
    if (parentPrevSibling && parentPrevSibling->Role() == mRole) {
      mParent = parentPrevSibling;
      return;
    }
  }

  // Way #2 for ARIA list and tree: group is a child of an item. In other words
  // the parent of the item will be a group and containing item of the group is
  // a conceptual parent of the item.
  if (mRole == roles::LISTITEM || mRole == roles::OUTLINEITEM) {
    Accessible* grandParent = GetRelevantParent(parent);
    if (grandParent && grandParent->Role() == mRole) {
      mParent = grandParent;
    }
  }
}

AccGroupInfo* AccGroupInfo::CreateGroupInfo(const Accessible* aAccessible) {
  mozilla::a11y::role role = aAccessible->Role();
  if (role != mozilla::a11y::roles::ROW &&
      role != mozilla::a11y::roles::OUTLINEITEM &&
      role != mozilla::a11y::roles::OPTION &&
      role != mozilla::a11y::roles::LISTITEM &&
      role != mozilla::a11y::roles::MENUITEM &&
      role != mozilla::a11y::roles::COMBOBOX_OPTION &&
      role != mozilla::a11y::roles::RICH_OPTION &&
      role != mozilla::a11y::roles::CHECK_RICH_OPTION &&
      role != mozilla::a11y::roles::PARENT_MENUITEM &&
      role != mozilla::a11y::roles::CHECK_MENU_ITEM &&
      role != mozilla::a11y::roles::RADIO_MENU_ITEM &&
      role != mozilla::a11y::roles::RADIOBUTTON &&
      role != mozilla::a11y::roles::PAGETAB &&
      role != mozilla::a11y::roles::COMMENT) {
    return nullptr;
  }

  AccGroupInfo* info = new AccGroupInfo(aAccessible, BaseRole(role));
  return info;
}

Accessible* AccGroupInfo::FirstItemOf(const Accessible* aContainer) {
  // ARIA tree can be arranged by ARIA groups case #1 (previous sibling of a
  // group is a parent) or by aria-level.
  a11y::role containerRole = aContainer->Role();
  Accessible* item = aContainer->NextSibling();
  if (item) {
    if (containerRole == roles::OUTLINEITEM &&
        item->Role() == roles::GROUPING) {
      item = item->FirstChild();
    }

    if (item) {
      AccGroupInfo* itemGroupInfo = item->GetOrCreateGroupInfo();
      if (itemGroupInfo && itemGroupInfo->ConceptualParent() == aContainer) {
        return item;
      }
    }
  }

  // ARIA list and tree can be arranged by ARIA groups case #2 (group is
  // a child of an item).
  item = aContainer->LastChild();
  if (!item) return nullptr;

  if (item->Role() == roles::GROUPING &&
      (containerRole == roles::LISTITEM ||
       containerRole == roles::OUTLINEITEM)) {
    item = item->FirstChild();
    if (item) {
      AccGroupInfo* itemGroupInfo = item->GetOrCreateGroupInfo();
      if (itemGroupInfo && itemGroupInfo->ConceptualParent() == aContainer) {
        return item;
      }
    }
  }

  // Otherwise, it can be a direct child if the container is a list or tree.
  item = aContainer->FirstChild();
  if (ShouldReportRelations(item->Role(), containerRole)) return item;

  return nullptr;
}

uint32_t AccGroupInfo::TotalItemCount(Accessible* aContainer,
                                      bool* aIsHierarchical) {
  uint32_t itemCount = 0;
  switch (aContainer->Role()) {
    case roles::TABLE:
      if (auto val = aContainer->GetIntARIAAttr(nsGkAtoms::aria_rowcount)) {
        if (*val >= 0) {
          return *val;
        }
      }
      if (TableAccessibleBase* tableAcc = aContainer->AsTableBase()) {
        return tableAcc->RowCount();
      }
      break;
    case roles::ROW:
      if (Accessible* table = nsAccUtils::TableFor(aContainer)) {
        if (auto val = table->GetIntARIAAttr(nsGkAtoms::aria_colcount)) {
          if (*val >= 0) {
            return *val;
          }
        }
        if (TableAccessibleBase* tableAcc = table->AsTableBase()) {
          return tableAcc->ColCount();
        }
      }
      break;
    case roles::OUTLINE:
    case roles::LIST:
    case roles::MENUBAR:
    case roles::MENUPOPUP:
    case roles::COMBOBOX:
    case roles::GROUPING:
    case roles::TREE_TABLE:
    case roles::COMBOBOX_LIST:
    case roles::LISTBOX:
    case roles::DEFINITION_LIST:
    case roles::EDITCOMBOBOX:
    case roles::RADIO_GROUP:
    case roles::PAGETABLIST: {
      Accessible* childItem = AccGroupInfo::FirstItemOf(aContainer);
      if (!childItem) {
        childItem = aContainer->FirstChild();
        if (childItem && childItem->IsTextLeaf()) {
          // First child can be a text leaf, check its sibling for an item.
          childItem = childItem->NextSibling();
        }
      }

      if (childItem) {
        GroupPos groupPos = childItem->GroupPosition();
        itemCount = groupPos.setSize;
        if (groupPos.level && aIsHierarchical) {
          *aIsHierarchical = true;
        }
      }
      break;
    }
    default:
      break;
  }

  return itemCount;
}

Accessible* AccGroupInfo::NextItemTo(Accessible* aItem) {
  AccGroupInfo* groupInfo = aItem->GetOrCreateGroupInfo();
  if (!groupInfo) return nullptr;

  // If the item in middle of the group then search next item in siblings.
  if (groupInfo->PosInSet() >= groupInfo->SetSize()) return nullptr;

  Accessible* parent = aItem->Parent();
  uint32_t childCount = parent->ChildCount();
  for (uint32_t idx = aItem->IndexInParent() + 1; idx < childCount; idx++) {
    Accessible* nextItem = parent->ChildAt(idx);
    AccGroupInfo* nextGroupInfo = nextItem->GetOrCreateGroupInfo();
    if (nextGroupInfo &&
        nextGroupInfo->ConceptualParent() == groupInfo->ConceptualParent()) {
      return nextItem;
    }
  }

  MOZ_ASSERT_UNREACHABLE(
      "Item in the middle of the group but there's no next item!");
  return nullptr;
}

size_t AccGroupInfo::SizeOfIncludingThis(MallocSizeOf aMallocSizeOf) {
  // We don't count mParent or mItem since they (should be) counted
  // as part of the document.
  return aMallocSizeOf(this);
}

bool AccGroupInfo::ShouldReportRelations(role aRole, role aParentRole) {
  // We only want to report hierarchy-based node relations for items in tree or
  // list form.  ARIA level/owns relations are always reported.
  if (aParentRole == roles::OUTLINE && aRole == roles::OUTLINEITEM) return true;
  if (aParentRole == roles::TREE_TABLE && aRole == roles::ROW) return true;
  if (aParentRole == roles::LIST && aRole == roles::LISTITEM) return true;

  return false;
}

int32_t AccGroupInfo::GetARIAOrDefaultLevel(const Accessible* aAccessible) {
  int32_t level = 0;
  aAccessible->ARIAGroupPosition(&level, nullptr, nullptr);

  if (level != 0) return level;

  return aAccessible->GetLevel(true);
}

static bool IsGenericContainer(role aRole) {
  return aRole == roles::TEXT || aRole == roles::TEXT_CONTAINER ||
         aRole == roles::SECTION;
}

static Accessible* GetRelevantParent(const Accessible* aAcc) {
  MOZ_ASSERT(aAcc);

  // Search through ancestors until we find a relevant parent, skipping generic
  // accessibles.
  Accessible* parent = aAcc->Parent();
  while (parent && IsGenericContainer(parent->Role())) {
    parent = parent->Parent();
  }
  return parent;
}

static role BaseRole(role aRole) {
  if (aRole == roles::CHECK_MENU_ITEM || aRole == roles::PARENT_MENUITEM ||
      aRole == roles::RADIO_MENU_ITEM) {
    return roles::MENUITEM;
  }

  if (aRole == roles::CHECK_RICH_OPTION) {
    return roles::RICH_OPTION;
  }

  return aRole;
}
