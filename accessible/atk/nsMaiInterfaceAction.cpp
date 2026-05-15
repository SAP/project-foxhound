/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "InterfaceInitFuncs.h"

#include "LocalAccessible-inl.h"
#include "nsMai.h"
#include "mozilla/Likely.h"
#include "nsAccessibilityService.h"
#include "Relation.h"
#include "RemoteAccessible.h"
#include "nsString.h"

using namespace mozilla;
using namespace mozilla::a11y;

extern "C" {

static gboolean doActionCB(AtkAction* aAction, gint aActionIndex) {
  AtkObject* atkObject = ATK_OBJECT(aAction);
  Accessible* acc = GetInternalObj(atkObject);
  if (!acc) {
    // If we don't have an Accessible, we can't have any actions.
    return false;
  }

  if (aActionIndex < acc->ActionCount()) {
    acc->DoAction(aActionIndex);
    return true;
  }

  // Check for custom actions.
  Relation customActions(acc->RelationByType(RelationType::ACTION));
  gint actionIndex = acc->ActionCount();
  while (Accessible* target = customActions.Next()) {
    if (target->HasPrimaryAction()) {
      MOZ_ASSERT(target->ActionCount() > 0);
      if (actionIndex == aActionIndex) {
        target->DoAction(0);
        return true;
      }
      actionIndex++;
    }
  }

  return false;
}

static gint getActionCountCB(AtkAction* aAction) {
  AtkObject* atkObject = ATK_OBJECT(aAction);
  Accessible* acc = GetInternalObj(atkObject);
  if (!acc) {
    // If we don't have an Accessible, we can't have any actions.
    return 0;
  }

  gint actionCount = acc->ActionCount();
  Relation customActions(acc->RelationByType(RelationType::ACTION));
  while (Accessible* target = customActions.Next()) {
    if (target->HasPrimaryAction()) {
      actionCount++;
    }
  }

  return actionCount;
}

static const gchar* getActionDescriptionCB(AtkAction* aAction,
                                           gint aActionIndex) {
  AtkObject* atkObject = ATK_OBJECT(aAction);
  nsAutoString description;
  Accessible* acc = GetInternalObj(atkObject);
  if (!acc) {
    // If we don't have an Accessible, we can't have any actions.
    return 0;
  }

  if (aActionIndex < acc->ActionCount()) {
    acc->ActionDescriptionAt(aActionIndex, description);
  } else {
    // Check for custom actions.
    Relation customActions(acc->RelationByType(RelationType::ACTION));
    gint actionIndex = acc->ActionCount();
    while (Accessible* target = customActions.Next()) {
      if (target->HasPrimaryAction()) {
        MOZ_ASSERT(target->ActionCount() > 0);
        if (actionIndex == aActionIndex) {
          // Use target's name as action description.
          target->Name(description);
          break;
        }
        actionIndex++;
      }
    }
  }

  if (!description.IsEmpty()) {
    return AccessibleWrap::ReturnString(description);
  }

  return nullptr;
}

static const gchar* getActionNameCB(AtkAction* aAction, gint aActionIndex) {
  AtkObject* atkObject = ATK_OBJECT(aAction);
  nsAutoString name;
  Accessible* acc = GetInternalObj(atkObject);
  if (!acc) {
    // If we don't have an Accessible, we can't have any actions.
    return 0;
  }

  if (aActionIndex < acc->ActionCount()) {
    acc->ActionNameAt(aActionIndex, name);
  } else {
    // Check for custom actions.
    Relation customActions(acc->RelationByType(RelationType::ACTION));
    gint actionIndex = acc->ActionCount();
    while (Accessible* target = customActions.Next()) {
      if (target->HasPrimaryAction()) {
        MOZ_ASSERT(target->ActionCount() > 0);
        if (actionIndex == aActionIndex) {
          name.AssignLiteral("custom");
          nsAutoString domNodeId;
          target->DOMNodeID(domNodeId);
          if (!domNodeId.IsEmpty()) {
            name.AppendPrintf("_%s", NS_ConvertUTF16toUTF8(domNodeId).get());
          }
          break;
        }
        actionIndex++;
      }
    }
  }

  if (!name.IsEmpty()) {
    return AccessibleWrap::ReturnString(name);
  }

  return nullptr;
}

static const gchar* getActionLocalizedNameCB(AtkAction* aAction,
                                             gint aActionIndex) {
  // Mirror action description into localized name.
  return getActionDescriptionCB(aAction, aActionIndex);
}

static const gchar* getKeyBindingCB(AtkAction* aAction, gint aActionIndex) {
  Accessible* acc = GetInternalObj(ATK_OBJECT(aAction));
  if (!acc) {
    return nullptr;
  }
  nsAutoString keyBindingsStr;
  AccessibleWrap::GetKeyBinding(acc, keyBindingsStr);

  return AccessibleWrap::ReturnString(keyBindingsStr);
}
}

void actionInterfaceInitCB(AtkActionIface* aIface) {
  NS_ASSERTION(aIface, "Invalid aIface");
  if (MOZ_UNLIKELY(!aIface)) return;

  aIface->do_action = doActionCB;
  aIface->get_n_actions = getActionCountCB;
  aIface->get_description = getActionDescriptionCB;
  aIface->get_keybinding = getKeyBindingCB;
  aIface->get_name = getActionNameCB;
  aIface->get_localized_name = getActionLocalizedNameCB;
}
