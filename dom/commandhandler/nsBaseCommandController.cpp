/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsBaseCommandController.h"

#include "mozilla/ControllerCommand.h"
#include "nsControllerCommandTable.h"
#include "nsIWeakReferenceUtils.h"
#include "nsString.h"

NS_IMPL_ISUPPORTS(nsBaseCommandController, nsIController, nsICommandController,
                  nsBaseCommandController);

nsBaseCommandController::nsBaseCommandController(
    nsControllerCommandTable* aControllerCommandTable)
    : mCommandTable(aControllerCommandTable) {}

nsBaseCommandController::~nsBaseCommandController() = default;

/* =======================================================================
 * nsIController
 * ======================================================================= */

NS_IMETHODIMP
nsBaseCommandController::IsCommandEnabled(const char* aCommand, bool* aResult) {
  NS_ENSURE_ARG_POINTER(aCommand);
  NS_ENSURE_ARG_POINTER(aResult);
  NS_ENSURE_STATE(mCommandTable);
  nsCOMPtr<nsISupports> context = do_QueryReferent(mContext);
  *aResult =
      mCommandTable->IsCommandEnabled(nsDependentCString(aCommand), context);
  return NS_OK;
}

NS_IMETHODIMP
nsBaseCommandController::SupportsCommand(const char* aCommand, bool* aResult) {
  NS_ENSURE_ARG_POINTER(aCommand);
  NS_ENSURE_ARG_POINTER(aResult);
  NS_ENSURE_STATE(mCommandTable);
  *aResult = mCommandTable->SupportsCommand(nsDependentCString(aCommand));
  return NS_OK;
}

NS_IMETHODIMP
nsBaseCommandController::DoCommand(const char* aCommand) {
  NS_ENSURE_ARG_POINTER(aCommand);
  NS_ENSURE_STATE(mCommandTable);

  nsCOMPtr<nsISupports> context = do_QueryReferent(mContext);
  RefPtr<nsControllerCommandTable> table = mCommandTable;
  nsDependentCString command(aCommand);
  if (RefPtr handler = table->FindCommandHandler(command)) {
    return handler->DoCommand(command, nullptr, context);
  }
  return NS_OK;
}

NS_IMETHODIMP
nsBaseCommandController::DoCommandWithParams(const char* aCommand,
                                             nsICommandParams* aParams) {
  NS_ENSURE_ARG_POINTER(aCommand);
  NS_ENSURE_STATE(mCommandTable);

  nsCOMPtr<nsISupports> context = do_QueryReferent(mContext);
  RefPtr<nsControllerCommandTable> table = mCommandTable;
  nsDependentCString command(aCommand);
  if (RefPtr handler = table->FindCommandHandler(command)) {
    handler->DoCommand(command, aParams, context);
  }
  return NS_OK;
}

NS_IMETHODIMP
nsBaseCommandController::GetCommandStateWithParams(const char* aCommand,
                                                   nsICommandParams* aParams) {
  NS_ENSURE_ARG_POINTER(aCommand);
  NS_ENSURE_STATE(mCommandTable);

  nsCOMPtr<nsISupports> context = do_QueryReferent(mContext);
  nsDependentCString command(aCommand);
  if (RefPtr handler = mCommandTable->FindCommandHandler(command)) {
    handler->GetCommandStateParams(command, aParams, context);
  }
  return NS_OK;
}

NS_IMETHODIMP
nsBaseCommandController::OnEvent(const char* aEventName) {
  NS_ENSURE_ARG_POINTER(aEventName);
  return NS_OK;
}

NS_IMETHODIMP
nsBaseCommandController::GetSupportedCommands(nsTArray<nsCString>& aCommands) {
  NS_ENSURE_STATE(mCommandTable);
  mCommandTable->GetSupportedCommands(aCommands);
  return NS_OK;
}

already_AddRefed<nsBaseCommandController>
nsBaseCommandController::CreateWindowController() {
  return mozilla::MakeAndAddRef<nsBaseCommandController>(
      nsControllerCommandTable::WindowCommandTable());
}

already_AddRefed<nsBaseCommandController>
nsBaseCommandController::CreateEditorController() {
  return mozilla::MakeAndAddRef<nsBaseCommandController>(
      nsControllerCommandTable::EditorCommandTable());
}

already_AddRefed<nsBaseCommandController>
nsBaseCommandController::CreateEditingController() {
  return mozilla::MakeAndAddRef<nsBaseCommandController>(
      nsControllerCommandTable::EditingCommandTable());
}

already_AddRefed<nsBaseCommandController>
nsBaseCommandController::CreateHTMLEditorController() {
  return mozilla::MakeAndAddRef<nsBaseCommandController>(
      nsControllerCommandTable::HTMLEditorCommandTable());
}

already_AddRefed<nsBaseCommandController>
nsBaseCommandController::CreateHTMLEditorDocStateController() {
  return mozilla::MakeAndAddRef<nsBaseCommandController>(
      nsControllerCommandTable::HTMLEditorDocStateCommandTable());
}
