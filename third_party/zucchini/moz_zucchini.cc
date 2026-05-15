/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/moz_zucchini.h"

#include "absl/types/optional.h"
#include "base/logging.h"
#include "base/files/file.h"
#include "base/files/file_util.h"
#include "build/build_config.h"
#include "components/zucchini/crc32.h"
#include "components/zucchini/mapped_file.h"
#include "components/zucchini/patch_reader.h"
#include "components/zucchini/zucchini.h"
#include "components/zucchini/zucchini_apply.h"

#include <cstdio>

#if BUILDFLAG(IS_WIN)
#  include "components/zucchini/exception_filter_helper_win.h"

#  include <io.h>
#  include <ntstatus.h>
#endif  // BUILDFLAG(IS_WIN)

namespace zucchini::mozilla {

LogFunctionPtr gLogFunction = nullptr;

bool LogMessageHandler(int aSeverity, const char* aFile, int aLine,
                       size_t aMessageStart, const std::string& aStr) {
  if (!gLogFunction) {
    return false;
  }
  gLogFunction(aStr.c_str());
  return true;
}

void SetLogFunction(LogFunctionPtr aLogFunction) {
  gLogFunction = aLogFunction;
  logging::SetLogMessageHandler(LogMessageHandler);
}

uint32_t ComputeCrc32(const uint8_t* aBuf, size_t aBufSize) {
  return CalculateCrc32(aBuf, aBuf + aBufSize);
}

// This is zucchini::ApplyBuffer, except that we *assume* that aCheckedOldImage
// has the correct size and crc32 instead of checking it.
status::Code ApplyBufferUnsafe(ConstBufferView aCheckedOldImage,
                               const EnsemblePatchReader& aPatchReader,
                               MutableBufferView aNewImage) {
  for (const auto& elementPatch : aPatchReader.elements()) {
    ElementMatch match = elementPatch.element_match();
    if (!ApplyElement(match.exe_type(),
                      aCheckedOldImage[match.old_element.region()],
                      elementPatch, aNewImage[match.new_element.region()]))
      return status::kStatusFatal;
  }

  if (!aPatchReader.CheckNewFile(ConstBufferView(aNewImage))) {
    LOG(ERROR) << "Invalid aNewImage.";
    return status::kStatusInvalidNewImage;
  }
  return status::kStatusSuccess;
}

class MappedPatchImpl {
 public:
  MappedPatchImpl() = default;
  ~MappedPatchImpl() = default;
  std::optional<MappedFileReader> mFileReader;
  EnsemblePatchReader mPatchReader;
#if BUILDFLAG(IS_WIN)
  ExceptionFilterHelper mExceptionFilterHelper;
#endif  // BUILDFLAG(IS_WIN)
};

MappedPatch::MappedPatch() : mImpl(new MappedPatchImpl()) {}

MappedPatch::~MappedPatch() { delete mImpl; }

#if BUILDFLAG(IS_WIN)
#  if !defined(HAVE_SEH_EXCEPTIONS) || !HAVE_SEH_EXCEPTIONS
#    error Compiler support for SEH is required to build zucchini on Windows.
#  endif
#  define BEGIN_TRY_EXCEPT() __try {
#  define END_TRY_EXCEPT()                                                 \
    }                                                                      \
    __except (mImpl->mExceptionFilterHelper.FilterPageError(               \
        GetExceptionInformation()->ExceptionRecord)) {                     \
      LOG(ERROR) << "EXCEPTION_IN_PAGE_ERROR while "                       \
                 << (mImpl->mExceptionFilterHelper.is_write()              \
                         ? "writing to"                                    \
                         : "reading from")                                 \
                 << " mapped files; NTSTATUS = "                           \
                 << mImpl->mExceptionFilterHelper.nt_status();             \
      return mImpl->mExceptionFilterHelper.nt_status() == STATUS_DISK_FULL \
                 ? status::kStatusDiskFull                                 \
                 : status::kStatusIoError;                                 \
    }
#else
#  define BEGIN_TRY_EXCEPT()
#  define END_TRY_EXCEPT()
#endif  // BUILDFLAG(IS_WIN)

// This corresponds to the first half of zucchini::ApplyCommon.
status::Code MappedPatch::Load(FILE* aPatchFile, uint32_t* aSourceSize,
                               uint32_t* aDestinationSize,
                               uint32_t* aSourceCrc32) {
  base::File patchFile = base::FILEToFile(aPatchFile);
  if (!patchFile.IsValid()) {
    LOG(ERROR) << "Invalid patch file.";
    return status::kStatusFileReadError;
  }
  mImpl->mFileReader.emplace(std::move(patchFile));
  auto& fileReader = *mImpl->mFileReader;
  if (fileReader.HasError()) {
    LOG(ERROR) << "Error with patch file: " << fileReader.error();
    return status::kStatusFileReadError;
  }
#if BUILDFLAG(IS_WIN)
  mImpl->mExceptionFilterHelper.AddRange(
      {fileReader.data(), fileReader.length()});
#endif
  BEGIN_TRY_EXCEPT()
  BufferSource source(fileReader.region());
  auto& patchReader = mImpl->mPatchReader;
  if (!patchReader.Initialize(&source)) {
    LOG(ERROR) << "Error reading patch header.";
    return status::kStatusPatchReadError;
  }
  auto& header = patchReader.header();
  *aSourceSize = header.old_size;
  *aDestinationSize = header.new_size;
  *aSourceCrc32 = header.old_crc;
  return status::kStatusSuccess;
  END_TRY_EXCEPT()
}

// This corresponds to the second half of zucchini::ApplyCommon.
status::Code MappedPatch::ApplyUnsafe(const uint8_t* aCheckedOldImage,
                                      size_t aCheckedOldImageSize,
                                      FILE* aNewFile) {
  ConstBufferView oldImageView(aCheckedOldImage, aCheckedOldImageSize);

  base::File newFile = base::FILEToFile(aNewFile);
  if (!newFile.IsValid()) {
    LOG(ERROR) << "Invalid new file.";
    return status::kStatusFileWriteError;
  }

  BEGIN_TRY_EXCEPT()
  PatchHeader header = mImpl->mPatchReader.header();
  base::FilePath name;
  name = name.AppendASCII("old_name");
  MappedFileWriter mappedNew(name, std::move(newFile), header.new_size,
                             /*keep*/ true);
  if (mappedNew.HasError()) {
    LOG(ERROR) << "Error with new file: " << mappedNew.error();
    return status::kStatusFileWriteError;
  }

#if BUILDFLAG(IS_WIN)
  mImpl->mExceptionFilterHelper.AddRange(
      {mappedNew.data(), mappedNew.length()});
#endif

  status::Code result =
      ApplyBufferUnsafe(oldImageView, mImpl->mPatchReader, mappedNew.region());
  if (result != status::kStatusSuccess) {
    LOG(ERROR) << "Fatal error encountered while applying patch.";
    return result;
  }

  if (!mappedNew.Flush()) {
    LOG(ERROR) << "Error flushing changes to disk: " << mappedNew.error();
    return status::kStatusFileWriteError;
  }

  return status::kStatusSuccess;
  END_TRY_EXCEPT()
}

}  // namespace zucchini::mozilla
