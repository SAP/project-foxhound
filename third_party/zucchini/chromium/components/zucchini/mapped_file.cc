// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "components/zucchini/mapped_file.h"

#include <utility>

#include "base/files/file_util.h"
#include "build/build_config.h"

namespace zucchini {

MappedFileReader::MappedFileReader(base::File file) {
  if (!file.IsValid()) {
    error_ = "Invalid file.";
    return;  // |buffer_| will be uninitialized, and therefore invalid.
  }
  if (!buffer_.Initialize(std::move(file))) {
    error_ = "Can't map file to memory.";
  }
}

MappedFileWriter::MappedFileWriter(const base::FilePath& file_path,
                                   base::File file,
#if defined(MOZ_ZUCCHINI)
                                   size_t length,
                                   bool keep)
    : file_path_(file_path), delete_behavior_(keep ? kKeep : kManualDeleteOnClose) {
#else
                                   size_t length)
    : file_path_(file_path), delete_behavior_(kManualDeleteOnClose) {
#endif  // defined(MOZ_ZUCCHINI)
  if (!file.IsValid()) {
    error_ = "Invalid file.";
    return;  // |buffer_| will be uninitialized, and therefore invalid.
  }

#if BUILDFLAG(IS_WIN)
  file_handle_ = file.Duplicate();
#if defined(MOZ_ZUCCHINI)
  if (!keep) {
#endif  // defined(MOZ_ZUCCHINI)
  // Tell the OS to delete the file when all handles are closed.
  if (file_handle_.DeleteOnClose(true)) {
    delete_behavior_ = kAutoDeleteOnClose;
  } else {
    error_ = "Failed to mark file for delete-on-close.";
  }
#if defined(MOZ_ZUCCHINI)
  }
#endif  // defined(MOZ_ZUCCHINI)
#endif  // BUILDFLAG(IS_WIN)

  bool is_ok = buffer_.Initialize(std::move(file), {0, length},
                                  base::MemoryMappedFile::READ_WRITE_EXTEND);
  if (!is_ok) {
    error_ = "Can't map file to memory.";
  }
}

MappedFileWriter::~MappedFileWriter() {
  if (!HasError() && delete_behavior_ == kManualDeleteOnClose &&
      !file_path_.empty() && !base::DeleteFile(file_path_)) {
    error_ = "Failed to delete file.";
  }
}

bool MappedFileWriter::Keep() {
#if BUILDFLAG(IS_WIN)
  if (delete_behavior_ == kAutoDeleteOnClose &&
      !file_handle_.DeleteOnClose(false)) {
    error_ = "Failed to prevent deletion of file.";
    return false;
  }
#endif  // BUILDFLAG(IS_WIN)
  delete_behavior_ = kKeep;
  return true;
}

#if defined(MOZ_ZUCCHINI)
bool MappedFileWriter::Flush() {
  bool success = buffer_.Flush();
  if (!success) {
    error_ = "Failed to flush changes to disk.";
  }
  return success;
}
#endif  // MOZ_ZUCCHINI

}  // namespace zucchini
