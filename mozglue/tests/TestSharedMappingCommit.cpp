/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include <cstdint>
#include <cstdio>
#include <windows.h>

// Tests that when there are multiple views to a unique mapping, committing
// memory pages for one of the views actually commits them for all views. We
// rely on this behavior in `mozglue/interceptor/MMPolicies.h` and in
// `security/sandbox/chromium/sandbox/win/src/interception.cc`.
bool TestSharedMappingCommit() {
  constexpr size_t kMappingSize = 64 * 1024;
  constexpr size_t kCommitOffset = 32 * 1024;
  constexpr size_t kCommitSize = 4 * 1024;

  HANDLE mapping = ::CreateFileMappingW(INVALID_HANDLE_VALUE, nullptr,
                                        PAGE_EXECUTE_READWRITE | SEC_RESERVE, 0,
                                        kMappingSize, nullptr);
  if (!mapping) {
    printf(
        "TEST-FAIL | SharedMappingCommit | Failed to create a pagefile-backed "
        "mapping\n");
    return false;
  }

  void* rwView =
      ::MapViewOfFile(mapping, FILE_MAP_READ | FILE_MAP_WRITE, 0, 0, 0);
  if (!rwView) {
    printf(
        "TEST-FAIL | SharedMappingCommit | Failed to get a read/write view\n");
    return false;
  }

  void* rxView =
      ::MapViewOfFile(mapping, FILE_MAP_READ | FILE_MAP_EXECUTE, 0, 0, 0);
  if (!rxView) {
    printf(
        "TEST-FAIL | SharedMappingCommit | Failed to get a read/execute "
        "view\n");
    return false;
  }

  auto* rwCommitAddress =
      static_cast<void*>(static_cast<uint8_t*>(rwView) + kCommitOffset);
  auto* rxCommitAddress =
      static_cast<void*>(static_cast<uint8_t*>(rxView) + kCommitOffset);

  {
    MEMORY_BASIC_INFORMATION info{};
    if (::VirtualQuery(rxCommitAddress, &info, sizeof(info)) != sizeof(info)) {
      printf(
          "TEST-FAIL | SharedMappingCommit | Failed to query basic information "
          "about the read/execute memory pages\n");
      return false;
    }
    if (info.State != MEM_RESERVE) {
      printf(
          "TEST-FAIL | SharedMappingCommit | Unexpected initial state for the "
          "read/execute memory pages: %lu\n",
          info.State);
      return false;
    }
  }

  rwCommitAddress = ::VirtualAlloc(static_cast<void*>(rwCommitAddress),
                                   kCommitSize, MEM_COMMIT, PAGE_READWRITE);
  if (!rwCommitAddress) {
    printf(
        "TEST-FAIL | SharedMappingCommit | Failed to commit read/write "
        "memory pages\n");
    return false;
  }

  {
    MEMORY_BASIC_INFORMATION info{};
    if (::VirtualQuery(rxCommitAddress, &info, sizeof(info)) != sizeof(info)) {
      printf(
          "TEST-FAIL | SharedMappingCommit | Failed to query basic information "
          "about the read/execute memory pages\n");
      return false;
    }
    if (info.State != MEM_COMMIT) {
      printf(
          "TEST-FAIL | SharedMappingCommit | Read/write commit hasn't changed "
          "the state of the read/execute memory pages: %lu\n",
          info.State);
      return false;
    }
    if (info.Protect != PAGE_EXECUTE_READ) {
      printf(
          "TEST-FAIL | SharedMappingCommit | Unexpected protection for the "
          "read/execute memory pages: %lu\n",
          info.Protect);
      return false;
    }
  }

  constexpr uint32_t kMagic = 0xdeadbeef;

  uint32_t* rwMagicAddr = static_cast<uint32_t*>(rwCommitAddress);
  *rwMagicAddr = kMagic;

  const uint32_t* rxMagicAddr = static_cast<const uint32_t*>(rxCommitAddress);
  if (*rxMagicAddr != kMagic) {
    printf(
        "TEST-FAIL | SharedMappingCommit | Read a different value through the "
        "read/execute view than was written through the read/write view\n");
    return false;
  }

  printf(
      "TEST-PASS | SharedMappingCommit | Committing memory pages through the "
      "read/write view also commited the corresponding pages in the "
      "read/execute view\n");
  return true;
}

int wmain(int argc, wchar_t* argv[]) {
  if (!TestSharedMappingCommit()) {
    return 1;
  }

  printf("TEST-PASS | SharedMappingCommit | All tests ran successfully\n");
  return 0;
}
