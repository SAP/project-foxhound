/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGTransformListParser.h"

#include "SVGContentUtils.h"
#include "SVGTransform.h"
#include "nsAtom.h"
#include "nsGkAtoms.h"

namespace mozilla {

//----------------------------------------------------------------------
// private methods

bool SVGTransformListParser::Parse() {
  mTransforms.Clear();
  return ParseTransforms();
}

bool SVGTransformListParser::ParseTransforms() {
  if (!SkipWsp()) {
    return true;
  }

  if (!ParseTransform()) {
    return false;
  }

  while (SkipWsp()) {
    // The SVG BNF allows multiple comma-wsp between transforms
    while (*mIter == ',') {
      ++mIter;
      if (!SkipWsp()) {
        return false;
      }
    }

    if (!ParseTransform()) {
      return false;
    }
  }
  return true;
}

bool SVGTransformListParser::ParseTransform() {
  nsAString::const_iterator start(mIter);
  while (IsAsciiAlpha(*mIter)) {
    ++mIter;
    if (mIter == mEnd) {
      return false;
    }
  }

  if (start == mIter) {
    // Didn't read anything
    return false;
  }

  using namespace mozilla::dom::SVGTransform_Binding;
  uint16_t transform =
      SVGTransform::GetTransformTypeForString(Substring(start, mIter));

  if (transform == SVG_TRANSFORM_UNKNOWN || !SkipWsp()) {
    return false;
  }

  switch (transform) {
    case SVG_TRANSFORM_TRANSLATE:
      return ParseTranslate();
    case SVG_TRANSFORM_SCALE:
      return ParseScale();
    case SVG_TRANSFORM_ROTATE:
      return ParseRotate();
    case SVG_TRANSFORM_SKEWX:
      return ParseSkewX();
    case SVG_TRANSFORM_SKEWY:
      return ParseSkewY();
    case SVG_TRANSFORM_MATRIX:
      return ParseMatrix();
  }
  return false;
}

bool SVGTransformListParser::ParseArguments(float* aResult, uint32_t aMaxCount,
                                            uint32_t* aParsedCount) {
  if (*mIter != '(') {
    return false;
  }
  ++mIter;

  if (!SkipWsp()) {
    return false;
  }

  if (!SVGContentUtils::ParseNumber(mIter, mEnd, aResult[0])) {
    return false;
  }
  *aParsedCount = 1;

  while (SkipWsp()) {
    if (*mIter == ')') {
      ++mIter;
      return true;
    }
    if (*aParsedCount == aMaxCount) {
      return false;
    }
    SkipCommaWsp();
    if (!SVGContentUtils::ParseNumber(mIter, mEnd,
                                      aResult[(*aParsedCount)++])) {
      return false;
    }
  }
  return false;
}

bool SVGTransformListParser::ParseTranslate() {
  float t[2];
  uint32_t count;

  if (!ParseArguments(t, std::size(t), &count)) {
    return false;
  }

  switch (count) {
    case 1:
      t[1] = 0.f;
      [[fallthrough]];
    case 2: {
      SVGTransform* transform = mTransforms.AppendElement(fallible);
      if (!transform) {
        return false;
      }
      transform->SetTranslate(t[0], t[1]);
      return true;
    }
  }

  return false;
}

bool SVGTransformListParser::ParseScale() {
  float s[2];
  uint32_t count;

  if (!ParseArguments(s, std::size(s), &count)) {
    return false;
  }

  switch (count) {
    case 1:
      s[1] = s[0];
      [[fallthrough]];
    case 2: {
      SVGTransform* transform = mTransforms.AppendElement(fallible);
      if (!transform) {
        return false;
      }
      transform->SetScale(s[0], s[1]);
      return true;
    }
  }

  return false;
}

bool SVGTransformListParser::ParseRotate() {
  float r[3];
  uint32_t count;

  if (!ParseArguments(r, std::size(r), &count)) {
    return false;
  }

  switch (count) {
    case 1:
      r[1] = r[2] = 0.f;
      [[fallthrough]];
    case 3: {
      SVGTransform* transform = mTransforms.AppendElement(fallible);
      if (!transform) {
        return false;
      }
      transform->SetRotate(r[0], r[1], r[2]);
      return true;
    }
  }

  return false;
}

bool SVGTransformListParser::ParseSkewX() {
  float skew;
  uint32_t count;

  if (!ParseArguments(&skew, 1, &count) || count != 1) {
    return false;
  }

  SVGTransform* transform = mTransforms.AppendElement(fallible);
  if (!transform) {
    return false;
  }
  transform->SetSkewX(skew);

  return true;
}

bool SVGTransformListParser::ParseSkewY() {
  float skew;
  uint32_t count;

  if (!ParseArguments(&skew, 1, &count) || count != 1) {
    return false;
  }

  SVGTransform* transform = mTransforms.AppendElement(fallible);
  if (!transform) {
    return false;
  }
  transform->SetSkewY(skew);

  return true;
}

bool SVGTransformListParser::ParseMatrix() {
  float m[6];
  uint32_t count;

  if (!ParseArguments(m, std::size(m), &count) || count != 6) {
    return false;
  }

  SVGTransform* transform = mTransforms.AppendElement(fallible);
  if (!transform) {
    return false;
  }
  transform->SetMatrix(gfxMatrix(m[0], m[1], m[2], m[3], m[4], m[5]));

  return true;
}

}  // namespace mozilla
