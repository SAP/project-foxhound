/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "QuotaCommon.h"

#include "mozilla/Logging.h"
#include "mozilla/TextUtils.h"
#include "nsIConsoleService.h"
#include "nsIFile.h"
#include "nsServiceManagerUtils.h"
#include "nsStringFlags.h"
#include "nsTStringRepr.h"
#include "nsUnicharUtils.h"
#include "nsXPCOM.h"
#include "nsXULAppAPI.h"

#ifdef XP_WIN
#  include "mozilla/Atomics.h"
#  include "mozilla/ipc/BackgroundParent.h"
#  include "mozilla/StaticPrefs_dom.h"
#  include "nsILocalFileWin.h"
#endif

namespace mozilla::dom::quota {

namespace {

#ifdef DEBUG
constexpr auto kDSStoreFileName = u".DS_Store"_ns;
constexpr auto kDesktopFileName = u".desktop"_ns;
constexpr auto kDesktopIniFileName = u"desktop.ini"_ns;
constexpr auto kThumbsDbFileName = u"thumbs.db"_ns;
#endif

#ifdef XP_WIN
Atomic<int32_t> gUseDOSDevicePathSyntax(-1);
#endif

LazyLogModule gLogger("QuotaManager");

void AnonymizeCString(nsACString& aCString, uint32_t aStart) {
  MOZ_ASSERT(!aCString.IsEmpty());
  MOZ_ASSERT(aStart < aCString.Length());

  char* iter = aCString.BeginWriting() + aStart;
  char* end = aCString.EndWriting();

  while (iter != end) {
    char c = *iter;

    if (IsAsciiAlpha(c)) {
      *iter = 'a';
    } else if (IsAsciiDigit(c)) {
      *iter = 'D';
    }

    ++iter;
  }
}

}  // namespace

const char kQuotaGenericDelimiter = '|';

#ifdef NIGHTLY_BUILD
const nsLiteralCString kQuotaInternalError = "internal"_ns;
const nsLiteralCString kQuotaExternalError = "external"_ns;
#endif

LogModule* GetQuotaManagerLogger() { return gLogger; }

void AnonymizeCString(nsACString& aCString) {
  if (aCString.IsEmpty()) {
    return;
  }
  AnonymizeCString(aCString, /* aStart */ 0);
}

void AnonymizeOriginString(nsACString& aOriginString) {
  if (aOriginString.IsEmpty()) {
    return;
  }

  int32_t start = aOriginString.FindChar(':');
  if (start < 0) {
    start = 0;
  }

  AnonymizeCString(aOriginString, start);
}

#ifdef XP_WIN
void CacheUseDOSDevicePathSyntaxPrefValue() {
  MOZ_ASSERT(XRE_IsParentProcess());
  AssertIsOnBackgroundThread();

  if (gUseDOSDevicePathSyntax == -1) {
    bool useDOSDevicePathSyntax =
        StaticPrefs::dom_quotaManager_useDOSDevicePathSyntax_DoNotUseDirectly();
    gUseDOSDevicePathSyntax = useDOSDevicePathSyntax ? 1 : 0;
  }
}
#endif

Result<nsCOMPtr<nsIFile>, nsresult> QM_NewLocalFile(const nsAString& aPath) {
  nsCOMPtr<nsIFile> file;
  nsresult rv =
      NS_NewLocalFile(aPath, /* aFollowLinks */ false, getter_AddRefs(file));
  if (NS_WARN_IF(NS_FAILED(rv))) {
    QM_WARNING("Failed to construct a file for path (%s)",
               NS_ConvertUTF16toUTF8(aPath).get());
    return Err(rv);
  }

#ifdef XP_WIN
  MOZ_ASSERT(gUseDOSDevicePathSyntax != -1);

  if (gUseDOSDevicePathSyntax) {
    nsCOMPtr<nsILocalFileWin> winFile = do_QueryInterface(file, &rv);
    if (NS_WARN_IF(NS_FAILED(rv))) {
      return Err(rv);
    }

    MOZ_ASSERT(winFile);
    winFile->SetUseDOSDevicePathSyntax(true);
  }
#endif

  return file;
}

nsDependentCSubstring GetLeafName(const nsACString& aPath) {
  nsACString::const_iterator start, end;
  aPath.BeginReading(start);
  aPath.EndReading(end);

  bool found = RFindInReadable("/"_ns, start, end);
  if (found) {
    start = end;
  }

  aPath.EndReading(end);

  return nsDependentCSubstring(start.get(), end.get());
}

Result<nsCOMPtr<nsIFile>, nsresult> CloneFileAndAppend(
    nsIFile& aDirectory, const nsAString& aPathElement) {
  QM_TRY_UNWRAP(auto resultFile, MOZ_TO_RESULT_INVOKE_TYPED(nsCOMPtr<nsIFile>,
                                                            aDirectory, Clone));

  QM_TRY(resultFile->Append(aPathElement));

  return resultFile;
}

#ifdef QM_ENABLE_SCOPED_LOG_EXTRA_INFO
MOZ_THREAD_LOCAL(const nsACString*) ScopedLogExtraInfo::sQueryValue;

/* static */
auto ScopedLogExtraInfo::FindSlot(const char* aTag) {
  // XXX For now, don't use a real map but just allow the known tag values.

  if (aTag == kTagQuery) {
    return &sQueryValue;
  }

  MOZ_CRASH("Unknown tag!");
}

ScopedLogExtraInfo::~ScopedLogExtraInfo() {
  if (mTag) {
    MOZ_ASSERT(&mCurrentValue == FindSlot(mTag)->get(),
               "Bad scoping of ScopedLogExtraInfo, must not be interleaved!");

    FindSlot(mTag)->set(mPreviousValue);
  }
}

ScopedLogExtraInfo::ScopedLogExtraInfo(ScopedLogExtraInfo&& aOther)
    : mTag(aOther.mTag),
      mPreviousValue(aOther.mPreviousValue),
      mCurrentValue(std::move(aOther.mCurrentValue)) {
  aOther.mTag = nullptr;
  FindSlot(mTag)->set(&mCurrentValue);
}

/* static */ ScopedLogExtraInfo::ScopedLogExtraInfoMap
ScopedLogExtraInfo::GetExtraInfoMap() {
  // This could be done in a cheaper way, but this is never called on a hot
  // path, so we anticipate using a real map inside here to make use simpler for
  // the caller(s).

  ScopedLogExtraInfoMap map;
  if (XRE_IsParentProcess()) {
    if (sQueryValue.get()) {
      map.emplace(kTagQuery, sQueryValue.get());
    }
  }
  return map;
}

/* static */ void ScopedLogExtraInfo::Initialize() {
  MOZ_ALWAYS_TRUE(sQueryValue.init());
}

void ScopedLogExtraInfo::AddInfo() {
  auto* slot = FindSlot(mTag);
  MOZ_ASSERT(slot);
  mPreviousValue = slot->get();

  slot->set(&mCurrentValue);
}
#endif

void LogError(const nsLiteralCString& aModule, const nsACString& aExpr,
              const nsACString& aSourceFile, int32_t aSourceLine) {
  nsAutoCString extraInfosString;

#ifdef QM_ENABLE_SCOPED_LOG_EXTRA_INFO
  const auto& extraInfos = ScopedLogExtraInfo::GetExtraInfoMap();
  for (const auto& item : extraInfos) {
    extraInfosString.Append(", "_ns + nsDependentCString(item.first) + "="_ns +
                            *item.second);
  }
#endif

#ifdef DEBUG
  NS_DebugBreak(NS_DEBUG_WARNING, nsAutoCString(aModule + " failure"_ns).get(),
                (extraInfosString.IsEmpty()
                     ? nsPromiseFlatCString(aExpr)
                     : static_cast<const nsCString&>(
                           nsAutoCString(aExpr + extraInfosString)))
                    .get(),
                nsPromiseFlatCString(aSourceFile).get(), aSourceLine);
#endif

#if defined(EARLY_BETA_OR_EARLIER) || defined(DEBUG)
  nsCOMPtr<nsIConsoleService> console =
      do_GetService(NS_CONSOLESERVICE_CONTRACTID);
  if (console) {
    NS_ConvertUTF8toUTF16 message(aModule + " failure: '"_ns + aExpr +
                                  "', file "_ns + GetLeafName(aSourceFile) +
                                  ", line "_ns + IntToCString(aSourceLine) +
                                  extraInfosString);

    // The concatenation above results in a message like:
    // QuotaManager failure: 'EXP', file XYZ, line N)

    console->LogStringMessage(message.get());
  }
#endif
}

#ifdef DEBUG
Result<bool, nsresult> WarnIfFileIsUnknown(nsIFile& aFile,
                                           const char* aSourceFile,
                                           const int32_t aSourceLine) {
  nsString leafName;
  nsresult rv = aFile.GetLeafName(leafName);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return Err(rv);
  }

  bool isDirectory;
  rv = aFile.IsDirectory(&isDirectory);
  if (NS_WARN_IF(NS_FAILED(rv))) {
    return Err(rv);
  }

  if (!isDirectory) {
    // Don't warn about OS metadata files. These files are only used in
    // different platforms, but the profile can be shared across different
    // operating systems, so we check it on all platforms.
    if (leafName.Equals(kDSStoreFileName) ||
        leafName.Equals(kDesktopFileName) ||
        leafName.Equals(kDesktopIniFileName,
                        nsCaseInsensitiveStringComparator) ||
        leafName.Equals(kThumbsDbFileName, nsCaseInsensitiveStringComparator)) {
      return false;
    }

    // Don't warn about files starting with ".".
    if (leafName.First() == char16_t('.')) {
      return false;
    }
  }

  NS_DebugBreak(
      NS_DEBUG_WARNING,
      nsPrintfCString("Something (%s) in the directory that doesn't belong!",
                      NS_ConvertUTF16toUTF8(leafName).get())
          .get(),
      nullptr, aSourceFile, aSourceLine);

  return true;
}
#endif

}  // namespace mozilla::dom::quota
