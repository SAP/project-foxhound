/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/Assertions.h"
#include "mozilla/Unused.h"
#include "mozilla/Vector.h"
#include "mozilla/fuzzing/Nyx.h"
#include "prinrval.h"
#include "prthread.h"

#include <algorithm>
#include <fstream>

#include <unistd.h>

namespace mozilla {
namespace fuzzing {

Nyx::Nyx() {}

// static
Nyx& Nyx::instance() {
  static Nyx nyx;
  return nyx;
}

extern "C" {
MOZ_EXPORT __attribute__((weak)) void nyx_start(void);
MOZ_EXPORT __attribute__((weak)) uint32_t nyx_get_next_fuzz_data(void*,
                                                                 uint32_t);
MOZ_EXPORT __attribute__((weak)) void nyx_release(uint32_t);
MOZ_EXPORT __attribute__((weak)) void nyx_handle_event(const char*, const char*,
                                                       int, const char*);
MOZ_EXPORT __attribute__((weak)) void nyx_puts(const char*);
}

/*
 * In this macro, we must avoid calling MOZ_CRASH and friends, as these
 * calls will redirect to the Nyx event handler routines. If the library
 * is not properly preloaded, we will crash in the process. Instead, emit
 * a descriptive error and then force a crash that won't be redirected.
 */
#define NYX_CHECK_API(func)                                                    \
  if (!func) {                                                                 \
    fprintf(                                                                   \
        stderr,                                                                \
        "Error: Nyx library must be in LD_PRELOAD. Missing function \"%s\"\n", \
        #func);                                                                \
    MOZ_REALLY_CRASH(__LINE__);                                                \
  }

void Nyx::start(void) {
  MOZ_RELEASE_ASSERT(!mInited);
  mInited = true;

  // Check if we are in replay mode.
  char* testFilePtr = getenv("MOZ_FUZZ_TESTFILE");
  if (testFilePtr) {
    mReplayMode = true;

    MOZ_FUZZING_NYX_PRINT("[Replay Mode] Reading data file...\n");

    std::string testFile(testFilePtr);
    std::ifstream is;
    is.open(testFile, std::ios::binary);

    uint64_t chksum, num_ops, num_data, op_offset, data_offset;

    // If only C++ supported streaming operators on binary files...
    is.read(reinterpret_cast<char*>(&chksum), sizeof(uint64_t));
    is.read(reinterpret_cast<char*>(&num_ops), sizeof(uint64_t));
    is.read(reinterpret_cast<char*>(&num_data), sizeof(uint64_t));
    is.read(reinterpret_cast<char*>(&op_offset), sizeof(uint64_t));
    is.read(reinterpret_cast<char*>(&data_offset), sizeof(uint64_t));

    if (!is.good()) {
      MOZ_FUZZING_NYX_PRINT("[Replay Mode] Error reading input file.\n");
      _exit(1);
    }

    is.seekg(data_offset);

    // The data chunks we receive through Nyx are stored in the data
    // section of the testfile as chunks prefixed with a 16-bit data
    // length. We read all chunks and store them away to simulate how
    // we originally received the data via Nyx.

    while (is.good()) {
      uint16_t pktsize;
      is.read(reinterpret_cast<char*>(&pktsize), sizeof(uint16_t));

      if (!is.good()) {
        break;
      }

      auto buffer = new Vector<uint8_t>();

      mozilla::Unused << buffer->initLengthUninitialized(pktsize);
      is.read(reinterpret_cast<char*>(buffer->begin()), buffer->length());

      MOZ_FUZZING_NYX_PRINTF("[Replay Mode] Read data packet of size %zu\n",
                             buffer->length());

      mReplayBuffers.push_back(buffer);
    }

    if (!mReplayBuffers.size()) {
      MOZ_FUZZING_NYX_PRINT("[Replay Mode] Error: No buffers read.\n");
      _exit(1);
    }

    is.close();

    if (!!getenv("MOZ_FUZZ_WAIT_BEFORE_REPLAY")) {
      // This can be useful in some cases to reproduce intermittent issues.
      PR_Sleep(PR_MillisecondsToInterval(5000));
    }

    return;
  }

  NYX_CHECK_API(nyx_start);
  NYX_CHECK_API(nyx_get_next_fuzz_data);
  NYX_CHECK_API(nyx_release);
  NYX_CHECK_API(nyx_handle_event);
  NYX_CHECK_API(nyx_puts);

  nyx_start();
}

bool Nyx::started(void) { return mInited; }

bool Nyx::is_enabled(const char* identifier) {
  static char* fuzzer = getenv("NYX_FUZZER");
  if (!fuzzer || strcmp(fuzzer, identifier)) {
    return false;
  }
  return true;
}

bool Nyx::is_replay() { return mReplayMode; }

uint32_t Nyx::get_data(uint8_t* data, uint32_t size) {
  MOZ_RELEASE_ASSERT(mInited);

  if (mReplayMode) {
    if (!mReplayBuffers.size()) {
      return 0xFFFFFFFF;
    }

    Vector<uint8_t>* buffer = mReplayBuffers.front();
    mReplayBuffers.pop_front();

    size = std::min(size, (uint32_t)buffer->length());
    memcpy(data, buffer->begin(), size);

    delete buffer;

    return size;
  }

  return nyx_get_next_fuzz_data(data, size);
}

void Nyx::release(uint32_t iterations) {
  MOZ_RELEASE_ASSERT(mInited);

  if (mReplayMode) {
    MOZ_FUZZING_NYX_PRINT("[Replay Mode] Nyx::release() called.\n");

    // If we reach this point in replay mode, we are essentially done.
    // Let's wait a bit further for things to settle and then exit.
    PR_Sleep(PR_MillisecondsToInterval(5000));
    _exit(1);
  }

  nyx_release(iterations);
}

void Nyx::handle_event(const char* type, const char* file, int line,
                       const char* reason) {
  if (mReplayMode) {
    MOZ_FUZZING_NYX_PRINTF(
        "[Replay Mode] Nyx::handle_event() called: %s at %s:%d : %s\n", type,
        file, line, reason);
    return;
  }

  if (mInited) {
    nyx_handle_event(type, file, line, reason);
  } else {
    // We can have events such as MOZ_CRASH even before we snapshot.
    // Output some useful information to make it clear where it happened.
    MOZ_FUZZING_NYX_PRINTF(
        "[ERROR] PRE SNAPSHOT Nyx::handle_event() called: %s at %s:%d : %s\n",
        type, file, line, reason);
  }
}

}  // namespace fuzzing
}  // namespace mozilla
