# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

!ifndef STUB_HELPERS_NSH
!define STUB_HELPERS_NSH

Function createProfileCleanup
  ${If} $AbortInstallation != "false"
    ; Abort in this context skips the "page"
    Abort
  ${EndIf}
  Call ShouldPromptForProfileCleanup

  ${If} $ProfileCleanupPromptType == 0
    StrCpy $CheckboxCleanupProfile 0
    Abort ; Skip this page
  ${EndIf}

  ${RegisterAllCustomFunctions}

  File /oname=$PLUGINSDIR\profile_cleanup.html "profile_cleanup.html"
  File /oname=$PLUGINSDIR\profile_cleanup_page.css "profile_cleanup_page.css"
  File /oname=$PLUGINSDIR\profile_cleanup.js "profile_cleanup.js"
  WebBrowser::ShowPage "$PLUGINSDIR\profile_cleanup.html"
FunctionEnd

!endif
