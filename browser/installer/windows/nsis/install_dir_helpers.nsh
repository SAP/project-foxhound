# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

!ifndef INSTALL_DIR_HELPERS_NSH
!define INSTALL_DIR_HELPERS_NSH

!macro GetRawCommandLine Result
  System::Call 'kernel32::GetCommandLineW() w .r${Result}'
!macroend
!define GetRawCommandLine "!insertmacro GetRawCommandLine"

!macro GetDArg Result
  ; /D= gets removed by NSIS from ${GetParameters} so check the raw command line
  ${GetRawCommandLine} 0
  ClearErrors
  ${GetOptions} "$0" "/D=" ${Result}
  ${If} ${Errors}
    StrCpy ${Result} ""
  ${EndIf}
!macroend
!define GetDArg "!insertmacro GetDArg"

!macro GetInstallDirectoryNameArg Result
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} "$0" "/InstallDirectoryName=" ${Result}
  ${If} ${Errors}
    StrCpy ${Result} ""
  ${EndIf}
!macroend
!define GetInstallDirectoryNameArg "!insertmacro GetInstallDirectoryNameArg"

!macro GetInstallDirectoryPathArg Result
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} "$0" "/InstallDirectoryPath=" ${Result}
  ${If} ${Errors}
    StrCpy ${Result} ""
  ${EndIf}
!macroend
!define GetInstallDirectoryPathArg "!insertmacro GetInstallDirectoryPathArg"

!macro UseExistingInstallPathIfNoInstallDirArg Path
  Push $0
  Push ${Path}
  ${GetInstallDirectoryPathArg} $0
  ${If} "$0" == ""
    ${GetInstallDirectoryNameArg} $0
    ${If} "$0" == ""
      ${GetDArg} $0
      ${If} "$0" == ""
        Exch $INSTDIR
      ${EndIf}
    ${EndIf}
  ${EndIf}
  Pop $0
  Pop $0
!macroend
!define UseExistingInstallPathIfNoInstallDirArg "!insertmacro UseExistingInstallPathIfNoInstallDirArg"

!endif
