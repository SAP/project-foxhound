# Any copyright is dedicated to the Public Domain.
# http://creativecommons.org/publicdomain/zero/1.0/

Function TelemetryTests
  ${UnitTest} TestGenerateUUID
  ${UnitTest} TestCommonPingHttpDetails
  ${UnitTest} Test64BitBuildTelemetryField
  ${UnitTest} TestManualDownloadTelemetryField
  ${UnitTest} TestLaunchStatusTelemetryFields
  ${UnitTest} TestExistingInstallationTelemetryFields
FunctionEnd

Function FakePingInfo
  nsJSON::Set /tree ping "Data" "another_ping_for_testing" /value '"it works"'
FunctionEnd

!macro MakeTelemetryPing Callback
  Push "~~ sentinel ~~"
  GetFunctionAddress $0 ${Callback}
  Push $0
  Call PrepareTelemetryPing

  Pop $0
  ${AssertEqual} 0 "~~ sentinel ~~"
  ; TODO somehow check that we don't botch registers
!macroend

!macro AssertTelemetryData FIELD TYPE EXPECTED
  nsJSON::Get /tree ping /type "Data" "${FIELD}" /end
  Exch $0
  ${AssertEqual} 0 "${TYPE}"

  nsJSON::Get /tree ping "Data" "${FIELD}" /end
  Pop $0
  ${AssertEqual} 0 "${EXPECTED}"

  Pop $0
!macroend
!define AssertTelemetryData "!insertmacro AssertTelemetryData"

Function TestGenerateUUID
  Push $0
  Push $1

  Call GenerateUUID_dontcall ; don't want the mocked one!
  Pop $0
  Call GenerateUUID_dontcall
  Pop $1

  ${If} "$0" == "$1"
    ${Fail} "Generated UUIDs were the same! Both were '$0'."
  ${EndIf}

  StrCpy $1 $0 1 0
  ${If} "$1" == "{"
    ${Fail} "Curly brace prefix was still present!"
  ${EndIf}

  StrCpy $1 $0 1 -1
  ${If} "$1" == "}"
    ${Fail} "Curly brace suffix was still present!"
  ${EndIf}

  Pop $1
  Pop $0
FunctionEnd

Function TestCommonPingHttpDetails
  Push $0

  !insertmacro MakeTelemetryPing FakePingInfo

  nsJSON::Get /tree ping "Url" /end
  Pop $0
  ${AssertEqual} 0 "${TELEMETRY_BASE_URL}/${TELEMETRY_NAMESPACE}/${TELEMETRY_INSTALL_PING_DOCTYPE}/${TELEMETRY_INSTALL_PING_VERSION}/THIS_IS_A_UNIQUE_ID_FOR_TESTING"

  nsJSON::Get /tree ping "Verb" /end
  Pop $0
  ${AssertEqual} 0 "POST"

  nsJSON::Get /tree ping "DataType" /end
  Pop $0
  ${AssertEqual} 0 "JSON"

  nsJSON::Get /tree ping "AccessType" /end
  Pop $0
  ${AssertEqual} 0 "PreConfig"

  ${AssertTelemetryData} "build_channel" "string" "${Channel}"
  ${AssertTelemetryData} "update_channel" "string" "${UpdateChannel}"
  ${AssertTelemetryData} "locale" "string" "${AB_CD}"

  ; Ensure the callback was used.
  ${AssertTelemetryData} "another_ping_for_testing" "string" "it works"

  Pop $0
FunctionEnd

Function Test64BitBuildTelemetryField
  ; This currently only runs for the stub installer, so the full-installer part
  ; isn't tested.
  Push $ArchToInstall

  StrCpy $ArchToInstall ${ARCH_X86}
  !insertmacro MakeTelemetryPing PrepareStubInstallPing
  ${AssertTelemetryData} "64bit_build" "value" "false"

  StrCpy $ArchToInstall ${ARCH_AMD64}
  !insertmacro MakeTelemetryPing PrepareStubInstallPing
  ${AssertTelemetryData} "64bit_build" "value" "true"

  StrCpy $ArchToInstall ${ARCH_AARCH64}
  !insertmacro MakeTelemetryPing PrepareStubInstallPing
  ${AssertTelemetryData} "64bit_build" "value" "true"

  Pop $ArchToInstall
FunctionEnd

Function TestManualDownloadTelemetryField
  Push $OpenedDownloadPage

  StrCpy $OpenedDownloadPage "1"
  !insertmacro MakeTelemetryPing PrepareStubInstallPing
  ${AssertTelemetryData} "manual_download" "value" "true"

  StrCpy $OpenedDownloadPage "0"
  !insertmacro MakeTelemetryPing PrepareStubInstallPing
  ${AssertTelemetryData} "manual_download" "value" "false"

  StrCpy $OpenedDownloadPage "1239" ; unknown
  !insertmacro MakeTelemetryPing PrepareStubInstallPing
  ${AssertTelemetryData} "manual_download" "value" "false"

  Pop $OpenedDownloadPage
FunctionEnd

Function TestLaunchStatusTelemetryFields
  Push $FirefoxLaunchCode

  StrCpy $FirefoxLaunchCode "0"
  !insertmacro MakeTelemetryPing PrepareStubInstallPing
  ${AssertTelemetryData} "old_running" "value" "false"
  ${AssertTelemetryData} "new_launched" "value" "false"

  StrCpy $FirefoxLaunchCode "2"
  !insertmacro MakeTelemetryPing PrepareStubInstallPing
  ${AssertTelemetryData} "old_running" "value" "false"
  ${AssertTelemetryData} "new_launched" "value" "true"

  StrCpy $FirefoxLaunchCode "98475" ; unknown
  !insertmacro MakeTelemetryPing PrepareStubInstallPing
  ${AssertTelemetryData} "old_running" "value" "false"
  ${AssertTelemetryData} "new_launched" "value" "false"

  Pop $FirefoxLaunchCode
FunctionEnd

Function TestExistingInstallationTelemetryFields
  Push $ExistingVersion
  Push $ExistingBuildID

  ; On error, these are set to '0' (see createInstall in stub.nsh)
  StrCpy $ExistingVersion "0"
  StrCpy $ExistingBuildID "0"
  !insertmacro MakeTelemetryPing PrepareStubInstallPing
  ${AssertTelemetryData} "old_version" "string" "0"
  ${AssertTelemetryData} "old_build_id" "string" "0"

  StrCpy $ExistingVersion "qwerty"
  StrCpy $ExistingBuildID "uiop"
  !insertmacro MakeTelemetryPing PrepareStubInstallPing
  ${AssertTelemetryData} "old_version" "string" "qwerty"
  ${AssertTelemetryData} "old_build_id" "string" "uiop"

  Pop $ExistingBuildID
  Pop $ExistingVersion
FunctionEnd
