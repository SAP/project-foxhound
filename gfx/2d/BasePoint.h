/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_GFX_BASEPOINT_H_
#define MOZILLA_GFX_BASEPOINT_H_

#include <cmath>
#include <ostream>
#include <type_traits>
#include "mozilla/Attributes.h"
#include "mozilla/FloatingPoint.h"
#include "Coord.h"

namespace mozilla {
namespace gfx {

template <class T, typename EnableT = void>
struct FloatType;

template <typename T>
struct FloatType<T, typename std::enable_if_t<std::is_integral_v<T>>> {
  using type = float;
};

template <typename T>
struct FloatType<T, typename std::enable_if_t<std::is_floating_point_v<T>>> {
  using type = T;
};

template <typename Units, typename Rep>
struct FloatType<IntCoordTyped<Units, Rep>> {
  using type = CoordTyped<Units, float>;
};

template <typename Units, typename Rep>
struct FloatType<CoordTyped<Units, Rep>> {
  using type = CoordTyped<Units, Rep>;
};

template <typename T>
using FloatType_t = typename FloatType<T>::type;

/**
 * Do not use this class directly. Subclass it, pass that subclass as the
 * Sub parameter, and only use that subclass. This allows methods to safely
 * cast 'this' to 'Sub*'.
 */
template <class T, class Sub, class Coord = T>
struct BasePoint {
  union {
    struct {
      Coord x, y;
    };
    Coord components[2];
  };

  // Constructors
  constexpr BasePoint() : x(0), y(0) {}
  constexpr BasePoint(Coord aX, Coord aY) : x(aX), y(aY) {}

  MOZ_ALWAYS_INLINE Coord X() const { return x; }
  MOZ_ALWAYS_INLINE Coord Y() const { return y; }

  void MoveTo(Coord aX, Coord aY) {
    x = aX;
    y = aY;
  }
  void MoveBy(Coord aDx, Coord aDy) {
    x += aDx;
    y += aDy;
  }

  // Note that '=' isn't defined so we'll get the
  // compiler generated default assignment operator

  bool operator==(const Sub& aPoint) const {
    return x == aPoint.x && y == aPoint.y;
  }
  bool operator!=(const Sub& aPoint) const {
    return x != aPoint.x || y != aPoint.y;
  }

  Sub operator+(const Sub& aPoint) const {
    return Sub(x + aPoint.x, y + aPoint.y);
  }
  Sub operator-(const Sub& aPoint) const {
    return Sub(x - aPoint.x, y - aPoint.y);
  }
  Sub& operator+=(const Sub& aPoint) {
    x += aPoint.x;
    y += aPoint.y;
    return *static_cast<Sub*>(this);
  }
  Sub& operator-=(const Sub& aPoint) {
    x -= aPoint.x;
    y -= aPoint.y;
    return *static_cast<Sub*>(this);
  }

  Sub operator*(T aScale) const { return Sub(x * aScale, y * aScale); }
  Sub operator/(T aScale) const { return Sub(x / aScale, y / aScale); }

  Sub operator-() const { return Sub(-x, -y); }

  T DotProduct(const Sub& aPoint) const {
    return x.value * aPoint.x.value + y.value * aPoint.y.value;
  }

  FloatType_t<Coord> Length() const {
    return FloatType_t<Coord>(hypot(x.value, y.value));
  }

  T LengthSquare() const { return x.value * x.value + y.value * y.value; }

  // Round() is *not* rounding to nearest integer if the values are negative.
  // They are always rounding as floor(n + 0.5).
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=410748#c14
  Sub& Round() {
    x = Coord(std::floor(T(x) + T(0.5f)));
    y = Coord(std::floor(T(y) + T(0.5f)));
    return *static_cast<Sub*>(this);
  }

  // "Finite" means not inf and not NaN
  bool IsFinite() const {
    using FloatType =
        std::conditional_t<std::is_same_v<T, float>, float, double>;
    return (std::isfinite(FloatType(x)) && std::isfinite(FloatType(y)));
  }

  void Clamp(Coord aMaxAbsValue) {
    x = std::max(std::min(x, aMaxAbsValue), -aMaxAbsValue);
    y = std::max(std::min(y, aMaxAbsValue), -aMaxAbsValue);
  }

  friend std::ostream& operator<<(std::ostream& stream,
                                  const BasePoint<T, Sub, Coord>& aPoint) {
    return stream << '(' << aPoint.x << ',' << aPoint.y << ')';
  }
};

}  // namespace gfx
}  // namespace mozilla

#endif /* MOZILLA_GFX_BASEPOINT_H_ */
