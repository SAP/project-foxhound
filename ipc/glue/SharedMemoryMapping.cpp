/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* This source code was derived from Chromium code, and as such is also subject
 * to the [Chromium license](ipc/chromium/src/LICENSE). */

#include "mozilla/ipc/SharedMemoryHandle.h"
#include "mozilla/ipc/SharedMemoryMapping.h"
#include "SharedMemoryPlatform.h"

#include "mozilla/Atomics.h"
#include "mozilla/CheckedInt.h"
#include "nsIMemoryReporter.h"

#ifdef FUZZING
#  include "mozilla/ipc/SharedMemoryFuzzer.h"
#endif

namespace mozilla::ipc::shared_memory {

class MappingReporter final : public nsIMemoryReporter {
  ~MappingReporter() = default;

 public:
  static Atomic<size_t> mapped;

  NS_DECL_THREADSAFE_ISUPPORTS

  NS_IMETHOD
  CollectReports(nsIHandleReportCallback* aHandleReport, nsISupports* aData,
                 bool aAnonymize) override {
    MOZ_COLLECT_REPORT(
        "shmem-mapped", KIND_OTHER, UNITS_BYTES, mapped,
        "Memory shared with other processes that is mapped into the address "
        "space.");

    return NS_OK;
  }
};

Atomic<size_t> MappingReporter::mapped;

NS_IMPL_ISUPPORTS(MappingReporter, nsIMemoryReporter)

static void RegisterMemoryReporter() {
  static Atomic<bool> registered;
  if (registered.compareExchange(false, true)) {
    RegisterStrongMemoryReporter(new MappingReporter());
  }
}

MappingBase::MappingBase() { RegisterMemoryReporter(); }

MappingBase& MappingBase::operator=(MappingBase&& aOther) {
  // Swap members with `aOther`, and unmap that mapping.
  std::swap(aOther.mMemory, mMemory);
  std::swap(aOther.mSize, mSize);
  aOther.Unmap();
  return *this;
}

void* MappingBase::Data() const {
#ifdef FUZZING
  return SharedMemoryFuzzer::MutateSharedMemory(mMemory, mSize);
#else
  return mMemory;
#endif
}

LeakedMapping MappingBase::release() && {
  // NOTE: this doesn't reduce gShmemMapped since it _is_ still mapped memory
  // (and will be until the process terminates).
  return LeakedMapping{static_cast<uint8_t*>(std::exchange(mMemory, nullptr)),
                       std::exchange(mSize, 0)};
}

bool MappingBase::Map(const HandleBase& aHandle, void* aFixedAddress,
                      bool aReadOnly) {
  // Verify that the handle size can be stored as a mapping size first
  // (otherwise it won't be possible to map in the address space and the Map
  // call will fail).
  CheckedInt<size_t> checkedSize(aHandle.Size());
  if (!checkedSize.isValid()) {
    MOZ_LOG_FMT(gSharedMemoryLog, LogLevel::Error,
                "handle size to map exceeds address space size");
    return false;
  }

  return MapSubregion(aHandle, /* aOffset */ 0, checkedSize.value(),
                      aFixedAddress, aReadOnly);
}

bool MappingBase::MapSubregion(const HandleBase& aHandle, uint64_t aOffset,
                               size_t aSize, void* aFixedAddress,
                               bool aReadOnly) {
  CheckedInt<uint64_t> endOffset(aOffset);
  endOffset += aSize;
  if (!endOffset.isValid() || endOffset.value() > aHandle.Size()) {
    MOZ_LOG_FMT(gSharedMemoryLog, LogLevel::Error,
                "cannot map region exceeding aHandle.Size()");
    return false;
  }

  if (auto mem =
          Platform::Map(aHandle, aOffset, aSize, aFixedAddress, aReadOnly)) {
    mMemory = *mem;
    mSize = aSize;
    MappingReporter::mapped += mSize;
    return true;
  }
  return false;
}

void MappingBase::Unmap() {
  if (IsValid()) {
    Platform::Unmap(mMemory, mSize);

    MOZ_ASSERT(MappingReporter::mapped >= mSize,
               "Can't unmap more than mapped");
    MappingReporter::mapped -= mSize;
  }
  mMemory = nullptr;
  mSize = 0;
}

Mapping::Mapping(const Handle& aHandle, void* aFixedAddress) {
  Map(aHandle, aFixedAddress, false);
}

Mapping::Mapping(const Handle& aHandle, uint64_t aOffset, size_t aSize,
                 void* aFixedAddress) {
  MapSubregion(aHandle, aOffset, aSize, aFixedAddress, false);
}

ReadOnlyMapping::ReadOnlyMapping(const ReadOnlyHandle& aHandle,
                                 void* aFixedAddress) {
  Map(aHandle, aFixedAddress, true);
}

ReadOnlyMapping::ReadOnlyMapping(const ReadOnlyHandle& aHandle,
                                 uint64_t aOffset, size_t aSize,
                                 void* aFixedAddress) {
  MapSubregion(aHandle, aOffset, aSize, aFixedAddress, true);
}

FreezableMapping::FreezableMapping(FreezableHandle&& aHandle,
                                   void* aFixedAddress) {
  if (Map(aHandle, aFixedAddress, false)) {
    mHandle = std::move(aHandle);
  }
}

FreezableMapping::FreezableMapping(FreezableHandle&& aHandle, uint64_t aOffset,
                                   size_t aSize, void* aFixedAddress) {
  if (MapSubregion(aHandle, aOffset, aSize, aFixedAddress, false)) {
    mHandle = std::move(aHandle);
  }
}

std::tuple<Mapping, ReadOnlyHandle> FreezableMapping::Freeze() && {
  auto handle = std::move(mHandle);
  return std::make_tuple(std::move(*this).ConvertTo<Mapping>(),
                         std::move(handle).Freeze());
}

FreezableHandle FreezableMapping::Unmap() && {
  auto handle = std::move(mHandle);
  *this = nullptr;
  return handle;
}

void* FindFreeAddressSpace(size_t aSize) {
  return Platform::FindFreeAddressSpace(aSize);
}

size_t SystemPageSize() { return Platform::PageSize(); }

size_t SystemAllocationGranularity() {
  return Platform::AllocationGranularity();
}

size_t PageAlignedSize(size_t aMinimum) {
  const size_t pageSize = Platform::PageSize();
  size_t nPagesNeeded = size_t(ceil(double(aMinimum) / double(pageSize)));
  return pageSize * nPagesNeeded;
}

bool Protect(char* aAddr, size_t aSize, Access aAccess) {
  return Platform::Protect(aAddr, aSize, aAccess);
}

}  // namespace mozilla::ipc::shared_memory
