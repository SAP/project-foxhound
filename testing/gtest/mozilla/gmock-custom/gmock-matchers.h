// Copyright 2015, Google Inc.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Injection point for custom user configurations. See README for details
//
// GOOGLETEST_CM0002 DO NOT DELETE

#ifndef GMOCK_INCLUDE_GMOCK_INTERNAL_CUSTOM_GMOCK_MATCHERS_H_
#define GMOCK_INCLUDE_GMOCK_INTERNAL_CUSTOM_GMOCK_MATCHERS_H_

#include "nsTArray.h"
#include "mozilla/media/MediaUtils.h"

namespace testing {
namespace internal {

// Wrapper class that adds size() method to nsTArray for gmock compatibility
template <typename T>
class NsTArrayWrapper {
 public:
  using value_type = T;
  using const_iterator = typename nsTArray<T>::const_iterator;
  using size_type = typename nsTArray<T>::size_type;

  explicit NsTArrayWrapper(const nsTArray<T>& array) : array_(array) {}

  const_iterator begin() const { return array_.begin(); }
  const_iterator end() const { return array_.end(); }
  size_type size() const { return array_.Length(); }

  const T& operator[](size_type index) const { return array_[index]; }

 private:
  const nsTArray<T>& array_;
};

// StlContainerView specialization for Refcountable<nsTArray>
template <typename T>
class StlContainerView<nsTArray<T>> {
 public:
  using type = NsTArrayWrapper<T>;
  using const_reference = NsTArrayWrapper<T>;

  static const_reference ConstReference(const nsTArray<T>& array) {
    return NsTArrayWrapper<T>(array);
  }
  static nsTArray<T> Copy(const nsTArray<T>& array) { return array.Clone(); }
};

}  // namespace internal
}  // namespace testing

#endif  // GMOCK_INCLUDE_GMOCK_INTERNAL_CUSTOM_GMOCK_MATCHERS_H_
