/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:expandtab:shiftwidth=2:tabstop=2:
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsTextEquivUtils.h"

#include "LocalAccessible-inl.h"
#include "AccIterator.h"
#include "CssAltContent.h"
#include "nsCoreUtils.h"
#include "mozilla/dom/ChildIterator.h"
#include "mozilla/dom/Text.h"

using namespace mozilla;
using namespace mozilla::a11y;

/**
 * The accessible for which we are computing a text equivalent. It is useful
 * for bailing out during recursive text computation, or for special cases
 * like the "Embedded Control" section of the AccName spec.
 */
static const Accessible* sInitiatorAcc = nullptr;

/*
 * Track whether we're in an aria-describedby or aria-labelledby traversal. The
 * browser should only follow those IDREFs, per the "LabelledBy" section of the
 * AccName spec, "if [...] the current node is not already part of an ongoing
 * aria-labelledby or aria-describedby traversal [...]"
 */
static bool sInAriaRelationTraversal = false;

/*
 * Track the accessibles that we've consulted so far while computing the text
 * alternative for an accessible. Per the Name From Content section of the Acc
 * Name spec, "[e]ach node in the subtree is consulted only once."
 */
static nsTHashSet<const Accessible*>& GetReferencedAccs() {
  static nsTHashSet<const Accessible*> sReferencedAccs;
  return sReferencedAccs;
}

////////////////////////////////////////////////////////////////////////////////
// nsTextEquivUtils. Public.

nsresult nsTextEquivUtils::GetNameFromSubtree(
    const LocalAccessible* aAccessible, nsAString& aName) {
  aName.Truncate();

  if (GetReferencedAccs().Contains(aAccessible)) {
    return NS_OK;
  }

  // Remember the initiating accessible so we know when we've returned to it.
  if (GetReferencedAccs().IsEmpty()) {
    sInitiatorAcc = aAccessible;
  }
  GetReferencedAccs().Insert(aAccessible);

  if (GetRoleRule(aAccessible->Role()) == eNameFromSubtreeRule) {
    // XXX: is it necessary to care the accessible is not a document?
    if (aAccessible->IsContent()) {
      nsAutoString name;
      AppendFromAccessibleChildren(aAccessible, &name);
      name.CompressWhitespace();
      if (!nsCoreUtils::IsWhitespaceString(name)) aName = name;
    }
  }

  // Once the text alternative computation is complete (i.e., once we've
  // returned to the initiator acc), clear out the referenced accessibles and
  // reset the initiator acc.
  if (aAccessible == sInitiatorAcc) {
    GetReferencedAccs().Clear();
    sInitiatorAcc = nullptr;
  }

  return NS_OK;
}

nsresult nsTextEquivUtils::GetTextEquivFromIDRefs(
    const LocalAccessible* aAccessible, nsAtom* aIDRefsAttr,
    nsAString& aTextEquiv) {
  // If this is an aria-labelledby or aria-describedby traversal and we're
  // already in such a traversal, or if we've already consulted the given
  // accessible, early out.
  const bool isAriaTraversal = aIDRefsAttr == nsGkAtoms::aria_labelledby ||
                               aIDRefsAttr == nsGkAtoms::aria_describedby;
  if ((sInAriaRelationTraversal && isAriaTraversal) ||
      GetReferencedAccs().Contains(aAccessible)) {
    return NS_OK;
  }

  aTextEquiv.Truncate();

  nsIContent* content = aAccessible->GetContent();
  if (!content) return NS_OK;

  nsIContent* refContent = nullptr;
  IDRefsIterator iter(aAccessible->Document(), content, aIDRefsAttr);
  while ((refContent = iter.NextElem())) {
    if (!aTextEquiv.IsEmpty()) aTextEquiv += ' ';

    // Note that we're in an aria-labelledby or aria-describedby traversal.
    if (isAriaTraversal) {
      sInAriaRelationTraversal = true;
    }

    // Reset the aria-labelledby / aria-describedby traversal tracking when we
    // exit. Reset on scope exit because NS_ENSURE_SUCCESS may return.
    auto onExit = MakeScopeExit([isAriaTraversal]() {
      if (isAriaTraversal) {
        sInAriaRelationTraversal = false;
      }
    });
    nsresult rv =
        AppendTextEquivFromContent(aAccessible, refContent, &aTextEquiv);
    NS_ENSURE_SUCCESS(rv, rv);
  }

  return NS_OK;
}

nsresult nsTextEquivUtils::AppendTextEquivFromContent(
    const LocalAccessible* aInitiatorAcc, nsIContent* aContent,
    nsAString* aString) {
  // Prevent recursion which can cause infinite loops.
  LocalAccessible* accessible =
      aInitiatorAcc->Document()->GetAccessible(aContent);
  if (GetReferencedAccs().Contains(aInitiatorAcc) ||
      GetReferencedAccs().Contains(accessible)) {
    return NS_OK;
  }

  // Remember the initiating accessible so we know when we've returned to it.
  if (GetReferencedAccs().IsEmpty()) {
    sInitiatorAcc = aInitiatorAcc;
  }
  GetReferencedAccs().Insert(aInitiatorAcc);

  nsresult rv = NS_ERROR_FAILURE;
  if (accessible) {
    rv = AppendFromAccessible(accessible, aString);
    GetReferencedAccs().Insert(accessible);
  } else {
    // The given content is invisible or otherwise inaccessible, so use the DOM
    // subtree.
    rv = AppendFromDOMNode(aContent, aString);
  }

  // Once the text alternative computation is complete (i.e., once we've
  // returned to the initiator acc), clear out the referenced accessibles and
  // reset the initiator acc.
  if (aInitiatorAcc == sInitiatorAcc) {
    GetReferencedAccs().Clear();
    sInitiatorAcc = nullptr;
  }
  return rv;
}

nsresult nsTextEquivUtils::AppendTextEquivFromTextContent(nsIContent* aContent,
                                                          nsAString* aString) {
  if (aContent->IsText()) {
    if (aContent->TextLength() > 0) {
      nsIFrame* frame = aContent->GetPrimaryFrame();
      if (frame) {
        if (auto cssAlt = CssAltContent(aContent)) {
          cssAlt.AppendToString(*aString);
        } else {
          nsIFrame::RenderedText text = frame->GetRenderedText(
              0, UINT32_MAX, nsIFrame::TextOffsetType::OffsetsInContentText,
              nsIFrame::TrailingWhitespace::DontTrim);
          aString->Append(text.mString);
        }
      } else {
        // If aContent is an object that is display: none, we have no a frame.
        aContent->GetAsText()->AppendTextTo(*aString);
      }
    }

    return NS_OK;
  }

  if (aContent->IsHTMLElement() &&
      aContent->NodeInfo()->Equals(nsGkAtoms::br)) {
    aString->AppendLiteral("\r\n");
    return NS_OK;
  }

  return NS_OK_NO_NAME_CLAUSE_HANDLED;
}

nsresult nsTextEquivUtils::AppendFromDOMChildren(nsIContent* aContent,
                                                 nsAString* aString) {
  auto iter =
      dom::AllChildrenIterator(aContent, nsIContent::eAllChildren, true);
  while (nsIContent* childContent = iter.GetNextChild()) {
    nsresult rv = AppendFromDOMNode(childContent, aString);
    NS_ENSURE_SUCCESS(rv, rv);
  }

  return NS_OK;
}

////////////////////////////////////////////////////////////////////////////////
// nsTextEquivUtils. Private.

nsresult nsTextEquivUtils::AppendFromAccessibleChildren(
    const Accessible* aAccessible, nsAString* aString) {
  nsresult rv = NS_OK_NO_NAME_CLAUSE_HANDLED;

  uint32_t childCount = aAccessible->ChildCount();
  for (uint32_t childIdx = 0; childIdx < childCount; childIdx++) {
    Accessible* child = aAccessible->ChildAt(childIdx);
    // If we've already consulted this child, don't consult it again.
    if (GetReferencedAccs().Contains(child)) {
      continue;
    }
    rv = AppendFromAccessible(child, aString);
    NS_ENSURE_SUCCESS(rv, rv);
  }

  return rv;
}

nsresult nsTextEquivUtils::AppendFromAccessible(Accessible* aAccessible,
                                                nsAString* aString) {
  // XXX: is it necessary to care the accessible is not a document?
  bool isHTMLBlock = false;
  if (aAccessible->IsLocal() && aAccessible->AsLocal()->IsContent()) {
    nsIContent* content = aAccessible->AsLocal()->GetContent();
    nsresult rv = AppendTextEquivFromTextContent(content, aString);
    if (rv != NS_OK_NO_NAME_CLAUSE_HANDLED) return rv;
    if (!content->IsText()) {
      nsIFrame* frame = content->GetPrimaryFrame();
      if (frame) {
        // If this is a block level frame (as opposed to span level), we need to
        // add spaces around that block's text, so we don't get words jammed
        // together in final name.
        const nsStyleDisplay* display = frame->StyleDisplay();
        if (display->IsBlockOutsideStyle() ||
            display->mDisplay == StyleDisplay::InlineBlock ||
            display->mDisplay == StyleDisplay::TableCell) {
          isHTMLBlock = true;
          if (!aString->IsEmpty()) {
            aString->Append(char16_t(' '));
          }
        }
      }
    }
  }

  bool isEmptyTextEquiv = true;

  // Attempt to find the value. If it's non-empty, append and return it. See the
  // "Embedded Control" section of the name spec.
  nsAutoString val;
  nsresult rv = AppendFromValue(aAccessible, &val);
  NS_ENSURE_SUCCESS(rv, rv);
  if (rv == NS_OK) {
    AppendString(aString, val);
    return NS_OK;
  }

  // If the name is from tooltip, we retrieve it now but only append it to the
  // result string later as a last resort. Otherwise, we append the name now.
  nsAutoString text;
  if (aAccessible->Name(text) != eNameFromTooltip) {
    isEmptyTextEquiv = !AppendString(aString, text);
  }

  // Implementation of the "Name From Content" step of the text alternative
  // computation guide. Traverse the accessible's subtree if allowed.
  if (isEmptyTextEquiv) {
    if (ShouldIncludeInSubtreeCalculation(aAccessible)) {
      rv = AppendFromAccessibleChildren(aAccessible, aString);
      NS_ENSURE_SUCCESS(rv, rv);

      if (rv != NS_OK_NO_NAME_CLAUSE_HANDLED) isEmptyTextEquiv = false;
    }
  }

  // Implementation of the "Tooltip" step
  if (isEmptyTextEquiv && !text.IsEmpty()) {
    AppendString(aString, text);
    if (isHTMLBlock) {
      aString->Append(char16_t(' '));
    }
    return NS_OK;
  }

  if (!isEmptyTextEquiv && isHTMLBlock) {
    aString->Append(char16_t(' '));
  }
  return rv;
}

nsresult nsTextEquivUtils::AppendFromValue(Accessible* aAccessible,
                                           nsAString* aString) {
  if (GetRoleRule(aAccessible->Role()) != eNameFromValueRule) {
    return NS_OK_NO_NAME_CLAUSE_HANDLED;
  }

  // Implementation of the "Embedded Control" step of the text alternative
  // computation. If the given accessible is not the root accessible (the
  // accessible the text alternative is computed for in the end) then append the
  // accessible value.
  if (aAccessible == sInitiatorAcc) {
    return NS_OK_NO_NAME_CLAUSE_HANDLED;
  }

  // For listboxes in non-initiator computations, we need to get the selected
  // item and append its text alternative.
  nsAutoString text;
  if (aAccessible->IsListControl()) {
    Accessible* selected = aAccessible->GetSelectedItem(0);
    if (selected) {
      nsresult rv = AppendFromAccessible(selected, &text);
      NS_ENSURE_SUCCESS(rv, rv);
      return AppendString(aString, text) ? NS_OK : NS_OK_NO_NAME_CLAUSE_HANDLED;
    }
    return NS_ERROR_FAILURE;
  }

  // For other accessibles, get the value directly.
  aAccessible->Value(text);

  return AppendString(aString, text) ? NS_OK : NS_OK_NO_NAME_CLAUSE_HANDLED;
}

nsresult nsTextEquivUtils::AppendFromDOMNode(nsIContent* aContent,
                                             nsAString* aString) {
  nsresult rv = AppendTextEquivFromTextContent(aContent, aString);
  NS_ENSURE_SUCCESS(rv, rv);

  if (rv != NS_OK_NO_NAME_CLAUSE_HANDLED) return NS_OK;

  if (aContent->IsAnyOfHTMLElements(nsGkAtoms::script, nsGkAtoms::style)) {
    // The text within these elements is never meant for users.
    return NS_OK;
  }

  if (aContent->IsXULElement()) {
    nsAutoString textEquivalent;
    if (aContent->NodeInfo()->Equals(nsGkAtoms::label, kNameSpaceID_XUL)) {
      aContent->AsElement()->GetAttr(nsGkAtoms::value, textEquivalent);
    } else {
      aContent->AsElement()->GetAttr(nsGkAtoms::label, textEquivalent);
    }

    if (textEquivalent.IsEmpty()) {
      aContent->AsElement()->GetAttr(nsGkAtoms::tooltiptext, textEquivalent);
    }

    AppendString(aString, textEquivalent);
  }

  return AppendFromDOMChildren(aContent, aString);
}

bool nsTextEquivUtils::AppendString(nsAString* aString,
                                    const nsAString& aTextEquivalent) {
  if (aTextEquivalent.IsEmpty()) return false;

  // Insert spaces to insure that words from controls aren't jammed together.
  if (!aString->IsEmpty() && !nsCoreUtils::IsWhitespace(aString->Last())) {
    aString->Append(char16_t(' '));
  }

  aString->Append(aTextEquivalent);

  if (!nsCoreUtils::IsWhitespace(aString->Last())) {
    aString->Append(char16_t(' '));
  }

  return true;
}

uint32_t nsTextEquivUtils::GetRoleRule(role aRole) {
#define ROLE(geckoRole, stringRole, ariaRole, atkRole, macRole, macSubrole, \
             msaaRole, ia2Role, androidClass, iosIsElement, uiaControlType, \
             nameRule)                                                      \
  case roles::geckoRole:                                                    \
    return nameRule;

  switch (aRole) {
#include "RoleMap.h"
    default:
      MOZ_CRASH("Unknown role.");
  }

#undef ROLE
}

bool nsTextEquivUtils::ShouldIncludeInSubtreeCalculation(
    Accessible* aAccessible) {
  uint32_t nameRule = GetRoleRule(aAccessible->Role());
  if (nameRule == eNameFromSubtreeRule) {
    return true;
  }
  if (!(nameRule & eNameFromSubtreeIfReqRule)) {
    return false;
  }

  if (aAccessible == sInitiatorAcc) {
    // We're calculating the text equivalent for this accessible, but this
    // accessible should only be included when calculating the text equivalent
    // for something else.
    return false;
  }

  // sInitiatorAcc can be null when, for example, LocalAccessible::Value calls
  // GetTextEquivFromSubtree.
  role initiatorRole = sInitiatorAcc ? sInitiatorAcc->Role() : roles::NOTHING;
  if (initiatorRole == roles::OUTLINEITEM &&
      aAccessible->Role() == roles::GROUPING) {
    // Child treeitems are contained in a group. We don't want to include those
    // in the parent treeitem's text equivalent.
    return false;
  }

  return true;
}

bool nsTextEquivUtils::IsWhitespaceLeaf(Accessible* aAccessible) {
  if (!aAccessible || !aAccessible->IsTextLeaf()) {
    return false;
  }

  nsAutoString name;
  aAccessible->Name(name);
  return nsCoreUtils::IsWhitespaceString(name);
}
