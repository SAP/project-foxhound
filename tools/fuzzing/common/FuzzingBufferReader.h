/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef TOOLS_FUZZING_COMMON_FUZZINGBUFFERREADER_H_
#define TOOLS_FUZZING_COMMON_FUZZINGBUFFERREADER_H_

#include "mozilla/Assertions.h"
#include "mozilla/Result.h"
#include "mozilla/ResultVariant.h"

namespace mozilla {

enum TestFuncRetValue : int { RET_SUCCESS = 0 };

// Allow TestFuncRetValue errors to automatically convert to bool values, so
// MOZ_TRY can be used in int returning methods with Result<T, TestFuncRetValue>
// results.
template <>
class [[nodiscard]] GenericErrorResult<TestFuncRetValue> {
  TestFuncRetValue mErrorValue;

  template <typename V, typename E2>
  friend class Result;

 public:
  explicit GenericErrorResult(TestFuncRetValue aErrorValue)
      : mErrorValue(aErrorValue) {}

  GenericErrorResult(TestFuncRetValue aErrorValue, const ErrorPropagationTag&)
      : GenericErrorResult(aErrorValue) {}

  MOZ_IMPLICIT operator int() const { return mErrorValue; }
};

// This allows using MOZ_TRY to unpack data from the libFuzzer test buffer.
//
//  static int testCallback(const uint8_t* buf, size_t size) {
//    FuzzingBufferReader fuzzBuf(buf, size);
//
//    int32_t data = MOZ_TRY(fuzzBuf.Read<int32_t>());
//    ...
//  }
//
// If the remaining buffer data is less than requested, MOZ_TRY returns 0 to
// end the iteration.
class FuzzingBufferReader {
 public:
  FuzzingBufferReader(const uint8_t* buf, size_t size)
      : mPos(buf), mEnd(buf + size) {
    MOZ_RELEASE_ASSERT(mPos <= mEnd);
  }

  size_t Length() { return mEnd - mPos; }

  const uint8_t* Pos() { return mPos; }

  template <typename T>
  Result<T, TestFuncRetValue> Read() {
    if (Length() < sizeof(T)) {
      return Err(RET_SUCCESS);
    }
    T result = *reinterpret_cast<const T*>(mPos);
    mPos += sizeof(T);
    return result;
  }

 private:
  const uint8_t* mPos;
  const uint8_t* const mEnd;
};

}  // namespace mozilla

#endif  // TOOLS_FUZZING_COMMON_FUZZINGBUFFERREADER_H_
