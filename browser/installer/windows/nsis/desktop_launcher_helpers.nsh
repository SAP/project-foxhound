# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

!ifndef DESKTOP_LAUNCHER_HELPERS_NSH
!define DESKTOP_LAUNCHER_HELPERS_NSH

; Looks at installation_telemetry.json to determine whether the installation
; was installed by the stub installer or not.
;
; Expects the JSON file on the stack as a parameter; will return the
; installation type from the JSON file, generally either "stub" or "full".
; On failure, pushes "unknown".
Function GetInstallationType
  Exch $1 ; directory
  Push $0 ; temporary variable

  nsJSON::Set /file /unicode "$1"
  nsJSON::Get /type `installer_type` /end

  Pop $0
  ${If} $0 == ""
    ; It's only ever written as UTF-16, but decode it as ANSI for redundancy.
    nsJSON::Set /file "$1"
    nsJSON::Get /type `installer_type` /end
    Pop $0 ; type
  ${EndIf}

  ClearErrors
  StrCpy $1 "unknown"
  ${If} $0 == "string"
    nsJSON::Get `installer_type` /end
    ${IfNot} ${Errors}
      ; get the actual installer type from the file
      Pop $1
    ${EndIf}
  ${EndIf}

  Exch
  Pop $0
  Exch $1
  ClearErrors
FunctionEnd

!endif

Function GetInstallationTelemetryFromMsi
  Pop $0
  ClearErrors

  nsJSON::Set /file /unicode "$0"
  ${If} ${Errors}
    SetErrors
    Push 0
    Return
  ${EndIf}

  nsJSON::Get /type `from_msi` /end
  ${If} ${Errors}
    SetErrors
    Push 0
    Return
  ${EndIf}

  Pop $1
  ${If} $1 != "value"
    SetErrors
    Push 0
    Return
  ${EndIf}

  nsJSON::Get `from_msi` /end
  ${If} ${Errors}
    SetErrors
    Push 0
    Return
  ${EndIf}

  Pop $1
  ${If} $1 == "true"
    Push 1
  ${ElseIf} $1 == "false"
    Push 0
  ${Else}
    SetErrors
    Push 0
  ${EndIf}
FunctionEnd

Function IsUpdateChannelEsr
  Exch $0
  ${If} $0 == "esr"
    StrCpy $0 1
  ${Else}
    StrCpy $0 0
  ${EndIf}
  Exch $0
FunctionEnd

Function ShouldInstallDesktopLauncher
  Push $0
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} "$0" "/DesktopLauncher" "$0"
  ${IfNot} ${Errors}
    StrCpy $0 1
  ${Else}
    StrCpy $0 0
  ${EndIf}
  Exch $0
FunctionEnd
