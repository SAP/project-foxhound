/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SVGAnimatedPathSegList.h"

#include <utility>

#include "SVGPathSegListSMILType.h"
#include "mozilla/SMILValue.h"
#include "mozilla/StaticPrefs_dom.h"
#include "mozilla/dom/SVGElement.h"
#include "mozilla/dom/SVGPathElementBinding.h"
#include "mozilla/dom/SVGPathSegment.h"

using namespace mozilla::dom;

// See the comments in this file's header!

namespace mozilla {

nsresult SVGAnimatedPathSegList::SetBaseValueString(const nsAString& aValue) {
  // We don't need to call DidChange* here - we're only called by
  // SVGElement::ParseAttribute under Element::SetAttr,
  // which takes care of notifying.
  return mBaseVal.SetValueFromString(NS_ConvertUTF16toUTF8(aValue));
}

enum class PositionType { Absolute, Relative };

static StyleEndPoint<float> MakeEndPoint(PositionType type, float x, float y) {
  if (type == PositionType::Absolute) {
    return StyleEndPoint<float>::ToPosition({x, y});
  } else {
    return StyleEndPoint<float>::ByCoordinate({x, y});
  }
}

static StyleCurveControlPoint<float> MakeControlPoint(PositionType type,
                                                      float x, float y) {
  if (type == PositionType::Absolute) {
    return StyleCurveControlPoint<float>::Absolute({x, y});
  } else {
    const auto rcp =
        StyleRelativeControlPoint<float>{{x, y}, StyleControlReference::Start};
    return StyleCurveControlPoint<float>::Relative(rcp);
  }
}

static StyleAxisEndPoint<float> MakeAxisEndPoint(PositionType type,
                                                 float end_point) {
  if (type == PositionType::Absolute) {
    const auto pos = StyleAxisPosition<float>::LengthPercent(end_point);
    return StyleAxisEndPoint<float>::ToPosition(pos);
  } else {
    return StyleAxisEndPoint<float>::ByCoordinate(end_point);
  }
}

class MOZ_STACK_CLASS SVGPathSegmentInitWrapper final {
 public:
  explicit SVGPathSegmentInitWrapper(const SVGPathSegmentInit& aSVGPathSegment)
      : mInit(aSVGPathSegment) {}

  bool IsMove() const {
    return mInit.mType.EqualsLiteral("M") || mInit.mType.EqualsLiteral("m");
  }

  bool IsArc() const {
    return mInit.mType.EqualsLiteral("A") || mInit.mType.EqualsLiteral("a");
  }

  bool IsValid() const {
    if (mInit.mType.Length() != 1) {
      return false;
    }
    auto expectedArgCount = ArgCountForType(mInit.mType.First());
    if (expectedArgCount < 0 ||
        mInit.mValues.Length() != uint32_t(expectedArgCount)) {
      return false;
    }
    if (IsArc() &&
        !(IsValidFlag(mInit.mValues[3]) && IsValidFlag(mInit.mValues[4]))) {
      return false;
    }
    return true;
  }

  StylePathCommand ToStylePathCommand() const {
    MOZ_ASSERT(IsValid(), "Trying to convert invalid SVGPathSegment");
    switch (mInit.mType.First()) {
      case 'M':
        return StylePathCommand::Move(MakeEndPoint(
            PositionType::Absolute, mInit.mValues[0], mInit.mValues[1]));
      case 'm':
        return StylePathCommand::Move(MakeEndPoint(
            PositionType::Relative, mInit.mValues[0], mInit.mValues[1]));
      case 'L':
        return StylePathCommand::Line(MakeEndPoint(
            PositionType::Absolute, mInit.mValues[0], mInit.mValues[1]));
      case 'l':
        return StylePathCommand::Line(MakeEndPoint(
            PositionType::Relative, mInit.mValues[0], mInit.mValues[1]));
      case 'C':
        return StylePathCommand::CubicCurve(
            MakeEndPoint(PositionType::Absolute, mInit.mValues[4],
                         mInit.mValues[5]),
            MakeControlPoint(PositionType::Absolute, mInit.mValues[0],
                             mInit.mValues[1]),
            MakeControlPoint(PositionType::Absolute, mInit.mValues[2],
                             mInit.mValues[3]));
      case 'c':
        return StylePathCommand::CubicCurve(
            MakeEndPoint(PositionType::Relative, mInit.mValues[4],
                         mInit.mValues[5]),
            MakeControlPoint(PositionType::Relative, mInit.mValues[0],
                             mInit.mValues[1]),
            MakeControlPoint(PositionType::Relative, mInit.mValues[2],
                             mInit.mValues[3]));
      case 'Q':
        return StylePathCommand::QuadCurve(
            MakeEndPoint(PositionType::Absolute, mInit.mValues[2],
                         mInit.mValues[3]),
            MakeControlPoint(PositionType::Absolute, mInit.mValues[0],
                             mInit.mValues[1]));
      case 'q':
        return StylePathCommand::QuadCurve(
            MakeEndPoint(PositionType::Relative, mInit.mValues[2],
                         mInit.mValues[3]),
            MakeControlPoint(PositionType::Relative, mInit.mValues[0],
                             mInit.mValues[1]));
      case 'A':
        return StylePathCommand::Arc(
            MakeEndPoint(PositionType::Absolute, mInit.mValues[5],
                         mInit.mValues[6]),
            StyleArcRadii<float>(mInit.mValues[0],
                                 StyleOptional<float>::Some(mInit.mValues[1])),
            mInit.mValues[4] ? StyleArcSweep::Cw : StyleArcSweep::Ccw,
            mInit.mValues[3] ? StyleArcSize::Large : StyleArcSize::Small,
            mInit.mValues[2]);
      case 'a':
        return StylePathCommand::Arc(
            MakeEndPoint(PositionType::Relative, mInit.mValues[5],
                         mInit.mValues[6]),
            StyleArcRadii<float>(mInit.mValues[0],
                                 StyleOptional<float>::Some(mInit.mValues[1])),
            mInit.mValues[4] ? StyleArcSweep::Cw : StyleArcSweep::Ccw,
            mInit.mValues[3] ? StyleArcSize::Large : StyleArcSize::Small,
            mInit.mValues[2]);
      case 'H':
        return StylePathCommand::HLine(
            MakeAxisEndPoint(PositionType::Absolute, mInit.mValues[0]));
      case 'h':
        return StylePathCommand::HLine(
            MakeAxisEndPoint(PositionType::Relative, mInit.mValues[0]));
      case 'V':
        return StylePathCommand::VLine(
            MakeAxisEndPoint(PositionType::Absolute, mInit.mValues[0]));
      case 'v':
        return StylePathCommand::VLine(
            MakeAxisEndPoint(PositionType::Relative, mInit.mValues[0]));
      case 'S':
        return StylePathCommand::SmoothCubic(
            MakeEndPoint(PositionType::Absolute, mInit.mValues[2],
                         mInit.mValues[3]),
            MakeControlPoint(PositionType::Absolute, mInit.mValues[0],
                             mInit.mValues[1]));
      case 's':
        return StylePathCommand::SmoothCubic(
            MakeEndPoint(PositionType::Relative, mInit.mValues[2],
                         mInit.mValues[3]),
            MakeControlPoint(PositionType::Relative, mInit.mValues[0],
                             mInit.mValues[1]));
      case 'T':
        return StylePathCommand::SmoothQuad(MakeEndPoint(
            PositionType::Absolute, mInit.mValues[0], mInit.mValues[1]));
      case 't':
        return StylePathCommand::SmoothQuad(MakeEndPoint(
            PositionType::Relative, mInit.mValues[0], mInit.mValues[1]));
    }
    return StylePathCommand::Close();
  }

 private:
  static bool IsValidFlag(float aFlag) {
    return aFlag == 0.0f || aFlag == 1.0f;
  }

  static int32_t ArgCountForType(char aType) {
    switch (ToLowerCase(aType)) {
      case 'z':
        return 0;
      case 'm':
      case 'l':
        return 2;
      case 'c':
        return 6;
      case 'q':
        return 4;
      case 'a':
        return 7;
      case 'h':
      case 'v':
        return 1;
      case 's':
        return 4;
      case 't':
        return 2;
    }
    return -1;
  }

  const SVGPathSegmentInit& mInit;
};

void SVGAnimatedPathSegList::SetBaseValueFromPathSegments(
    const Sequence<SVGPathSegmentInit>& aValues) {
  AutoTArray<StylePathCommand, 10> pathData;
  if (!aValues.IsEmpty() && SVGPathSegmentInitWrapper(aValues[0]).IsMove()) {
    for (const auto& value : aValues) {
      SVGPathSegmentInitWrapper seg(value);
      if (!seg.IsValid()) {
        break;
      }
      pathData.AppendElement(seg.ToStylePathCommand());
    }
  }
  if (pathData.IsEmpty()) {
    mBaseVal.Clear();
    return;
  }
  Servo_CreatePathDataFromCommands(&pathData, &mBaseVal.RawData());
}

void SVGAnimatedPathSegList::ClearBaseValue() {
  mBaseVal.Clear();
  // Caller notifies
}

nsresult SVGAnimatedPathSegList::SetAnimValue(const SVGPathData& aNewAnimValue,
                                              SVGElement* aElement) {
  // Note that a new animation may totally change the number of items in the
  // animVal list, either replacing what was essentially a mirror of the
  // baseVal list, or else replacing and overriding an existing animation.
  // Unfortunately it is not possible for us to reliably distinguish between
  // calls to this method that are setting a new sample for an existing
  // animation, and calls that are setting the first sample of an animation
  // that will override an existing animation.

  if (!mAnimVal) {
    mAnimVal = std::make_unique<SVGPathData>();
  }
  *mAnimVal = aNewAnimValue;
  aElement->DidAnimatePathSegList();
  return NS_OK;
}

void SVGAnimatedPathSegList::ClearAnimValue(SVGElement* aElement) {
  mAnimVal = nullptr;
  aElement->DidAnimatePathSegList();
}

bool SVGAnimatedPathSegList::IsRendered() const {
  return mAnimVal ? !mAnimVal->IsEmpty() : !mBaseVal.IsEmpty();
}

std::unique_ptr<SMILAttr> SVGAnimatedPathSegList::ToSMILAttr(
    SVGElement* aElement) {
  return std::make_unique<SMILAnimatedPathSegList>(this, aElement);
}

nsresult SVGAnimatedPathSegList::SMILAnimatedPathSegList::ValueFromString(
    const nsAString& aStr, const dom::SVGAnimationElement* /*aSrcElement*/,
    SMILValue& aValue, bool& aPreventCachingOfSandwich) const {
  SMILValue val(SVGPathSegListSMILType::Singleton());
  SVGPathDataAndInfo* list = static_cast<SVGPathDataAndInfo*>(val.mU.mPtr);
  nsresult rv = list->SetValueFromString(NS_ConvertUTF16toUTF8(aStr));
  if (NS_SUCCEEDED(rv)) {
    list->SetElement(mElement);
    aValue = std::move(val);
  }
  return rv;
}

SMILValue SVGAnimatedPathSegList::SMILAnimatedPathSegList::GetBaseValue()
    const {
  // To benefit from Return Value Optimization and avoid copy constructor calls
  // due to our use of return-by-value, we must return the exact same object
  // from ALL return points. This function must only return THIS variable:
  SMILValue tmp(SVGPathSegListSMILType::Singleton());
  auto* list = static_cast<SVGPathDataAndInfo*>(tmp.mU.mPtr);
  list->CopyFrom(mVal->mBaseVal);
  list->SetElement(mElement);
  return tmp;
}

nsresult SVGAnimatedPathSegList::SMILAnimatedPathSegList::SetAnimValue(
    const SMILValue& aValue) {
  NS_ASSERTION(aValue.mType == SVGPathSegListSMILType::Singleton(),
               "Unexpected type to assign animated value");
  if (aValue.mType == SVGPathSegListSMILType::Singleton()) {
    mVal->SetAnimValue(*static_cast<SVGPathDataAndInfo*>(aValue.mU.mPtr),
                       mElement);
  }
  return NS_OK;
}

void SVGAnimatedPathSegList::SMILAnimatedPathSegList::ClearAnimValue() {
  if (mVal->mAnimVal) {
    mVal->ClearAnimValue(mElement);
  }
}

size_t SVGAnimatedPathSegList::SizeOfExcludingThis(
    MallocSizeOf aMallocSizeOf) const {
  size_t total = mBaseVal.SizeOfExcludingThis(aMallocSizeOf);
  if (mAnimVal) {
    mAnimVal->SizeOfIncludingThis(aMallocSizeOf);
  }
  return total;
}

}  // namespace mozilla
