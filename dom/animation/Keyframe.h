/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_Keyframe_h
#define mozilla_dom_Keyframe_h

#include "mozilla/CSSPropertyId.h"
#include "mozilla/Maybe.h"
#include "mozilla/RefPtr.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/dom/BaseKeyframeTypesBinding.h"  // CompositeOperationOrAuto
#include "nsTArray.h"

namespace mozilla {
struct StyleLockedDeclarationBlock;

/**
 * A property-value pair specified on a keyframe.
 */
struct PropertyValuePair {
  explicit PropertyValuePair(const CSSPropertyId& aProperty)
      : mProperty(aProperty) {}

  PropertyValuePair(const CSSPropertyId& aProperty,
                    RefPtr<StyleLockedDeclarationBlock>&& aValue)
      : mProperty(aProperty), mServoDeclarationBlock(std::move(aValue)) {
    MOZ_ASSERT(mServoDeclarationBlock, "Should be valid property value");
  }

  CSSPropertyId mProperty;

  // The specified value when using the Servo backend.
  RefPtr<StyleLockedDeclarationBlock> mServoDeclarationBlock;

#ifdef DEBUG
  // Flag to indicate that when we call StyleAnimationValue::ComputeValues on
  // this value we should behave as if that function had failed.
  bool mSimulateComputeValuesFailure = false;
#endif

  bool operator==(const PropertyValuePair&) const;
};

// The preprocess info for an array of Keyframe.
struct KeyframesOffsetHasAny {
  // True if there are any Keyframes in nsTArray<mKeyframe> that use timeline
  // range offsets.
  bool mRangeOffset = false;
  // True if there are any Keyframes in nsTArray<mKeyframe> that use percentage
  // offset or their offsets are not set.
  bool mNonRangeOffset = false;
};

/**
 * A single keyframe.
 *
 * This is the canonical form in which keyframe effects are stored and
 * corresponds closely to the type of objects returned via the getKeyframes()
 * API.
 *
 * Before computing an output animation value, however, we flatten these frames
 * down to a series of per-property value arrays where we also resolve any
 * overlapping shorthands/longhands, convert specified CSS values to computed
 * values, etc.
 *
 * When the target element or computed style changes, however, we rebuild these
 * per-property arrays from the original list of keyframes objects. As a result,
 * these objects represent the master definition of the effect's values.
 */
struct Keyframe {
  Keyframe() = default;
  Keyframe(const Keyframe& aOther) = default;
  Keyframe(Keyframe&& aOther) = default;

  Keyframe& operator=(const Keyframe& aOther) = default;
  Keyframe& operator=(Keyframe&& aOther) = default;

  static bool ComputedOffsetsAreDifferent(const double aFirst,
                                          const double aSecond) {
    // `aFirst != aSecond` is always true if one of them is NaN, so we have to
    // filter out the case if both are NaN,
    return aFirst != aSecond && !(std::isnan(aFirst) && std::isnan(aSecond));
  }

  bool IsRangedKeyframe() const {
    return mOffset && mOffset->IsTimelineRangeOffset();
  }

  struct OffsetType {
    // If mRangeName is StyleTimelineRangeName::None, this is a percentage
    // offset. Otherwise, this is a TimelineRangeOffset (i.e. the offset with
    // <timeline-range-name> component).
    StyleTimelineRangeName mRangeName = StyleTimelineRangeName::None;
    double mPercentage = 0.0;

    static OffsetType PercentageOffset(const double aPercentage) {
      return {StyleTimelineRangeName::None, aPercentage};
    }

    bool IsPercentageOffset() const {
      MOZ_ASSERT(mRangeName != StyleTimelineRangeName::Normal);
      return mRangeName == StyleTimelineRangeName::None;
    }
    bool IsTimelineRangeOffset() const {
      MOZ_ASSERT(mRangeName != StyleTimelineRangeName::Normal);
      return mRangeName != StyleTimelineRangeName::None;
    }

    bool operator==(const OffsetType& aOther) const {
      return mRangeName == aOther.mRangeName &&
             mPercentage == aOther.mPercentage;
    }
  };
  // |mOffset| could be a null, a percentage, or a |range name, percentage|
  // pair.
  Maybe<OffsetType> mOffset;
  // The computed offset could be any real number (as percentage), so we use NaN
  // to represent the unresolved computed offset.
  double mComputedOffset = std::numeric_limits<double>::quiet_NaN();
  Maybe<StyleComputedTimingFunction> mTimingFunction;  // Nothing() here means
                                                       // "linear"
  dom::CompositeOperationOrAuto mComposite =
      dom::CompositeOperationOrAuto::Auto;
  CopyableTArray<PropertyValuePair> mPropertyValues;

  // FIXME: Bug 2037642. Drop this once we don't generate the missing keyframes
  // when creating the animations.
  bool mIsGenerated = false;
};

}  // namespace mozilla

#endif  // mozilla_dom_Keyframe_h
