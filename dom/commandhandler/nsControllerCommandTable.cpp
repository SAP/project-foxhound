/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsControllerCommandTable.h"

#include "mozilla/ClearOnShutdown.h"
#include "mozilla/ControllerCommand.h"
#include "mozilla/EditorController.h"
#include "mozilla/HTMLEditorController.h"
#include "mozilla/StaticPtr.h"
#include "nsGlobalWindowCommands.h"
#include "nsString.h"

using mozilla::ControllerCommand;

// this value is used to size the hash table. Just a sensible upper bound
#define NUM_COMMANDS_LENGTH 32

nsControllerCommandTable::nsControllerCommandTable()
    : mCommandsTable(NUM_COMMANDS_LENGTH) {}

nsControllerCommandTable::~nsControllerCommandTable() = default;

void nsControllerCommandTable::RegisterCommand(const nsACString& aName,
                                               ControllerCommand* aCommand) {
  MOZ_DIAGNOSTIC_ASSERT(mMutable);
  mCommandsTable.InsertOrUpdate(aName, aCommand);
}

void nsControllerCommandTable::UnregisterCommand(const nsACString& aCommandName,
                                                 ControllerCommand* aCommand) {
  MOZ_DIAGNOSTIC_ASSERT(mMutable);
  mCommandsTable.Remove(aCommandName);
}

ControllerCommand* nsControllerCommandTable::FindCommandHandler(
    const nsACString& aCommandName) const {
  return mCommandsTable.GetWeak(aCommandName);
}

bool nsControllerCommandTable::IsCommandEnabled(const nsACString& aCommandName,
                                                nsISupports* aContext) const {
  RefPtr handler = FindCommandHandler(aCommandName);
  if (!handler) {
    NS_WARNING(
        "Controller command table asked about a command that it does "
        "not handle");
    return false;
  }
  return handler->IsCommandEnabled(aCommandName, aContext);
}

void nsControllerCommandTable::GetSupportedCommands(
    nsTArray<nsCString>& aCommands) const {
  mozilla::AppendToArray(aCommands, mCommandsTable.Keys());
}

using CommandTableRegistrar = void (*)(nsControllerCommandTable*);

static nsControllerCommandTable* EnsureCommandTableWithCommands(
    mozilla::StaticRefPtr<nsControllerCommandTable>& aTable,
    CommandTableRegistrar aRegistrar) {
  if (!aTable) {
    aTable = new nsControllerCommandTable();
    aRegistrar(aTable);
    aTable->MakeImmutable();
    ClearOnShutdown(&aTable);
  }
  return aTable;
}

// static
nsControllerCommandTable* nsControllerCommandTable::EditorCommandTable() {
  static mozilla::StaticRefPtr<nsControllerCommandTable> sTable;
  return EnsureCommandTableWithCommands(
      sTable, mozilla::EditorController::RegisterEditorCommands);
}

// static
nsControllerCommandTable* nsControllerCommandTable::EditingCommandTable() {
  static mozilla::StaticRefPtr<nsControllerCommandTable> sTable;
  return EnsureCommandTableWithCommands(
      sTable, mozilla::EditorController::RegisterEditingCommands);
}

// static
nsControllerCommandTable* nsControllerCommandTable::HTMLEditorCommandTable() {
  static mozilla::StaticRefPtr<nsControllerCommandTable> sTable;
  return EnsureCommandTableWithCommands(
      sTable, mozilla::HTMLEditorController::RegisterHTMLEditorCommands);
}

// static
nsControllerCommandTable*
nsControllerCommandTable::HTMLEditorDocStateCommandTable() {
  static mozilla::StaticRefPtr<nsControllerCommandTable> sTable;
  return EnsureCommandTableWithCommands(
      sTable, mozilla::HTMLEditorController::RegisterEditorDocStateCommands);
}

// static
nsControllerCommandTable* nsControllerCommandTable::WindowCommandTable() {
  static mozilla::StaticRefPtr<nsControllerCommandTable> sTable;
  return EnsureCommandTableWithCommands(
      sTable, nsWindowCommandRegistration::RegisterWindowCommands);
}
