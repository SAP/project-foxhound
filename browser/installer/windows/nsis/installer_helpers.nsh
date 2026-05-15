# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

!ifndef INSTALLER_HELPERS_NSH
!define INSTALLER_HELPERS_NSH

!include control_utils.nsh

; For new installs, install desktop launcher
; TODO: This case needs more nuance. To be fixed as part of Bug 1981597
Function OnInstallDesktopLauncherHandler
  Push $0
  ${SwapShellVarContext} current $0
  Call InstallDesktopLauncher
  ${SetShellVarContextToValue} $0
  Pop $0
FunctionEnd

!endif
