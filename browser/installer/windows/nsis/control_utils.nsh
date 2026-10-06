# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

!ifndef CONTROL_UTILS_NSH
!define CONTROL_UTILS_NSH

; This is needed because NSIS's SetShellVarContext doesn't allow
; you to specify shell var context as a variable. C'est la vie.
!macro SetShellVarContextToValue CTX_VALUE
    ${If} ${CTX_VALUE} == "all"
        SetShellVarContext all
    ${ElseIf} ${CTX_VALUE} == "current"
        SetShellVarContext current
    ${Else}
        SetErrors
    ${EndIf}
!macroend
!define SetShellVarContextToValue "!insertmacro SetShellVarContextToValue"


; Switch to a different shell var context, returning the previous shell
; var context.
; Params:
;  IN: the shell var context to switch to
;  OUT: the previous shell var context
!macro SwapShellVarContext IN OUT
     ${If} ${ShellVarContextAll}
        StrCpy ${OUT} "all"
    ${Else}
        StrCpy ${OUT} "current"
    ${EndIf}

    ${SetShellVarContextToValue} ${IN}
!macroend
!define SwapShellVarContext "!insertmacro SwapShellVarContext"

!endif
