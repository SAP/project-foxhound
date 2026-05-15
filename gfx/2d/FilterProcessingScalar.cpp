/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#define FILTER_PROCESSING_SCALAR

#include "FilterProcessingSIMD-inl.h"
#include "Logging.h"

namespace mozilla {
namespace gfx {

void FilterProcessing::ExtractAlpha_Scalar(const IntSize& size,
                                           const uint8_t* sourceData,
                                           int32_t sourceStride,
                                           uint8_t* alphaData,
                                           int32_t alphaStride) {
  for (int32_t y = 0; y < size.height; y++) {
    for (int32_t x = 0; x < size.width; x++) {
      int32_t sourceIndex = y * sourceStride + 4 * x;
      int32_t targetIndex = y * alphaStride + x;
      alphaData[targetIndex] =
          sourceData[sourceIndex + B8G8R8A8_COMPONENT_BYTEOFFSET_A];
    }
  }
}

already_AddRefed<DataSourceSurface> FilterProcessing::ConvertToB8G8R8A8_Scalar(
    SourceSurface* aSurface) {
  return ConvertToB8G8R8A8_SIMD<simd::Scalaru8x16_t>(aSurface);
}

template <MorphologyOperator Operator>
static void ApplyMorphologyHorizontal_Scalar(
    const uint8_t* aSourceData, int32_t aSourceStride, uint8_t* aDestData,
    int32_t aDestStride, const IntRect& aDestRect, int32_t aRadius) {
  static_assert(Operator == MORPHOLOGY_OPERATOR_ERODE ||
                    Operator == MORPHOLOGY_OPERATOR_DILATE,
                "unexpected morphology operator");

  for (int32_t y = aDestRect.Y(); y < aDestRect.YMost(); y++) {
    int32_t startX = aDestRect.X() - aRadius;
    int32_t endX = aDestRect.X() + aRadius;
    for (int32_t x = aDestRect.X(); x < aDestRect.XMost();
         x++, startX++, endX++) {
      int32_t sourceIndex = y * aSourceStride + 4 * startX;
      uint8_t u[4];
      for (int32_t i = 0; i < std::ssize(u); i++) {
        u[i] = aSourceData[sourceIndex + i];
      }
      sourceIndex += 4;
      for (int32_t ix = startX + 1; ix <= endX; ix++, sourceIndex += 4) {
        for (int32_t i = 0; i < std::ssize(u); i++) {
          if (Operator == MORPHOLOGY_OPERATOR_ERODE) {
            u[i] = umin(u[i], aSourceData[sourceIndex + i]);
          } else {
            u[i] = umax(u[i], aSourceData[sourceIndex + i]);
          }
        }
      }

      int32_t destIndex = y * aDestStride + 4 * x;
      for (int32_t i = 0; i < std::ssize(u); i++) {
        aDestData[destIndex + i] = u[i];
      }
    }
  }
}

void FilterProcessing::ApplyMorphologyHorizontal_Scalar(
    const uint8_t* aSourceData, int32_t aSourceStride, uint8_t* aDestData,
    int32_t aDestStride, const IntRect& aDestRect, int32_t aRadius,
    MorphologyOperator aOp) {
  if (aOp == MORPHOLOGY_OPERATOR_ERODE) {
    gfx::ApplyMorphologyHorizontal_Scalar<MORPHOLOGY_OPERATOR_ERODE>(
        aSourceData, aSourceStride, aDestData, aDestStride, aDestRect, aRadius);
  } else {
    gfx::ApplyMorphologyHorizontal_Scalar<MORPHOLOGY_OPERATOR_DILATE>(
        aSourceData, aSourceStride, aDestData, aDestStride, aDestRect, aRadius);
  }
}

template <MorphologyOperator Operator>
static void ApplyMorphologyVertical_Scalar(
    const uint8_t* aSourceData, int32_t aSourceStride, uint8_t* aDestData,
    int32_t aDestStride, const IntRect& aDestRect, int32_t aRadius) {
  static_assert(Operator == MORPHOLOGY_OPERATOR_ERODE ||
                    Operator == MORPHOLOGY_OPERATOR_DILATE,
                "unexpected morphology operator");

  int32_t startY = aDestRect.Y() - aRadius;
  int32_t endY = aDestRect.Y() + aRadius;
  for (int32_t y = aDestRect.Y(); y < aDestRect.YMost();
       y++, startY++, endY++) {
    for (int32_t x = aDestRect.X(); x < aDestRect.XMost(); x++) {
      int32_t sourceIndex = startY * aSourceStride + 4 * x;
      uint8_t u[4];
      for (int32_t i = 0; i < std::ssize(u); i++) {
        u[i] = aSourceData[sourceIndex + i];
      }
      sourceIndex += aSourceStride;
      for (int32_t iy = startY + 1; iy <= endY;
           iy++, sourceIndex += aSourceStride) {
        for (int32_t i = 0; i < std::ssize(u); i++) {
          if (Operator == MORPHOLOGY_OPERATOR_ERODE) {
            u[i] = umin(u[i], aSourceData[sourceIndex + i]);
          } else {
            u[i] = umax(u[i], aSourceData[sourceIndex + i]);
          }
        }
      }

      int32_t destIndex = y * aDestStride + 4 * x;
      for (int32_t i = 0; i < std::ssize(u); i++) {
        aDestData[destIndex + i] = u[i];
      }
    }
  }
}

void FilterProcessing::ApplyMorphologyVertical_Scalar(
    const uint8_t* aSourceData, int32_t aSourceStride, uint8_t* aDestData,
    int32_t aDestStride, const IntRect& aDestRect, int32_t aRadius,
    MorphologyOperator aOp) {
  if (aOp == MORPHOLOGY_OPERATOR_ERODE) {
    gfx::ApplyMorphologyVertical_Scalar<MORPHOLOGY_OPERATOR_ERODE>(
        aSourceData, aSourceStride, aDestData, aDestStride, aDestRect, aRadius);
  } else {
    gfx::ApplyMorphologyVertical_Scalar<MORPHOLOGY_OPERATOR_DILATE>(
        aSourceData, aSourceStride, aDestData, aDestStride, aDestRect, aRadius);
  }
}

already_AddRefed<DataSourceSurface> FilterProcessing::ApplyColorMatrix_Scalar(
    DataSourceSurface* aInput, const Matrix5x4& aMatrix) {
  return ApplyColorMatrix_SIMD<simd::Scalari32x4_t, simd::Scalari16x8_t,
                               simd::Scalaru8x16_t>(aInput, aMatrix);
}

void FilterProcessing::ApplyComposition_Scalar(DataSourceSurface* aSource,
                                               DataSourceSurface* aDest,
                                               CompositeOperator aOperator) {
  return ApplyComposition_SIMD<simd::Scalari32x4_t, simd::Scalaru16x8_t,
                               simd::Scalaru8x16_t>(aSource, aDest, aOperator);
}

void FilterProcessing::DoOpacityCalculation_Scalar(
    const IntSize& aSize, uint8_t* aTargetData, int32_t aTargetStride,
    const uint8_t* aSourceData, int32_t aSourceStride, Float aValue) {
  uint8_t alpha = uint8_t(roundf(255.f * aValue));
  for (int32_t y = 0; y < aSize.height; y++) {
    for (int32_t x = 0; x < aSize.width; x++) {
      int32_t inputIndex = y * aSourceStride + 4 * x;
      int32_t targetIndex = y * aTargetStride + 4 * x;
      aTargetData[targetIndex + B8G8R8A8_COMPONENT_BYTEOFFSET_R] =
          (aSourceData[inputIndex + B8G8R8A8_COMPONENT_BYTEOFFSET_R] * alpha) >>
          8;
      aTargetData[targetIndex + B8G8R8A8_COMPONENT_BYTEOFFSET_G] =
          (aSourceData[inputIndex + B8G8R8A8_COMPONENT_BYTEOFFSET_G] * alpha) >>
          8;
      aTargetData[targetIndex + B8G8R8A8_COMPONENT_BYTEOFFSET_B] =
          (aSourceData[inputIndex + B8G8R8A8_COMPONENT_BYTEOFFSET_B] * alpha) >>
          8;
      aTargetData[targetIndex + B8G8R8A8_COMPONENT_BYTEOFFSET_A] =
          (aSourceData[inputIndex + B8G8R8A8_COMPONENT_BYTEOFFSET_A] * alpha) >>
          8;
    }
  }
}

void FilterProcessing::DoOpacityCalculationA8_Scalar(
    const IntSize& aSize, uint8_t* aTargetData, int32_t aTargetStride,
    const uint8_t* aSourceData, int32_t aSourceStride, Float aValue) {
  uint8_t alpha = uint8_t(255.f * aValue);
  for (int32_t y = 0; y < aSize.height; y++) {
    for (int32_t x = 0; x < aSize.width; x++) {
      int32_t inputIndex = y * aSourceStride;
      int32_t targetIndex = y * aTargetStride;
      aTargetData[targetIndex] =
          FastDivideBy255<uint8_t>(aSourceData[inputIndex] * alpha);
    }
  }
}

already_AddRefed<DataSourceSurface> FilterProcessing::RenderTurbulence_Scalar(
    const IntSize& aSize, const Point& aOffset, const Size& aBaseFrequency,
    int32_t aSeed, int aNumOctaves, TurbulenceType aType, bool aStitch,
    const Rect& aTileRect) {
  return RenderTurbulence_SIMD<simd::Scalarf32x4_t, simd::Scalari32x4_t,
                               simd::Scalaru8x16_t>(
      aSize, aOffset, aBaseFrequency, aSeed, aNumOctaves, aType, aStitch,
      aTileRect);
}

already_AddRefed<DataSourceSurface>
FilterProcessing::ApplyArithmeticCombine_Scalar(DataSourceSurface* aInput1,
                                                DataSourceSurface* aInput2,
                                                Float aK1, Float aK2, Float aK3,
                                                Float aK4) {
  return ApplyArithmeticCombine_SIMD<simd::Scalari32x4_t, simd::Scalari16x8_t,
                                     simd::Scalaru8x16_t>(aInput1, aInput2, aK1,
                                                          aK2, aK3, aK4);
}

}  // namespace gfx
}  // namespace mozilla
