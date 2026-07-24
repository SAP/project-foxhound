/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsMathUtils_h_
#define nsMathUtils_h_

#include "nscore.h"
#include <cmath>
#include <float.h>

#if defined(XP_SOLARIS)
#  include <ieeefp.h>
#endif

/*
 * round
 */
inline double NS_round(double aNum) {
  return aNum >= 0.0 ? floor(aNum + 0.5) : ceil(aNum - 0.5);
}
inline float NS_roundf(float aNum) {
  return aNum >= 0.0f ? floorf(aNum + 0.5f) : ceilf(aNum - 0.5f);
}
inline int32_t NS_lround(double aNum) {
  return aNum >= 0.0 ? int32_t(aNum + 0.5) : int32_t(aNum - 0.5);
}

inline int32_t NS_lroundf(float aNum) {
  return aNum >= 0.0f ? int32_t(aNum + 0.5f) : int32_t(aNum - 0.5f);
}

/*
 * hypot.  We don't need a super accurate version of this, if a platform
 * turns up with none of the possibilities below it would be okay to fall
 * back to sqrt(x*x + y*y).
 */
inline double NS_hypot(double aNum1, double aNum2) {
#ifdef __GNUC__
  return __builtin_hypot(aNum1, aNum2);
#elif defined _WIN32
  return _hypot(aNum1, aNum2);
#else
  return hypot(aNum1, aNum2);
#endif
}

/**
 * Returns the result of the modulo of x by y using a floored division.
 * fmod(x, y) is using a truncated division.
 * The main difference is that the result of this method will have the sign of
 * y while the result of fmod(x, y) will have the sign of x.
 */
inline double NS_floorModulo(double aNum1, double aNum2) {
  return (aNum1 - aNum2 * floor(aNum1 / aNum2));
}

#endif
