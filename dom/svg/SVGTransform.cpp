/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGTransform.h"

#include "nsContentUtils.h"  // for NS_ENSURE_FINITE
#include "nsError.h"
#include "nsMathUtils.h"
#include "nsTextFormatter.h"

namespace mozilla {

using namespace dom::SVGTransform_Binding;

void SVGTransform::GetValueAsString(nsAString& aValue) const {
  switch (mType) {
    case SVG_TRANSFORM_TRANSLATE:
      // The spec say that if Y is not provided, it is assumed to be zero.
      if (mMatrix._32 != 0)
        nsTextFormatter::ssprintf(aValue, u"translate(%g, %g)", mMatrix._31,
                                  mMatrix._32);
      else
        nsTextFormatter::ssprintf(aValue, u"translate(%g)", mMatrix._31);
      break;
    case SVG_TRANSFORM_ROTATE:
      if (mOrigin != gfx::Point())
        nsTextFormatter::ssprintf(aValue, u"rotate(%g, %g, %g)", mAngle,
                                  mOrigin.x, mOrigin.y);
      else
        nsTextFormatter::ssprintf(aValue, u"rotate(%g)", mAngle);
      break;
    case SVG_TRANSFORM_SCALE:
      if (mMatrix._11 != mMatrix._22)
        nsTextFormatter::ssprintf(aValue, u"scale(%g, %g)", mMatrix._11,
                                  mMatrix._22);
      else
        nsTextFormatter::ssprintf(aValue, u"scale(%g)", mMatrix._11);
      break;
    case SVG_TRANSFORM_SKEWX:
      nsTextFormatter::ssprintf(aValue, u"skewX(%g)", mAngle);
      break;
    case SVG_TRANSFORM_SKEWY:
      nsTextFormatter::ssprintf(aValue, u"skewY(%g)", mAngle);
      break;
    case SVG_TRANSFORM_MATRIX:
      nsTextFormatter::ssprintf(aValue, u"matrix(%g, %g, %g, %g, %g, %g)",
                                mMatrix._11, mMatrix._12, mMatrix._21,
                                mMatrix._22, mMatrix._31, mMatrix._32);
      break;
    default:
      aValue.Truncate();
      NS_ERROR("unknown transformation type");
      break;
  }
}

void SVGTransform::SetMatrix(const gfxMatrix& aMatrix) {
  mType = SVG_TRANSFORM_MATRIX;
  mMatrix = aMatrix;
  // We set the other members here too, since operator== requires it and
  // the DOM requires it for mAngle.
  mAngle = 0.f;
  mOrigin = gfx::Point();
}

void SVGTransform::SetTranslate(float aTx, float aTy) {
  mType = SVG_TRANSFORM_TRANSLATE;
  mMatrix = gfxMatrix::Translation(aTx, aTy);
  mAngle = 0.f;
  mOrigin = gfx::Point();
}

void SVGTransform::SetScale(float aSx, float aSy) {
  mType = SVG_TRANSFORM_SCALE;
  mMatrix = gfxMatrix::Scaling(aSx, aSy);
  mAngle = 0.f;
  mOrigin = gfx::Point();
}

void SVGTransform::SetRotate(float aAngle, float aCx, float aCy) {
  mType = SVG_TRANSFORM_ROTATE;
  mMatrix = gfxMatrix::Translation(aCx, aCy)
                .PreRotate(aAngle * kRadPerDegree)
                .PreTranslate(-aCx, -aCy);
  mAngle = aAngle;
  mOrigin.MoveTo(aCx, aCy);
}

nsresult SVGTransform::SetSkewX(float aAngle) {
  double ta = tan(aAngle * kRadPerDegree);
  // No one actually cares about the exact error return type here.
  NS_ENSURE_FINITE(ta, NS_ERROR_INVALID_ARG);

  mType = SVG_TRANSFORM_SKEWX;
  mMatrix = gfxMatrix();
  mMatrix._21 = ta;
  mAngle = aAngle;
  mOrigin = gfx::Point();
  return NS_OK;
}

nsresult SVGTransform::SetSkewY(float aAngle) {
  double ta = tan(aAngle * kRadPerDegree);
  // No one actually cares about the exact error return type here.
  NS_ENSURE_FINITE(ta, NS_ERROR_INVALID_ARG);

  mType = SVG_TRANSFORM_SKEWY;
  mMatrix = gfxMatrix();
  mMatrix._12 = ta;
  mAngle = aAngle;
  mOrigin = gfx::Point();
  return NS_OK;
}

uint16_t SVGTransform::GetTransformTypeForString(
    const nsAString& aTransformType) {
  if (aTransformType.EqualsLiteral("translate")) {
    return SVG_TRANSFORM_TRANSLATE;
  }
  if (aTransformType.EqualsLiteral("scale")) {
    return SVG_TRANSFORM_SCALE;
  }
  if (aTransformType.EqualsLiteral("rotate")) {
    return SVG_TRANSFORM_ROTATE;
  }
  if (aTransformType.EqualsLiteral("skewX")) {
    return SVG_TRANSFORM_SKEWX;
  }
  if (aTransformType.EqualsLiteral("skewY")) {
    return SVG_TRANSFORM_SKEWY;
  }
  if (aTransformType.EqualsLiteral("matrix")) {
    return SVG_TRANSFORM_MATRIX;
  }
  return SVG_TRANSFORM_UNKNOWN;
}

SVGTransformSMILData::SVGTransformSMILData(const SVGTransform& aTransform)
    : mTransformType(aTransform.Type()) {
  MOZ_ASSERT(mTransformType >= SVG_TRANSFORM_MATRIX &&
                 mTransformType <= SVG_TRANSFORM_SKEWY,
             "Unexpected transform type");

  mParams.fill(0.f);

  switch (mTransformType) {
    case SVG_TRANSFORM_MATRIX: {
      const gfxMatrix& mx = aTransform.GetMatrix();
      mParams[0] = static_cast<float>(mx._11);
      mParams[1] = static_cast<float>(mx._12);
      mParams[2] = static_cast<float>(mx._21);
      mParams[3] = static_cast<float>(mx._22);
      mParams[4] = static_cast<float>(mx._31);
      mParams[5] = static_cast<float>(mx._32);
      break;
    }
    case SVG_TRANSFORM_TRANSLATE: {
      const gfxMatrix& mx = aTransform.GetMatrix();
      mParams[0] = static_cast<float>(mx._31);
      mParams[1] = static_cast<float>(mx._32);
      break;
    }
    case SVG_TRANSFORM_SCALE: {
      const gfxMatrix& mx = aTransform.GetMatrix();
      mParams[0] = static_cast<float>(mx._11);
      mParams[1] = static_cast<float>(mx._22);
      break;
    }
    case SVG_TRANSFORM_ROTATE:
      mParams[0] = aTransform.Angle();
      aTransform.GetRotationOrigin(mParams[1], mParams[2]);
      break;

    case SVG_TRANSFORM_SKEWX:
    case SVG_TRANSFORM_SKEWY:
      mParams[0] = aTransform.Angle();
      break;

    default:
      MOZ_ASSERT_UNREACHABLE("Unexpected transform type");
      break;
  }
}

SVGTransform SVGTransformSMILData::ToSVGTransform() const {
  SVGTransform result;

  switch (mTransformType) {
    case SVG_TRANSFORM_MATRIX:
      result.SetMatrix(gfxMatrix(mParams[0], mParams[1], mParams[2], mParams[3],
                                 mParams[4], mParams[5]));
      break;

    case SVG_TRANSFORM_TRANSLATE:
      result.SetTranslate(mParams[0], mParams[1]);
      break;

    case SVG_TRANSFORM_SCALE:
      result.SetScale(mParams[0], mParams[1]);
      break;

    case SVG_TRANSFORM_ROTATE:
      result.SetRotate(mParams[0], mParams[1], mParams[2]);
      break;

    case SVG_TRANSFORM_SKEWX:
      result.SetSkewX(mParams[0]);
      break;

    case SVG_TRANSFORM_SKEWY:
      result.SetSkewY(mParams[0]);
      break;

    default:
      MOZ_ASSERT_UNREACHABLE("Unexpected transform type");
      break;
  }
  return result;
}

nsresult SVGTransformSMILData::Distance(const SVGTransformSMILData& aOther,
                                        double& aDistance) const {
  NS_ASSERTION(mTransformType == aOther.mTransformType,
               "Incompatible transform types to calculate distance between");

  switch (mTransformType) {
    // We adopt the SVGT1.2 notions of distance here
    // See: http://www.w3.org/TR/SVGTiny12/animate.html#complexDistances
    // (As discussed in bug #469040)
    case SVG_TRANSFORM_TRANSLATE:
    case SVG_TRANSFORM_SCALE: {
      aDistance = NS_hypot(mParams[0] - aOther.mParams[0],
                           mParams[1] - aOther.mParams[1]);
    } break;

    case SVG_TRANSFORM_ROTATE:
    case SVG_TRANSFORM_SKEWX:
    case SVG_TRANSFORM_SKEWY: {
      aDistance = std::abs(mParams[0] - aOther.mParams[0]);
    } break;

    default:
      NS_ERROR("Got bad transform types for calculating distances");
      aDistance = 1.0f;
      return NS_ERROR_FAILURE;
  }
  return NS_OK;
}

}  // namespace mozilla
