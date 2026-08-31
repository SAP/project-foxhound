/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef GFXMESSAGEUTILS_H_
#define GFXMESSAGEUTILS_H_

#include "DriverCrashGuard.h"
#include "FilterSupport.h"
#include "ImageTypes.h"
#include "RegionBuilder.h"
#include "chrome/common/ipc_message_utils.h"
#include "gfxFeature.h"
#include "gfxFallback.h"
#include "gfxPoint.h"
#include "gfxRect.h"
#include "gfxSparseBitSet.h"
#include "gfxTelemetry.h"
#include "gfxTypes.h"
#include "ipc/EnumSerializer.h"
#include "mozilla/EnumTypeTraits.h"
#include "ipc/IPCMessageUtilsSpecializations.h"
#include "mozilla/gfx/CrossProcessPaint.h"
#include "mozilla/gfx/FileHandleWrapper.h"
#include "mozilla/gfx/Matrix.h"
#include "mozilla/gfx/ScaleFactor.h"
#include "mozilla/gfx/ScaleFactors2D.h"
#include "SharedFontList.h"
#include "nsRect.h"
#include "nsRegion.h"
#include "mozilla/ipc/FileDescriptor.h"
#include "mozilla/ipc/ProtocolMessageUtils.h"
#include "mozilla/ipc/ProtocolUtils.h"
#include "mozilla/ipc/ShmemMessageUtils.h"

#include <stdint.h>

#ifdef _MSC_VER
#  pragma warning(disable : 4800)
#endif

namespace mozilla {

typedef gfxImageFormat PixelFormat;

}  // namespace mozilla

namespace IPC {

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::Matrix, _11, _12, _21, _22, _31,
                                  _32);

template <class SourceUnits, class TargetUnits, class T>
struct ParamTraits<mozilla::gfx::Matrix4x4Typed<SourceUnits, TargetUnits, T>> {
  typedef mozilla::gfx::Matrix4x4Typed<SourceUnits, TargetUnits, T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
#define Wr(_f) WriteParam(writer, param._f)
    Wr(_11);
    Wr(_12);
    Wr(_13);
    Wr(_14);
    Wr(_21);
    Wr(_22);
    Wr(_23);
    Wr(_24);
    Wr(_31);
    Wr(_32);
    Wr(_33);
    Wr(_34);
    Wr(_41);
    Wr(_42);
    Wr(_43);
    Wr(_44);
#undef Wr
  }

  static bool Read(MessageReader* reader, paramType* result) {
#define Rd(_f) ReadParam(reader, &result->_f)
    return (Rd(_11) && Rd(_12) && Rd(_13) && Rd(_14) && Rd(_21) && Rd(_22) &&
            Rd(_23) && Rd(_24) && Rd(_31) && Rd(_32) && Rd(_33) && Rd(_34) &&
            Rd(_41) && Rd(_42) && Rd(_43) && Rd(_44));
#undef Rd
  }
};

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::Matrix5x4, _11, _12, _13, _14,
                                  _21, _22, _23, _24, _31, _32, _33, _34, _41,
                                  _42, _43, _44, _51, _52, _53, _54);

DEFINE_IPC_SERIALIZER_WITH_FIELDS(gfxPoint, x.value, y.value);

DEFINE_IPC_SERIALIZER_WITH_FIELDS(gfxSize, width, height);

template <>
struct ParamTraits<gfxRect> {
  typedef gfxRect paramType;

  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.X());
    WriteParam(aWriter, aParam.Y());
    WriteParam(aWriter, aParam.Width());
    WriteParam(aWriter, aParam.Height());
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    auto x = aResult->X();
    auto y = aResult->Y();
    auto w = aResult->Width();
    auto h = aResult->Height();

    bool retVal = (ReadParam(aReader, &x) && ReadParam(aReader, &y) &&
                   ReadParam(aReader, &w) && ReadParam(aReader, &h));
    aResult->SetRect(x, y, w, h);
    return retVal;
  }
};

template <>
struct ParamTraits<mozilla::gfx::CrashGuardType>
    : public ContiguousEnumSerializer<mozilla::gfx::CrashGuardType,
                                      mozilla::gfx::CrashGuardType::D3D11Layers,
                                      mozilla::gfx::CrashGuardType::NUM_TYPES> {
};

struct gfxContentTypeValidator {
  using IntegralType = std::underlying_type_t<gfxContentType>;

  static bool IsLegalValue(const IntegralType e) {
    return e == IntegralType(gfxContentType::COLOR) ||
           e == IntegralType(gfxContentType::ALPHA) ||
           e == IntegralType(gfxContentType::COLOR_ALPHA);
  }
};

template <>
struct ParamTraits<gfxContentType>
    : EnumSerializer<gfxContentType, gfxContentTypeValidator> {};

template <>
struct ParamTraits<gfxSurfaceType>
    : public ContiguousEnumSerializer<gfxSurfaceType, gfxSurfaceType::Image,
                                      gfxSurfaceType::Max> {};

template <>
struct ParamTraits<mozilla::gfx::SamplingFilter>
    : public ContiguousEnumSerializer<mozilla::gfx::SamplingFilter,
                                      mozilla::gfx::SamplingFilter::GOOD,
                                      mozilla::gfx::SamplingFilter::SENTINEL> {
};

template <>
struct ParamTraits<mozilla::gfx::BackendType>
    : public ContiguousEnumSerializer<mozilla::gfx::BackendType,
                                      mozilla::gfx::BackendType::NONE,
                                      mozilla::gfx::BackendType::BACKEND_LAST> {
};

template <>
struct ParamTraits<mozilla::gfx::Feature>
    : public ContiguousEnumSerializer<mozilla::gfx::Feature,
                                      mozilla::gfx::Feature::HW_COMPOSITING,
                                      mozilla::gfx::Feature::NumValues> {};

template <>
struct ParamTraits<mozilla::gfx::Fallback>
    : public ContiguousEnumSerializer<
          mozilla::gfx::Fallback,
          mozilla::gfx::Fallback::NO_CONSTANT_BUFFER_OFFSETTING,
          mozilla::gfx::Fallback::NumValues> {};

template <>
struct ParamTraits<mozilla::gfx::FeatureStatus>
    : public ContiguousEnumSerializer<mozilla::gfx::FeatureStatus,
                                      mozilla::gfx::FeatureStatus::Unused,
                                      mozilla::gfx::FeatureStatus::LAST> {};

template <>
struct ParamTraits<mozilla::gfx::LightType>
    : public ContiguousEnumSerializer<mozilla::gfx::LightType,
                                      mozilla::gfx::LightType::None,
                                      mozilla::gfx::LightType::Max> {};

template <>
struct ParamTraits<mozilla::gfx::ColorSpace>
    : public ContiguousEnumSerializer<mozilla::gfx::ColorSpace,
                                      mozilla::gfx::ColorSpace::SRGB,
                                      mozilla::gfx::ColorSpace::Max> {};

template <typename E>
using GfxEnumSerializer =
    ContiguousEnumSerializerInclusive<E, mozilla::ContiguousEnumValues<E>::min,
                                      mozilla::ContiguousEnumValues<E>::max>;

template <>
struct ParamTraits<mozilla::gfx::SVGMorphologyOperator>
    : public GfxEnumSerializer<mozilla::gfx::SVGMorphologyOperator> {};
template <>
struct ParamTraits<mozilla::gfx::SVGFEColorMatrixType>
    : public GfxEnumSerializer<mozilla::gfx::SVGFEColorMatrixType> {};
template <>
struct ParamTraits<mozilla::gfx::SVGFEComponentTransferType>
    : public GfxEnumSerializer<mozilla::gfx::SVGFEComponentTransferType> {};
template <>
struct ParamTraits<mozilla::gfx::SVGFEBlendMode>
    : public GfxEnumSerializer<mozilla::gfx::SVGFEBlendMode> {};
template <>
struct ParamTraits<mozilla::gfx::SVGEdgeMode>
    : public GfxEnumSerializer<mozilla::gfx::SVGEdgeMode> {};
template <>
struct ParamTraits<mozilla::gfx::SVGChannel>
    : public GfxEnumSerializer<mozilla::gfx::SVGChannel> {};
template <>
struct ParamTraits<mozilla::gfx::SVGTurbulenceType>
    : public GfxEnumSerializer<mozilla::gfx::SVGTurbulenceType> {};
template <>
struct ParamTraits<mozilla::gfx::SVGFECompositeOperator>
    : public GfxEnumSerializer<mozilla::gfx::SVGFECompositeOperator> {};

template <>
struct ParamTraits<mozilla::gfx::CompositionOp>
    : public ContiguousEnumSerializer<mozilla::gfx::CompositionOp,
                                      mozilla::gfx::CompositionOp::OP_CLEAR,
                                      mozilla::gfx::CompositionOp::OP_COUNT> {};

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::sRGBColor, r, g, b, a);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::DeviceColor, r, g, b, a);

template <>
struct ParamTraits<nsPoint> {
  typedef nsPoint paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.x);
    WriteParam(writer, param.y);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (ReadParam(reader, &result->x) && ReadParam(reader, &result->y));
  }
};

template <>
struct ParamTraits<nsIntPoint> {
  typedef nsIntPoint paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.x);
    WriteParam(writer, param.y);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (ReadParam(reader, &result->x) && ReadParam(reader, &result->y));
  }
};

template <typename T>
struct ParamTraits<mozilla::gfx::IntSizeTyped<T>> {
  typedef mozilla::gfx::IntSizeTyped<T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.width);
    WriteParam(writer, param.height);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (ReadParam(reader, &result->width) &&
            ReadParam(reader, &result->height));
  }
};

template <typename Region, typename Rect, typename Iter>
struct RegionParamTraits {
  typedef Region paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    for (auto iter = param.RectIter(); !iter.Done(); iter.Next()) {
      const Rect& r = iter.Get();
      MOZ_RELEASE_ASSERT(!r.IsEmpty(), "GFX: rect is empty.");
      WriteParam(writer, r);
    }
    // empty rects are sentinel values because nsRegions will never
    // contain them
    WriteParam(writer, Rect());
  }

  static bool Read(MessageReader* reader, paramType* result) {
    RegionBuilder<Region> builder;
    Rect rect;
    while (ReadParam(reader, &rect)) {
      if (rect.IsEmpty()) {
        *result = builder.ToRegion();
        return true;
      }
      builder.OrWith(rect);
    }

    return false;
  }
};

template <class Units>
struct ParamTraits<mozilla::gfx::IntRegionTyped<Units>>
    : RegionParamTraits<
          mozilla::gfx::IntRegionTyped<Units>,
          mozilla::gfx::IntRectTyped<Units>,
          typename mozilla::gfx::IntRegionTyped<Units>::RectIterator> {};

template <>
struct ParamTraits<mozilla::gfx::IntSize> {
  typedef mozilla::gfx::IntSize paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.width);
    WriteParam(writer, param.height);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (ReadParam(reader, &result->width) &&
            ReadParam(reader, &result->height));
  }
};

template <class T>
struct ParamTraits<mozilla::gfx::CoordTyped<T>> {
  typedef mozilla::gfx::CoordTyped<T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.value);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (ReadParam(reader, &result->value));
  }
};

template <class T>
struct ParamTraits<mozilla::gfx::IntCoordTyped<T>> {
  typedef mozilla::gfx::IntCoordTyped<T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.value);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (ReadParam(reader, &result->value));
  }
};

template <class T, class U>
struct ParamTraits<mozilla::gfx::ScaleFactor<T, U>> {
  typedef mozilla::gfx::ScaleFactor<T, U> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.scale);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (ReadParam(reader, &result->scale));
  }
};

template <class T, class U>
struct ParamTraits<mozilla::gfx::ScaleFactors2D<T, U>> {
  typedef mozilla::gfx::ScaleFactors2D<T, U> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.xScale);
    WriteParam(writer, param.yScale);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (ReadParam(reader, &result->xScale) &&
            ReadParam(reader, &result->yScale));
  }
};

template <class T>
struct ParamTraits<mozilla::gfx::PointTyped<T>> {
  typedef mozilla::gfx::PointTyped<T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.x);
    WriteParam(writer, param.y);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (ReadParam(reader, &result->x) && ReadParam(reader, &result->y));
  }
};

template <class F, class T>
struct ParamTraits<mozilla::gfx::Point3DTyped<F, T>> {
  typedef mozilla::gfx::Point3DTyped<F, T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.x);
    WriteParam(writer, param.y);
    WriteParam(writer, param.z);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (ReadParam(reader, &result->x) && ReadParam(reader, &result->y) &&
            ReadParam(reader, &result->z));
  }
};

template <class T>
struct ParamTraits<mozilla::gfx::IntPointTyped<T>> {
  typedef mozilla::gfx::IntPointTyped<T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.x);
    WriteParam(writer, param.y);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (ReadParam(reader, &result->x) && ReadParam(reader, &result->y));
  }
};

template <class T>
struct ParamTraits<mozilla::gfx::SizeTyped<T>> {
  typedef mozilla::gfx::SizeTyped<T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.width);
    WriteParam(writer, param.height);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (ReadParam(reader, &result->width) &&
            ReadParam(reader, &result->height));
  }
};

template <class T>
struct ParamTraits<mozilla::gfx::RectTyped<T>> {
  typedef mozilla::gfx::RectTyped<T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.X());
    WriteParam(writer, param.Y());
    WriteParam(writer, param.Width());
    WriteParam(writer, param.Height());
  }

  static bool Read(MessageReader* reader, paramType* result) {
    auto x = result->X();
    auto y = result->Y();
    auto w = result->Width();
    auto h = result->Height();

    bool retVal = (ReadParam(reader, &x) && ReadParam(reader, &y) &&
                   ReadParam(reader, &w) && ReadParam(reader, &h));
    result->SetRect(x, y, w, h);
    return retVal;
  }
};

template <class T>
struct ParamTraits<mozilla::gfx::RectAbsoluteTyped<T>> {
  typedef mozilla::gfx::RectAbsoluteTyped<T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.Left());
    WriteParam(writer, param.Top());
    WriteParam(writer, param.Right());
    WriteParam(writer, param.Bottom());
  }

  static bool Read(MessageReader* reader, paramType* result) {
    auto l = result->Left();
    auto t = result->Top();
    auto r = result->Right();
    auto b = result->Bottom();

    bool retVal = (ReadParam(reader, &l) && ReadParam(reader, &t) &&
                   ReadParam(reader, &r) && ReadParam(reader, &b));
    result->SetBox(l, t, r, b);
    return retVal;
  }
};

template <class T>
struct ParamTraits<mozilla::gfx::IntRectTyped<T>> {
  typedef mozilla::gfx::IntRectTyped<T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.X());
    WriteParam(writer, param.Y());
    WriteParam(writer, param.Width());
    WriteParam(writer, param.Height());
  }

  static bool Read(MessageReader* reader, paramType* result) {
    auto x = result->X();
    auto y = result->Y();
    auto w = result->Width();
    auto h = result->Height();

    bool retVal = (ReadParam(reader, &x) && ReadParam(reader, &y) &&
                   ReadParam(reader, &w) && ReadParam(reader, &h));
    result->SetRect(x, y, w, h);
    return retVal;
  }
};

template <>
struct ParamTraits<mozilla::gfx::RectCornerRadii> {
  typedef mozilla::gfx::RectCornerRadii paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    for (const auto& i : param.radii) {
      WriteParam(writer, i);
    }
  }

  static bool Read(MessageReader* reader, paramType* result) {
    for (auto& i : result->radii) {
      if (!ReadParam(reader, &i)) {
        return false;
      }
    }
    return true;
  }
};

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::RoundedRect, rect, corners);

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::Margin, top, right, bottom,
                                  left);

template <class T>
struct ParamTraits<mozilla::gfx::MarginTyped<T>> {
  typedef mozilla::gfx::MarginTyped<T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.top);
    WriteParam(writer, param.right);
    WriteParam(writer, param.bottom);
    WriteParam(writer, param.left);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (
        ReadParam(reader, &result->top) && ReadParam(reader, &result->right) &&
        ReadParam(reader, &result->bottom) && ReadParam(reader, &result->left));
  }
};

template <class T>
struct ParamTraits<mozilla::gfx::IntMarginTyped<T>> {
  typedef mozilla::gfx::IntMarginTyped<T> paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.top);
    WriteParam(writer, param.right);
    WriteParam(writer, param.bottom);
    WriteParam(writer, param.left);
  }

  static bool Read(MessageReader* reader, paramType* result) {
    return (
        ReadParam(reader, &result->top) && ReadParam(reader, &result->right) &&
        ReadParam(reader, &result->bottom) && ReadParam(reader, &result->left));
  }
};

template <>
struct ParamTraits<nsRect> {
  typedef nsRect paramType;

  static void Write(MessageWriter* writer, const paramType& param) {
    WriteParam(writer, param.X());
    WriteParam(writer, param.Y());
    WriteParam(writer, param.Width());
    WriteParam(writer, param.Height());
  }

  static bool Read(MessageReader* reader, paramType* result) {
    auto x = result->X();
    auto y = result->Y();
    auto w = result->Width();
    auto h = result->Height();
    bool retVal = (ReadParam(reader, &x) && ReadParam(reader, &y) &&
                   ReadParam(reader, &w) && ReadParam(reader, &h));
    result->SetRect(x, y, w, h);
    return retVal;
  }
};

template <>
struct ParamTraits<nsRegion>
    : RegionParamTraits<nsRegion, nsRect, nsRegion::RectIterator> {};

struct GeckoProcessTypeValidator {
  using IntegralType = std::underlying_type_t<GeckoProcessType>;

  static bool IsLegalValue(const IntegralType e) {
#define GECKO_PROCESS_TYPE(enum_value, enum_name, string_name, proc_typename, \
                           process_bin_type, procinfo_typename,               \
                           webidl_typename, allcaps_name)                     \
  if (e == IntegralType(GeckoProcessType::GeckoProcessType_##enum_name)) {    \
    return true;                                                              \
  }
#include "mozilla/GeckoProcessTypes.h"
#undef GECKO_PROCESS_TYPE

    return false;
  }
};

template <>
struct ParamTraits<GeckoProcessType>
    : EnumSerializer<GeckoProcessType, GeckoProcessTypeValidator> {};

template <>
struct ParamTraits<mozilla::gfx::SurfaceFormat>
    : public ContiguousEnumSerializer<mozilla::gfx::SurfaceFormat,
                                      mozilla::gfx::SurfaceFormat::B8G8R8A8,
                                      mozilla::gfx::SurfaceFormat::UNKNOWN> {};

template <>
struct ParamTraits<mozilla::gfx::ColorDepth>
    : public ContiguousEnumSerializerInclusive<
          mozilla::gfx::ColorDepth, mozilla::gfx::ColorDepth::_First,
          mozilla::gfx::ColorDepth::_Last> {};

template <>
struct ParamTraits<mozilla::gfx::TransferFunction>
    : public ContiguousEnumSerializerInclusive<
          mozilla::gfx::TransferFunction,
          mozilla::gfx::TransferFunction::_First,
          mozilla::gfx::TransferFunction::_Last> {};

template <>
struct ParamTraits<mozilla::gfx::ColorRange>
    : public ContiguousEnumSerializerInclusive<
          mozilla::gfx::ColorRange, mozilla::gfx::ColorRange::_First,
          mozilla::gfx::ColorRange::_Last> {};

template <>
struct ParamTraits<mozilla::gfx::YUVColorSpace>
    : public ContiguousEnumSerializerInclusive<
          mozilla::gfx::YUVColorSpace, mozilla::gfx::YUVColorSpace::_First,
          mozilla::gfx::YUVColorSpace::_Last> {};

template <>
struct ParamTraits<mozilla::gfx::YUVRangedColorSpace>
    : public ContiguousEnumSerializerInclusive<
          mozilla::gfx::YUVRangedColorSpace,
          mozilla::gfx::YUVRangedColorSpace::_First,
          mozilla::gfx::YUVRangedColorSpace::_Last> {};

template <>
struct ParamTraits<mozilla::gfx::ColorSpace2>
    : public ContiguousEnumSerializerInclusive<
          mozilla::gfx::ColorSpace2, mozilla::gfx::ColorSpace2::_First,
          mozilla::gfx::ColorSpace2::_Last> {};

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::Chromaticity, x, y);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::Smpte2086Metadata,
                                  displayPrimaryRed, displayPrimaryGreen,
                                  displayPrimaryBlue, whitePoint, maxLuminance,
                                  minLuminance);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::ContentLightLevel,
                                  maxContentLightLevel,
                                  maxFrameAverageLightLevel);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::HDRMetadata, mSmpte2086,
                                  mContentLightLevel);

template <>
struct ParamTraits<mozilla::StereoMode>
    : public ContiguousEnumSerializer<mozilla::StereoMode,
                                      mozilla::StereoMode::MONO,
                                      mozilla::StereoMode::MAX> {};

template <>
struct ParamTraits<mozilla::gfx::ChromaSubsampling>
    : public ContiguousEnumSerializerInclusive<
          mozilla::gfx::ChromaSubsampling,
          mozilla::gfx::ChromaSubsampling::_First,
          mozilla::gfx::ChromaSubsampling::_Last> {};

template <>
struct ParamTraits<mozilla::gfx::DeviceResetReason>
    : public ContiguousEnumSerializerInclusive<
          mozilla::gfx::DeviceResetReason,
          mozilla::gfx::DeviceResetReason::_First,
          mozilla::gfx::DeviceResetReason::_Last> {};

template <>
struct ParamTraits<mozilla::gfx::DeviceResetDetectPlace>
    : public ContiguousEnumSerializerInclusive<
          mozilla::gfx::DeviceResetDetectPlace,
          mozilla::gfx::DeviceResetDetectPlace::_First,
          mozilla::gfx::DeviceResetDetectPlace::_Last> {};

template <>
struct ParamTraits<mozilla::gfx::ImplicitlyCopyableFloatArray>
    : public ParamTraits<nsTArray<float>> {
  typedef mozilla::gfx::ImplicitlyCopyableFloatArray paramType;
};

DEFINE_IPC_SERIALIZER_WITHOUT_FIELDS(mozilla::gfx::EmptyAttributes);
DEFINE_IPC_SERIALIZER_WITHOUT_FIELDS(mozilla::gfx::MergeAttributes);
DEFINE_IPC_SERIALIZER_WITHOUT_FIELDS(mozilla::gfx::ToAlphaAttributes);
DEFINE_IPC_SERIALIZER_WITHOUT_FIELDS(mozilla::gfx::TileAttributes);

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::BlendAttributes, mBlendMode);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::MorphologyAttributes, mOperator,
                                  mRadii);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::FloodAttributes, mColor);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::OpacityAttributes, mOpacity);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::OffsetAttributes, mValue);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::DisplacementMapAttributes,
                                  mScale, mXChannel, mYChannel);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::TurbulenceAttributes, mOffset,
                                  mBaseFrequency, mSeed, mOctaves, mStitchable,
                                  mType);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::ImageAttributes, mFilter,
                                  mInputIndex, mTransform);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::GaussianBlurAttributes,
                                  mStdDeviation);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::DropShadowAttributes,
                                  mStdDeviation, mOffset, mColor);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::ColorMatrixAttributes, mType,
                                  mValues);

template <>
struct ParamTraits<mozilla::gfx::ComponentTransferAttributes> {
  typedef mozilla::gfx::ComponentTransferAttributes paramType;

  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    for (int i = 0; i < 4; ++i) {
      WriteParam(aWriter, aParam.mTypes[i]);
    }
    for (int i = 0; i < 4; ++i) {
      WriteParam(aWriter, aParam.mValues[i]);
    }
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    for (int i = 0; i < 4; ++i) {
      if (!ReadParam(aReader, &aResult->mTypes[i])) {
        return false;
      }
    }
    for (int i = 0; i < 4; ++i) {
      if (!ReadParam(aReader, &aResult->mValues[i])) {
        return false;
      }
    }
    return true;
  }
};

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::ConvolveMatrixAttributes,
                                  mKernelSize, mKernelMatrix, mDivisor, mBias,
                                  mTarget, mEdgeMode, mKernelUnitLength,
                                  mPreserveAlpha);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::DiffuseLightingAttributes,
                                  mLightType, mLightValues, mSurfaceScale,
                                  mKernelUnitLength, mColor, mLightingConstant,
                                  mSpecularExponent);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::SpecularLightingAttributes,
                                  mLightType, mLightValues, mSurfaceScale,
                                  mKernelUnitLength, mColor, mLightingConstant,
                                  mSpecularExponent);
DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::CompositeAttributes, mOperator,
                                  mCoefficients);

DEFINE_IPC_SERIALIZER_WITH_FIELDS(mozilla::gfx::Glyph, mIndex, mPosition);

template <>
struct ParamTraits<mozilla::SideBits>
    : public BitFlagsEnumSerializer<mozilla::SideBits,
                                    mozilla::SideBits::eAll> {};

DEFINE_IPC_SERIALIZER_WITH_FIELDS(gfxSparseBitSet, mBlockIndex, mBlocks);

DEFINE_IPC_SERIALIZER_WITH_FIELDS(gfxSparseBitSet::BlockIndex, mIndex);

template <>
struct ParamTraits<gfxSparseBitSet::Block> {
  typedef gfxSparseBitSet::Block paramType;
  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    aWriter->WriteBytes(&aParam, sizeof(aParam));
  }
  static bool Read(MessageReader* aReader, paramType* aResult) {
    return aReader->ReadBytesInto(aResult, sizeof(*aResult));
  }
};

// The actual FontVisibility enum is defined in gfxTypes.h
template <>
struct ParamTraits<FontVisibility>
    : public ContiguousEnumSerializer<FontVisibility, FontVisibility::Unknown,
                                      FontVisibility::Count> {};

template <>
struct ParamTraits<mozilla::gfx::CrossProcessPaintFlags>
    : public BitFlagsEnumSerializer<mozilla::gfx::CrossProcessPaintFlags,
                                    mozilla::gfx::kAllCrossProcessPaintFlags> {
};

template <>
struct ParamTraits<mozilla::gfx::PaintFragment> {
  typedef mozilla::gfx::PaintFragment paramType;
  static void Write(IPC::MessageWriter* aWriter, paramType&& aParam) {
    if (!aWriter->GetActor()) {
      aWriter->FatalError("Need an actor");
      return;
    }

    mozilla::ipc::Shmem shmem;
    if (aParam.mSize.IsEmpty() ||
        !aWriter->GetActor()->AllocShmem(aParam.mRecording.mLen, &shmem)) {
      WriteParam(aWriter, mozilla::gfx::IntSize(0, 0));
      return;
    }

    memcpy(shmem.get<uint8_t>(), aParam.mRecording.mData,
           aParam.mRecording.mLen);

    WriteParam(aWriter, aParam.mSize);
    WriteParam(aWriter, std::move(shmem));
    WriteParam(aWriter, aParam.mDependencies);
  }

  static bool Read(IPC::MessageReader* aReader, paramType* aResult) {
    if (!aReader->GetActor()) {
      return false;
    }
    if (!ReadParam(aReader, &aResult->mSize)) {
      return false;
    }
    if (aResult->mSize.IsEmpty()) {
      return true;
    }
    mozilla::ipc::Shmem shmem;
    if (!ReadParam(aReader, &shmem) ||
        !ReadParam(aReader, &aResult->mDependencies)) {
      aReader->GetActor()->DeallocShmem(shmem);
      return false;
    }

    if (!aResult->mRecording.Allocate(shmem.Size<uint8_t>())) {
      aResult->mSize.SizeTo(0, 0);
      aReader->GetActor()->DeallocShmem(shmem);
      return true;
    }

    memcpy(aResult->mRecording.mData, shmem.get<uint8_t>(),
           shmem.Size<uint8_t>());
    aReader->GetActor()->DeallocShmem(shmem);
    return true;
  }
};

template <>
struct ParamTraits<mozilla::gfx::FileHandleWrapper*> {
  static void Write(MessageWriter* aWriter,
                    mozilla::gfx::FileHandleWrapper* aParam) {
    if (!aParam) {
      WriteParam(aWriter, false);
      return;
    }
    WriteParam(aWriter, true);

    mozilla::ipc::FileDescriptor desc(aParam->GetHandle());
    WriteParam(aWriter, desc);
  }

  static bool Read(MessageReader* aReader,
                   RefPtr<mozilla::gfx::FileHandleWrapper>* aResult) {
    *aResult = nullptr;
    bool notnull = false;
    if (!ReadParam(aReader, &notnull)) {
      return false;
    }

    if (!notnull) {
      return true;
    }

    mozilla::ipc::FileDescriptor desc;
    if (!ReadParam(aReader, &desc)) {
      return false;
    }
    auto wrapper = mozilla::MakeRefPtr<mozilla::gfx::FileHandleWrapper>(
        desc.TakePlatformHandle());
    *aResult = std::move(wrapper);
    return true;
  }
};

}  // namespace IPC

#endif /* GFXMESSAGEUTILS_H_ */
