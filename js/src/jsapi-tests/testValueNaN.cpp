/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/Casting.h"

#include <cmath>
#include <stdint.h>

#include "js/Value.h"
#include "jsapi-tests/tests.h"

using mozilla::BitwiseCast;

BEGIN_TEST(testValueCanonicalizeNaN) {
  const uint64_t canonicalBits = JS::NaNValue().asRawBits();

  // Assorted non-canonical NaN bit patterns.
  static constexpr uint64_t nonCanonicalNaNs[] = {
      0x7ff8000000000001ULL, 0xfff8000000000000ULL, 0x7ff0000000000001ULL,
      0x7fffffffffffffffULL, 0xfffc000000000000ULL, 0xffffffffffffffffULL,
  };

  for (uint64_t bits : nonCanonicalNaNs) {
    double nan = BitwiseCast<double>(bits);
    CHECK(std::isnan(nan));

    // JS::CanonicalizeNaN itself.
    CHECK(BitwiseCast<uint64_t>(JS::CanonicalizeNaN(nan)) == canonicalBits);

    // Value setters.
    {
      JS::Value v;
      v.setDouble(nan);
      CHECK(v.isDouble());
      CHECK(v.isNaN());
      CHECK(v.asRawBits() == canonicalBits);
    }
    {
      JS::Value v;
      v.setNumber(nan);
      CHECK(v.isDouble());
      CHECK(v.isNaN());
      CHECK(v.asRawBits() == canonicalBits);
    }

    // Rooted<Value> setters.
    {
      JS::Rooted<JS::Value> v(cx);
      v.setDouble(nan);
      CHECK(v.isDouble());
      CHECK(v.asRawBits() == canonicalBits);
    }
    {
      JS::Rooted<JS::Value> v(cx);
      v.setNumber(nan);
      CHECK(v.isDouble());
      CHECK(v.asRawBits() == canonicalBits);
    }

    CHECK(JS::DoubleValue(nan).asRawBits() == canonicalBits);
    CHECK(JS::NumberValue(nan).asRawBits() == canonicalBits);
    CHECK(JS_NumberValue(nan).asRawBits() == canonicalBits);
  }

  static constexpr uint32_t nonCanonicalFloatNaNs[] = {
      0x7fc00001, 0xffc00000, 0x7f800001, 0x7fffffff, 0xffffffff,
  };

  for (uint32_t bits : nonCanonicalFloatNaNs) {
    float nan = BitwiseCast<float>(bits);
    CHECK(std::isnan(nan));

    JS::Value v = JS::Float32Value(nan);
    CHECK(v.isDouble());
    CHECK(v.isNaN());
    CHECK(v.asRawBits() == canonicalBits);
  }

  return true;
}
END_TEST(testValueCanonicalizeNaN)
