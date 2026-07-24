/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_ControllerCommand_h_
#define mozilla_ControllerCommand_h_

#include "mozilla/Attributes.h"
#include "nsISupportsImpl.h"
#include "nsStringFwd.h"
class nsISupports;
class nsICommandParams;

namespace mozilla {

class ControllerCommand {
  NS_INLINE_DECL_REFCOUNTING(ControllerCommand);

  /**
   * Returns true if the command is currently enabled. An nsIControllerCommand
   * can implement more than one commands; say, a group of related commands
   * (e.g. delete left/delete right). Because of this, the command name is
   * passed to each method.
   *
   * @param aCommandName  the name of the command for which we want the enabled
   *                      state.
   * @param aCommandContext    a cookie held by the nsIControllerCommandTable,
   *                  allowing the command to get some context information.
   *                  The contents of this cookie are implementation-defined.
   */
  virtual bool IsCommandEnabled(const nsACString& aCommandName,
                                nsISupports* aCommandContext) = 0;
  virtual void GetCommandStateParams(const nsACString& aCommandName,
                                     nsICommandParams*,
                                     nsISupports* aCommandContext) = 0;

  /**
   * Execute the name command.
   *
   * @param aCommandName  the name of the command to execute.
   *
   * @param aCommandParams the command parameters or null.
   * @param aCommandContext    a cookie held by the nsIControllerCommandTable,
   *                  allowing the command to get some context information.
   *                  The contents of this cookie are implementation-defined.
   */
  MOZ_CAN_RUN_SCRIPT
  virtual nsresult DoCommand(const nsACString& aCommandName,
                             nsICommandParams* aParams,
                             nsISupports* aCommandContext) = 0;

 protected:
  virtual ~ControllerCommand() = default;
};

#define DECL_CONTROLLER_COMMAND                                          \
  bool IsCommandEnabled(const nsACString&, nsISupports*) override;       \
  void GetCommandStateParams(const nsACString&, nsICommandParams*,       \
                             nsISupports*) override;                     \
  MOZ_CAN_RUN_SCRIPT                                                     \
  nsresult DoCommand(const nsACString&, nsICommandParams*, nsISupports*) \
      override;

#define DECL_CONTROLLER_COMMAND_NO_PARAMS                                \
  bool IsCommandEnabled(const nsACString&, nsISupports*) override;       \
  void GetCommandStateParams(const nsACString&, nsICommandParams*,       \
                             nsISupports*) override {}                   \
  MOZ_CAN_RUN_SCRIPT                                                     \
  nsresult DoCommand(const nsACString&, nsICommandParams*, nsISupports*) \
      override;

}  // namespace mozilla

#endif
