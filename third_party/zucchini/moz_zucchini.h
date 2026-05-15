/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZ_ZUCCHINI_H
#define MOZ_ZUCCHINI_H

// This is the zucchini interface exposed to updater.cpp. To mimic the way we
// interface with bspatch, this interface assumes that the caller will first
// load a patch, then check the size and crc32 of the source file on their own,
// and finally call us back to apply the patch. To achieve this, we essentially
// split zucchini::ApplyCommon into two separate functions MappedPatch::Load
// and MappedPatch::ApplyUnsafe. The latter is called unsafe because we rely on
// the assumption that the caller has properly checked the size and crc32 of
// the source file. For this purpose, we also expose a function to compute the
// zucchini crc32.

#include <cstdio>
#include <cstdint>

namespace zucchini {

namespace status {

// Zucchini status code, which can also be used as process exit code. Therefore
// success is explicitly 0.
enum Code {
  kStatusSuccess = 0,
  kStatusInvalidParam = 1,
  kStatusFileReadError = 2,
  kStatusFileWriteError = 3,
  kStatusPatchReadError = 4,
  kStatusPatchWriteError = 5,
  kStatusInvalidOldImage = 6,
  kStatusInvalidNewImage = 7,
  kStatusDiskFull = 8,
  kStatusIoError = 9,
  kStatusFatal = 10,
};

}  // namespace status

namespace mozilla {

using LogFunctionPtr = void (*)(const char* aMessage);
void SetLogFunction(LogFunctionPtr aLogFunction);

uint32_t ComputeCrc32(const uint8_t* aBuf, size_t aBufSize);

class MappedPatchImpl;

class MappedPatch {
 public:
  MappedPatch();
  ~MappedPatch();

  status::Code Load(FILE* aPatchFile, uint32_t* aSourceSize,
                    uint32_t* aDestinationSize, uint32_t* aSourceCrc32);

  // Applies the loaded patch to aOldImage, and writes the result to
  // aNewFile. aNewFile is never deleted, cleanup is up to the caller.
  // Assumes that the crc32 and size of aCheckOldImage have already been
  // checked by the caller, hence the name.
  status::Code ApplyUnsafe(const uint8_t* aCheckedOldImage,
                           size_t aCheckedOldImageSize, FILE* aNewFile);

 private:
  MappedPatchImpl* mImpl;
};

}  // namespace mozilla

}  // namespace zucchini

#endif  // MOZ_ZUCCHINI_H
