// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "base/files/memory_mapped_file.h"

#include <fcntl.h>
#include <stddef.h>
#include <stdint.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>

#include "base/files/file_util.h"
#include "base/logging.h"
#include "base/numerics/safe_conversions.h"
#include "base/threading/scoped_blocking_call.h"
#include "build/build_config.h"

namespace base {

MemoryMappedFile::MemoryMappedFile() = default;

#if !BUILDFLAG(IS_NACL)
bool MemoryMappedFile::MapFileRegionToMemory(
    const MemoryMappedFile::Region& region,
    Access access) {
  ScopedBlockingCall scoped_blocking_call(FROM_HERE, BlockingType::MAY_BLOCK);

  off_t map_start = 0;
  size_t map_size = 0;
  int32_t data_offset = 0;

  if (region == MemoryMappedFile::Region::kWholeFile) {
    int64_t file_len = file_.GetLength();
    if (file_len < 0) {
      DPLOG(ERROR) << "fstat " << file_.GetPlatformFile();
      return false;
    }
    if (!IsValueInRangeForNumericType<size_t>(file_len))
      return false;
    map_size = static_cast<size_t>(file_len);
    length_ = map_size;
  } else {
    // The region can be arbitrarily aligned. mmap, instead, requires both the
    // start and size to be page-aligned. Hence, we map here the page-aligned
    // outer region [|aligned_start|, |aligned_start| + |size|] which contains
    // |region| and then add up the |data_offset| displacement.
    int64_t aligned_start = 0;
    size_t aligned_size = 0;
    CalculateVMAlignedBoundaries(region.offset,
                                 region.size,
                                 &aligned_start,
                                 &aligned_size,
                                 &data_offset);

    // Ensure that the casts in the mmap call below are sane.
    if (aligned_start < 0 ||
        !IsValueInRangeForNumericType<off_t>(aligned_start)) {
      DLOG(ERROR) << "Region bounds are not valid for mmap";
      return false;
    }

    map_start = static_cast<off_t>(aligned_start);
    map_size = aligned_size;
    length_ = region.size;
  }

  int flags = 0;
  switch (access) {
    case READ_ONLY:
      flags |= PROT_READ;
      break;

    case READ_WRITE:
      flags |= PROT_READ | PROT_WRITE;
      break;

    case READ_WRITE_EXTEND:
      flags |= PROT_READ | PROT_WRITE;

      if (!AllocateFileRegion(&file_, region.offset, region.size))
        return false;

      break;
  }

#if defined(MOZ_ZUCCHINI)
  auto* data = static_cast<uint8_t*>(mmap(nullptr, map_size, flags, MAP_SHARED,
                                          file_.GetPlatformFile(), map_start));
  if (data != MAP_FAILED) {
    data_ = data;
  }
  else {
#else
  data_ = static_cast<uint8_t*>(mmap(nullptr, map_size, flags, MAP_SHARED,
                                     file_.GetPlatformFile(), map_start));
  if (data_ == MAP_FAILED) {
#endif  // MOZ_ZUCCHINI
    DPLOG(ERROR) << "mmap " << file_.GetPlatformFile();
    return false;
  }

  data_ += data_offset;
  return true;
}
#endif

void MemoryMappedFile::CloseHandles() {
  ScopedBlockingCall scoped_blocking_call(FROM_HERE, BlockingType::MAY_BLOCK);

  if (data_ != nullptr) {
    munmap(data_.ExtractAsDangling(), length_);
  }
  file_.Close();
  length_ = 0;
}

#if defined(MOZ_ZUCCHINI)
bool MemoryMappedFile::Flush() {
  if (!data_) {
    return false;
  }

  // Synchronize memory-mapped changes to disk. MS_SYNC ensures all writes are
  // completed before returning. MS_INVALIDATE is critical on macOS to
  // invalidate kernel code signing caches, ensuring subsequent opens will
  // revalidate signatures.
  bool success = msync(data_, length_, MS_SYNC | MS_INVALIDATE) == 0;
  if (!success) {
    PLOG(ERROR) << "msync failed";
  }
  return success;
}
#endif  // MOZ_ZUCCHINI

}  // namespace base
