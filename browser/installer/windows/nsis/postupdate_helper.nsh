# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

!include "LogicLib.nsh"

!define buildNumWin10 10240 ; First Win10 version

; Depending on the installation type (as admin or not) we have different
; default installation directories, one of which we push onto the stack as the
; return value.
Function getDefaultInstallDir
    Push $1 ; save $1 to restore it later
    UserInfo::GetAccountType
    Pop $1
    ${If} $1 == "User"
        ${GetLocalAppDataFolder} $1
        StrCpy $1 "$1\${BrandFullName}\"
        Push $1
    ${Else}
        !ifdef HAVE_64BIT_BUILD
            Push "$PROGRAMFILES64\${BrandFullName}\"
        !else
            Push "$PROGRAMFILES32\${BrandFullName}\"
        !endif
    ${EndIf}
    Exch
    Pop $1 ; restore $1
FunctionEnd

; This function expects the topmost element of the stack to be the path to be
; normalized. It returns one of:
;   a) the resolved path with a maximum length of 1000 chars.
;   b) the string '[!] GetFullPathNameW: Insufficient buffer memory.' (error case)
;   c) the string '[!] GetFullPathNameW: Unknown error.' (should never happen)
;
; In all error cases (b, c) this function uses SetError to enable checks like:
;   ${If} ${Errors}
;   Pop $ErrorMessage
;   ${EndIf}
; This means that after calling this function it always returns a string value
; on the stack.
Function getNormalizedPath
  Exch $0 ; Equivalent to: Push $0, Exch, Pop $0
  Push $1
  Push $2

  ; MAX_PATH defines a 260-character limit, but GetFullPathNameW can handle
  ; paths up to 32767 characters when using the "\\?\" prefix. Since NSIS
  ; registers are limited to 1024 bytes, we allow path length up to 1000 chars
  ; and leave 23 headroom for testing purposes.
  System::Call 'kernel32::GetFullPathNameW(w r0, i 1000, w .r1, i0) i .r2'
  # Check if return value in $0 is 0 (error)
  ${If} $2 == 0
    StrCpy $0 "[!] GetFullPathNameW: Unknown error."
    SetErrors
  ${OrIf} $2 >= 1000
    StrCpy $0 "[!] GetFullPathNameW: Insufficient buffer memory."
    SetErrors
  ${Else}
    StrCpy $0 $1
  ${EndIf}

  ; Restore the variables from the stack.
  Pop $2
  Pop $1

  ; Return the result on the stack and restore $0
  Exch $0
FunctionEnd

; This function takes no arguments and returns the name of the legacy uninstall
; key stored on the stack.
Function getLegacyUninstallKey
  Push $0

  ; $0 is used as the return value for this function. It is initially set to
  ; the Uninstall key, which has been standard for decades.
  StrCpy $0 "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BrandFullNameInternal} ${AppVersion}"
  ${WordFind} "${UpdateChannel}" "esr" "E#" $1
  ${IfNot} ${Errors}
    StrCpy $0 "$0 ESR"
  ${EndIf}
  StrCpy $0 "$0 (${ARCH} ${AB_CD})"

  Exch $0
FunctionEnd

; This function returns the uninstallation key used for installing applications
; in their default directory on the stack.
Function getModernUninstallKey
  Push "Software\Microsoft\Windows\CurrentVersion\Uninstall\${BrandFullNameInternal}"
FunctionEnd

; This function checks for a registry key under HKEY_LOCAL_MACHINE with a
; matching installation directory to $INSTDIR or an empty string if no matching
; installation is found.
Function findUninstallKey
  Push $0
  Push $1
  Push $2

  ${GetLongPath} "$INSTDIR" $2

  Call getLegacyUninstallKey
  Pop $0
  ReadRegStr $1 "HKLM" $0 "InstallLocation"
  ${If} $1 != $2
    Call getModernUninstallKey
    Pop $0
    ReadRegStr $1 "HKLM" $0 "InstallLocation"
    ${If} $1 != $2
      StrCpy $0 ""
    ${EndIf}
  ${EndIf}

  Pop $2
  Pop $1
  Exch $0
FunctionEnd

; This function expects the Windows build number as a parameter from the stack.
; It Returns the appropriate uninstall registry key on the stack.
Function getUninstallKey
  Exch $3 ; Equivalent to: Push $3, Exch, Pop $3
  Push $0
  Push $1
  Push $2

  Call getLegacyUninstallKey
  Pop $0

  ${If} $3 >= ${buildNumWin10}
    ClearErrors

    ; Determine the path to the user configured target directory.
    Push "$INSTDIR\"
    Call getNormalizedPath
    Pop $2 ; contains the absolute path to the $INSTDIR (user definable) now.

    ; Determine the absolute path of the default installation directory
    Call getDefaultInstallDir ; pushes the default directory on the stack
    Call getNormalizedPath
    Pop $1 ; contains the absolute path to the default directory now.

    ${IfNot} ${Errors}
    ${AndIf} "$1" == "$2"
      ; The default path and target path matched.
      Call getModernUninstallKey
      Pop $0
      DetailPrint "Default installation detected."
    ${EndIf}
  ${EndIf}

  StrCpy $3 $0
  Pop $2
  Pop $1
  Pop $0
  ; Return the result on the stack and restore $0
  Exch $3
FunctionEnd
