/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_GFX_RECORDINGTYPES_H_
#define MOZILLA_GFX_RECORDINGTYPES_H_

#include <type_traits>

#include "mozilla/Vector.h"
#include "Logging.h"

namespace mozilla {
namespace gfx {

template <class S, class T>
struct ElementStreamFormat {
  static void Write(S& aStream, const T& aElement) {
    static_assert(std::is_trivially_copyable_v<T>);
    aStream.write(reinterpret_cast<const char*>(&aElement), sizeof(T));
  }

  // Tries to read a value of Type T from aStream and store it in aElement.
  // Returns false if failed to do so, in which case aElement is unchanged.
  [[nodiscard]] static bool Read(S& aStream, T& aElement) {
    static_assert(std::is_trivially_copyable_v<T>);
    return aStream.read(reinterpret_cast<char*>(&aElement), sizeof(T));
  }
};

template <class S>
struct ElementStreamFormat<S, bool> {
  static void Write(S& aStream, const bool& aElement) {
    char boolChar = aElement ? '\x01' : '\x00';
    aStream.write(&boolChar, sizeof(boolChar));
  }

  // Tries to read a boolean value from aStream and store it in aElement.
  // Returns false if failed to do so, in which case aElement is unchanged.
  [[nodiscard]] static bool Read(S& aStream, bool& aElement) {
    char boolChar;
    if (!aStream.read(&boolChar, sizeof(boolChar))) {
      return false;
    }
    switch (boolChar) {
      case '\x00':
        aElement = false;
        return true;
      case '\x01':
        aElement = true;
        return true;
      default:
        aStream.SetIsBad();
        return false;
    }
  }
};

template <class S, class T>
void WriteElement(S& aStream, const T& aElement) {
  ElementStreamFormat<S, T>::Write(aStream, aElement);
}
template <class S, class T, size_t N>
void WriteVector(S& aStream, const mozilla::Vector<T, N>& aVector) {
  size_t size = aVector.length();
  WriteElement(aStream, size);
  if (size) {
    aStream.write(reinterpret_cast<const char*>(aVector.begin()),
                  sizeof(T) * size);
  }
}

// Read a value of type T from aStream and store it in aElement. If the read
// operation fails for any reason, aElement is set to the default-initialized
// value of T and the stream is set to bad state.
// ReadElement is disabled for enum types. Use ReadElementConstrained instead.
template <class S, class T,
          typename = typename std::enable_if<!std::is_enum<T>::value>::type>
void ReadElement(S& aStream, T& aElement) {
  if (!ElementStreamFormat<S, T>::Read(aStream, aElement)) {
    aElement = T{};
  }
}

// Read a value of type T from aStream within [aMinValue, aMaxValue] and store
// it in aElement.  If the read operation fails for any reason, or if the read
// element is not in the provided range, aElement is set to the
// default-initialized value of T and the stream is set to bad state.
template <class S, class T>
void ReadElementConstrained(S& aStream, T& aElement, const T& aMinValue,
                            const T& aMaxValue) {
  std::underlying_type_t<T> value;
  ReadElement(aStream, value);

  auto minInt = static_cast<std::underlying_type_t<T>>(aMinValue);
  auto maxInt = static_cast<std::underlying_type_t<T>>(aMaxValue);

  if (value < minInt || value > maxInt) {
    aStream.SetIsBad();
  } else {
    aElement = static_cast<T>(value);
  }
}

// Read a sequence of values of type T from aStream and store them in aElement.
// If the read operation fails for any reason, or if the size of the sequence
// leads to vector initialization failure, aElement is cleared and the stream is
// set to bad state.
template <class S, class T, size_t N>
void ReadVector(S& aStream, mozilla::Vector<T, N>& aVector) {
  size_t size;
  ReadElement(aStream, size);
  if (size && aStream.good()) {
    if (!aVector.initLengthUninitialized(size)) {
      aStream.SetIsBad();
      return;
    }
    if (!aStream.read(reinterpret_cast<char*>(aVector.begin()),
                      sizeof(T) * size)) {
      aVector.clearAndFree();
      return;
    }
  } else {
    aVector.clearAndFree();
  }
}

}  // namespace gfx
}  // namespace mozilla

#endif /* MOZILLA_GFX_RECORDINGTYPES_H_ */
