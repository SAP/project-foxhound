/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file should not be included by other includes, as it contains code

#ifndef MEDIATRACKCONSTRAINTS_H_
#define MEDIATRACKCONSTRAINTS_H_

#include <set>
#include <vector>

#include "ipc/IPCMessageUtilsSpecializations.h"
#include "mozilla/dom/MediaStreamTrackBinding.h"

namespace mozilla {

class LocalMediaDevice;
class MediaDevice;
class MediaEnginePrefs;

// Helper classes for orthogonal constraints without interdependencies.
// Instead of constraining values, constrain the constraints themselves.
class NormalizedConstraintSet {
 protected:
  class BaseRange {
   protected:
    BaseRange(const nsCString& aName) : mName(aName) {}
    virtual ~BaseRange() = default;

   public:
    bool operator==(const BaseRange& aOther) const noexcept {
      return mName == aOther.mName;
    }
    BaseRange& operator=(const BaseRange& aOther) {
      // We want all members assignable except mName. This allows e.g.
      // std::swap(c.mWidth, c.mHeight) without names going out of sync.
      return *this;
    }
    virtual bool Merge(const BaseRange& aOther) = 0;
    virtual void FinalizeMerge() = 0;

    const nsCString mName;
  };

 public:
  template <class ValueType>
  class Range : public BaseRange {
   public:
    ValueType mMin, mMax;
    Maybe<ValueType> mIdeal;

    Range(const nsCString& aName, ValueType aMin, ValueType aMax)
        : BaseRange(aName), mMin(aMin), mMax(aMax), mMergeDenominator(0) {}
    virtual ~Range() = default;

    bool operator==(const Range& aOther) const noexcept {
      return BaseRange::operator==(aOther) && mMin == aOther.mMin &&
             mMax == aOther.mMax && mIdeal == aOther.mIdeal;
    }

    template <class ConstrainRange>
    void SetFrom(const ConstrainRange& aOther);

    /// Clamp n based on Range. The range must be valid (mMin <= mMax).
    ValueType Clamp(ValueType n) const { return std::clamp(n, mMin, mMax); }
    /// Get ideal value, if present, or defaultValue otherwise, clamped based on
    /// Range. The range must be valid (mMin <= mMax).
    ValueType Get(ValueType defaultValue) const {
      return Clamp(mIdeal.valueOr(defaultValue));
    }
    bool Intersects(const Range& aOther) const {
      return mMax >= aOther.mMin && mMin <= aOther.mMax;
    }
    void Intersect(const Range& aOther) {
      mMin = std::max(mMin, aOther.mMin);
      if (Intersects(aOther)) {
        mMax = std::min(mMax, aOther.mMax);
      } else {
        // If there is no intersection, we will down-scale or drop frame
        mMax = std::max(mMax, aOther.mMax);
      }
    }
    bool Merge(const Range& aOther) {
      if (mName != "width" && mName != "height" && mName != "frameRate" &&
          !Intersects(aOther)) {
        return false;
      }
      Intersect(aOther);

      if (aOther.mIdeal.isSome()) {
        // Ideal values, as stored, may be outside their min max range, so use
        // clamped values in averaging, to avoid extreme outliers skewing
        // results.
        if (mIdeal.isNothing()) {
          mIdeal.emplace(aOther.Get(0));
          mMergeDenominator = 1;
        } else {
          if (!mMergeDenominator) {
            *mIdeal = Get(0);
            mMergeDenominator = 1;
          }
          *mIdeal += aOther.Get(0);
          mMergeDenominator++;
        }
      }
      return true;
    }
    void FinalizeMerge() override {
      if (mMergeDenominator) {
        *mIdeal /= mMergeDenominator;
        mMergeDenominator = 0;
      }
    }
    void TakeHighestIdeal(const Range& aOther) {
      if (aOther.mIdeal.isSome()) {
        if (mIdeal.isNothing()) {
          mIdeal.emplace(aOther.Get(0));
        } else {
          *mIdeal = std::max(Get(0), aOther.Get(0));
        }
      }
    }

   private:
    bool Merge(const BaseRange& aOther) override {
      return Merge(static_cast<const Range&>(aOther));
    }

    uint32_t mMergeDenominator;
  };

  struct LongRange final : public Range<int32_t> {
    LongRange(const nsCString& aName,
              const dom::Optional<dom::OwningLongOrConstrainLongRange>& aOther,
              bool advanced);
  };

  struct LongLongRange final : public Range<int64_t> {
    LongLongRange(const nsCString& aName, const dom::Optional<int64_t>& aOther);
  };

  struct DoubleRange final : public Range<double> {
    DoubleRange(
        const nsCString& aName,
        const dom::Optional<dom::OwningDoubleOrConstrainDoubleRange>& aOther,
        bool advanced);
  };

  struct BooleanRange final : public Range<bool> {
    BooleanRange(
        const nsCString& aName,
        const dom::Optional<dom::OwningBooleanOrConstrainBooleanParameters>&
            aOther,
        bool advanced);

    BooleanRange(const nsCString& aName, const bool& aOther)
        : Range<bool>(aName, false, true) {
      mIdeal.emplace(aOther);
    }
  };

  struct StringRange final : public BaseRange {
    using ValueType = std::set<nsString>;
    ValueType mExact, mIdeal;

    StringRange(
        const nsCString& aName,
        const dom::Optional<
            dom::OwningStringOrStringSequenceOrConstrainDOMStringParameters>&
            aOther,
        bool advanced);

    StringRange(const nsCString& aName, const dom::Optional<nsString>& aOther)
        : BaseRange(aName) {
      if (aOther.WasPassed()) {
        mIdeal.insert(aOther.Value());
      }
    }

    ~StringRange() = default;

    bool operator==(const StringRange& aOther) const noexcept {
      return BaseRange::operator==(aOther) && mExact == aOther.mExact &&
             mIdeal == aOther.mIdeal;
    }

    void SetFrom(const dom::ConstrainDOMStringParameters& aOther);
    ValueType Clamp(const ValueType& n) const;
    ValueType Get(const ValueType& defaultValue) const {
      return Clamp(mIdeal.empty() ? defaultValue : mIdeal);
    }
    bool Intersects(const StringRange& aOther) const;
    void Intersect(const StringRange& aOther);
    bool Merge(const StringRange& aOther);
    void FinalizeMerge() override {}

   private:
    bool Merge(const BaseRange& aOther) override {
      return Merge(static_cast<const StringRange&>(aOther));
    }
  };

  // All new constraints should be added here whether they use flattening or not
  LongRange mWidth, mHeight;
  DoubleRange mFrameRate;
  StringRange mFacingMode;
  StringRange mResizeMode;
  StringRange mMediaSource;
  LongLongRange mBrowserWindow;
  StringRange mDeviceId;
  StringRange mGroupId;
  LongRange mViewportOffsetX, mViewportOffsetY, mViewportWidth, mViewportHeight;
  BooleanRange mEchoCancellation, mNoiseSuppression, mAutoGainControl;
  LongRange mChannelCount;

 public:
  NormalizedConstraintSet()
      : NormalizedConstraintSet(dom::MediaTrackConstraintSet(),
                                /* advanced = */ false) {}

  NormalizedConstraintSet(const dom::MediaTrackConstraintSet& aOther,
                          bool advanced)
      : mWidth("width"_ns, aOther.mWidth, advanced),
        mHeight("height"_ns, aOther.mHeight, advanced),
        mFrameRate("frameRate"_ns, aOther.mFrameRate, advanced),
        mFacingMode("facingMode"_ns, aOther.mFacingMode, advanced),
        mResizeMode("resizeMode"_ns, aOther.mResizeMode, advanced),
        mMediaSource("mediaSource"_ns, aOther.mMediaSource),
        mBrowserWindow("browserWindow"_ns, aOther.mBrowserWindow),
        mDeviceId("deviceId"_ns, aOther.mDeviceId, advanced),
        mGroupId("groupId"_ns, aOther.mGroupId, advanced),
        mViewportOffsetX("viewportOffsetX"_ns, aOther.mViewportOffsetX,
                         advanced),
        mViewportOffsetY("viewportOffsetY"_ns, aOther.mViewportOffsetY,
                         advanced),
        mViewportWidth("viewportWidth"_ns, aOther.mViewportWidth, advanced),
        mViewportHeight("viewportHeight"_ns, aOther.mViewportHeight, advanced),
        mEchoCancellation("echoCancellation"_ns, aOther.mEchoCancellation,
                          advanced),
        mNoiseSuppression("noiseSuppression"_ns, aOther.mNoiseSuppression,
                          advanced),
        mAutoGainControl("autoGainControl"_ns, aOther.mAutoGainControl,
                         advanced),
        mChannelCount("channelCount"_ns, aOther.mChannelCount, advanced) {}

  bool operator==(const NormalizedConstraintSet& aOther) const noexcept {
    return mWidth == aOther.mWidth && mHeight == aOther.mHeight &&
           mFrameRate == aOther.mFrameRate &&
           mFacingMode == aOther.mFacingMode &&
           mResizeMode == aOther.mResizeMode &&
           mMediaSource == aOther.mMediaSource &&
           mBrowserWindow == aOther.mBrowserWindow &&
           mDeviceId == aOther.mDeviceId && mGroupId == aOther.mGroupId &&
           mViewportOffsetX == aOther.mViewportOffsetX &&
           mViewportOffsetY == aOther.mViewportOffsetY &&
           mViewportWidth == aOther.mViewportWidth &&
           mViewportHeight == aOther.mViewportHeight &&
           mEchoCancellation == aOther.mEchoCancellation &&
           mNoiseSuppression == aOther.mNoiseSuppression &&
           mAutoGainControl == aOther.mAutoGainControl &&
           mChannelCount == aOther.mChannelCount;
  }
};

template <>
bool NormalizedConstraintSet::Range<bool>::Merge(const Range& aOther);
template <>
void NormalizedConstraintSet::Range<bool>::FinalizeMerge();

// Used instead of MediaTrackConstraints in lower-level code.
struct NormalizedConstraints : public NormalizedConstraintSet {
  NormalizedConstraints() = default;
  explicit NormalizedConstraints(const dom::MediaTrackConstraints& aOther);

  bool operator==(const NormalizedConstraints& aOther) const noexcept {
    return NormalizedConstraintSet::operator==(aOther) &&
           mAdvanced == aOther.mAdvanced;
  }

  bool operator!=(const NormalizedConstraints& aOther) const noexcept {
    return !(*this == aOther);
  }

  std::vector<NormalizedConstraintSet> mAdvanced;
};

// Flattened version is used in low-level code with orthogonal constraints only.
struct FlattenedConstraints : public NormalizedConstraintSet {
  FlattenedConstraints() = default;
  explicit FlattenedConstraints(const NormalizedConstraints& aOther);
  explicit FlattenedConstraints(const dom::MediaTrackConstraints& aOther)
      : FlattenedConstraints(NormalizedConstraints(aOther)) {}

  bool operator==(const FlattenedConstraints& aOther) const noexcept {
    return NormalizedConstraintSet::operator==(aOther);
  }

  bool operator!=(const FlattenedConstraints& aOther) const noexcept {
    return !(*this == aOther);
  }
};

// A helper class for MediaEngineSources
class MediaConstraintsHelper {
 public:
  template <class ValueType, class NormalizedRange>
  static uint32_t FitnessDistance(ValueType aN, const NormalizedRange& aRange) {
    if (aRange.mMin > aN || aRange.mMax < aN) {
      return UINT32_MAX;
    }
    if (aN == aRange.mIdeal.valueOr(aN)) {
      return 0;
    }
    return uint32_t(
        ValueType((std::abs(aN - aRange.mIdeal.value()) * 1000) /
                  std::max(std::abs(aN), std::abs(aRange.mIdeal.value()))));
  }

  template <class ValueType, class NormalizedRange>
  static uint32_t FeasibilityDistance(ValueType aN,
                                      const NormalizedRange& aRange) {
    if (aRange.mMin > aN) {
      return UINT32_MAX;
    }
    // We prefer larger resolution because now we support downscaling
    if (aN == aRange.mIdeal.valueOr(aN)) {
      return 0;
    }

    if (aN > aRange.mIdeal.value()) {
      return uint32_t(
          ValueType((std::abs(aN - aRange.mIdeal.value()) * 1000) /
                    std::max(std::abs(aN), std::abs(aRange.mIdeal.value()))));
    }

    return 10000 +
           uint32_t(ValueType(
               (std::abs(aN - aRange.mIdeal.value()) * 1000) /
               std::max(std::abs(aN), std::abs(aRange.mIdeal.value()))));
  }

  static uint32_t FitnessDistance(
      const Maybe<nsString>& aN,
      const NormalizedConstraintSet::StringRange& aParams);

 protected:
  static bool SomeSettingsFit(
      const NormalizedConstraints& aConstraints, const MediaEnginePrefs& aPrefs,
      const nsTArray<RefPtr<LocalMediaDevice>>& aDevices);

 public:
  static uint32_t GetMinimumFitnessDistance(
      const NormalizedConstraintSet& aConstraints, const nsString& aDeviceId,
      const nsString& aGroupId);

  // Apply constrains to a supplied list of devices (removes items from the
  // list)
  static const char* SelectSettings(
      const NormalizedConstraints& aConstraints, const MediaEnginePrefs& aPrefs,
      nsTArray<RefPtr<LocalMediaDevice>>& aDevices,
      dom::CallerType aCallerType);

  static const char* FindBadConstraint(
      const NormalizedConstraints& aConstraints, const MediaEnginePrefs& aPrefs,
      const nsTArray<RefPtr<LocalMediaDevice>>& aDevices);

  static const char* FindBadConstraint(
      const NormalizedConstraints& aConstraints, const MediaEnginePrefs& aPrefs,
      const MediaDevice* aMediaDevice);

  static void LogConstraints(const NormalizedConstraintSet& aConstraints);

  static Maybe<dom::VideoResizeModeEnum> GetResizeMode(
      const NormalizedConstraintSet& aConstraints,
      const MediaEnginePrefs& aPrefs);
};

}  // namespace mozilla

#endif /* MEDIATRACKCONSTRAINTS_H_ */
