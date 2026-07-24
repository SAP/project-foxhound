Unicode true

OutFile "setup-stub.exe"

; On real installer executables, test breakpoint checks are no-ops.
; See test_stub.nsi for the test version of this macro.
!macro IsTestBreakpointSet breakpointNumber
!macroend

Icon "firefox64.ico"
PEAddResource "firefox64.ico" "#Icon" "#0007"
!define ICON_ID 0x0007

!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "TextFunc.nsh"
!include "WinVer.nsh"
!include "WordFunc.nsh"

!include "stub_shared_defs.nsh"

Function CheckCpuSupportsSSE
  ; Don't install on systems that don't support SSE2. The parameter value of
  ; 10 is for PF_XMMI64_INSTRUCTIONS_AVAILABLE which will check whether the
  ; SSE2 instruction set is available.
  System::Call "kernel32::IsProcessorFeaturePresent(i 10)i .R7"
  StrCpy $CpuSupportsSSE "$R7"
FunctionEnd

!include "stub.nsh"
!include stub_helpers.nsh

Page custom createProfileCleanup
Page custom createInstall ; Download / Installation page
Page instfiles

Function CanWrite
  StrCpy $CanWriteToInstallDir "false"

  StrCpy $0 "$INSTDIR"
  ; Use the existing directory when it exists
  ${Unless} ${FileExists} "$INSTDIR"
    ; Get the topmost directory that exists for new installs
    ${DoUntil} ${FileExists} "$0"
      ${GetParent} "$0" $0
      ${If} "$0" == ""
        Return
      ${EndIf}
    ${Loop}
  ${EndUnless}

  GetTempFileName $2 "$0"
  Delete $2
  CreateDirectory "$2"

  ${If} ${FileExists} "$2"
    ${If} ${FileExists} "$INSTDIR"
      GetTempFileName $3 "$INSTDIR"
    ${Else}
      GetTempFileName $3 "$2"
    ${EndIf}
    ${If} ${FileExists} "$3"
      Delete "$3"
      StrCpy $CanWriteToInstallDir "true"
    ${EndIf}
    RmDir "$2"
  ${EndIf}
FunctionEnd



!define SIZEOF_TASKDIALOGCONFIG_32BIT 96
!define TDF_ALLOW_DIALOG_CANCELLATION 0x0008
!define TDF_USE_HICON_MAIN 0x0002
!define TD_DW_COMMON_BUTTONS_YESNO 6
!define TDF_RTL_LAYOUT 0x02000
!define TD_WARNING_ICON 0x0FFFF
!define TD_IDYES 6

!insertmacro SetBrandNameVars

Function PromptForInstall
  ; Set variables that may not be set yet
  StrCpy $BrandFullName "${BrandFullName}"
  StrCpy $BrandShortName "${BrandShortName}"
  StrCpy $BrandProductName "${BrandProductName}"

  ; Set up flags
  StrCpy $3 ${TDF_ALLOW_DIALOG_CANCELLATION}
  IntOp $3 $3 | ${TDF_USE_HICON_MAIN}
  !ifdef ${AB_CD}_rtl
    IntOp $3 $3 | ${TDF_RTL_LAYOUT}
  !endif

  Var /global prompt_hinst
  Var /global prompt_icon

  System::Call "kernel32::GetModuleHandleW(i 0) i.s"
  Pop $prompt_hinst

  ; Load the icon
  System::Call "user32::LoadIconW(i $prompt_hinst, p ${ICON_ID}) p.s"
  Pop $prompt_icon

  ; Build a TASKDIALOGCONFIG struct
  System::Call "*(i ${SIZEOF_TASKDIALOGCONFIG_32BIT}, \
                  p $HWNDPARENT, \
                  p 0, \
                  i $3, \
                  i ${TD_DW_COMMON_BUTTONS_YESNO}, \
                  w '${BrandFullName}', \
                  p $prompt_icon, \
                  w '$(STUB_CANCEL_PROMPT_HEADING)', \
                  p 0, \
                  i 0, \
                  p 0, \
                  i ${TD_IDYES}, \
                  i 0, \
                  p 0, \
                  i 0, \
                  p 0, \
                  p 0, \
                  p 0, \
                  p 0, \
                  p 0, \
                  p 0, \
                  p 0, \
                  p 0, \
                  i 0 \
                  ) p.r1"
  System::Call "comctl32::TaskDialogIndirect(p r1, *i 0 r7, p 0, p 0)"
  System::Free $1

  ${If} $7 == ${TD_IDYES}
    Push "yes"
  ${Else}
    Push "no"
  ${EndIf}
FunctionEnd

Function .onInit
  ; After elevation, this is re-run with /UAC: on the command line. In this
  ; case, we do not want to prompt the user---they've already been prompted!
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} "$0" "/UAC:" $1
  ${If} ${Errors}
    ClearErrors
    ${GetOptions} "$0" "/Prompt" $1
    ${IfNot} ${Errors}
      Call PromptForInstall
      Pop $0
      ${If} $0 != "yes"
        StrCpy $AbortInstallation "true"
        Quit
      ${EndIf}
    ${EndIf}
  ${EndIf}
  Call CommonOnInit
FunctionEnd

Function .onUserAbort
  WebBrowser::CancelTimer $TimerHandle

  ${If} "$IsDownloadFinished" != ""
    ; Go ahead and cancel the download so it doesn't keep running while this
    ; prompt is up. We'll resume it if the user decides to continue.
    InetBgDL::Get /RESET /END

    ${ShowTaskDialog} $(STUB_CANCEL_PROMPT_HEADING) \
                      $(STUB_CANCEL_PROMPT_MESSAGE) \
                      $(STUB_CANCEL_PROMPT_BUTTON_CONTINUE) \
                      $(STUB_CANCEL_PROMPT_BUTTON_EXIT)
    Pop $0
    ${If} $0 == 1002
      ; The cancel button was clicked
      StrCpy $ExitCode "${ERR_DOWNLOAD_CANCEL}"
      Call LaunchHelpPage
      Call SendPing
    ${Else}
      ; Either the continue button was clicked or the dialog was dismissed
      Call StartDownload
    ${EndIf}
  ${Else}
    Call SendPing
  ${EndIf}

  ; Aborting the abort will allow SendPing to hide the installer window and
  ; close the installer after it sends the metrics ping, or allow us to just go
  ; back to installing if that's what the user selected.
  Abort
FunctionEnd


Section
SectionEnd
