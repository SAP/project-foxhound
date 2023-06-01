/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gc/Scheduling.h"

#include "mozilla/CheckedInt.h"
#include "mozilla/TimeStamp.h"

#include <algorithm>
#include <cmath>

#include "gc/Memory.h"
#include "gc/Nursery.h"
#include "gc/RelocationOverlay.h"
#include "gc/ZoneAllocator.h"
#include "util/DifferentialTesting.h"
#include "vm/MutexIDs.h"

using namespace js;
using namespace js::gc;

using mozilla::CheckedInt;
using mozilla::Some;
using mozilla::TimeDuration;
using mozilla::TimeStamp;

/*
 * We may start to collect a zone before its trigger threshold is reached if
 * GCRuntime::maybeGC() is called for that zone or we start collecting other
 * zones. These eager threshold factors are not configurable.
 */
static constexpr double HighFrequencyEagerAllocTriggerFactor = 0.85;
static constexpr double LowFrequencyEagerAllocTriggerFactor = 0.9;

/*
 * Don't allow heap growth factors to be set so low that eager collections could
 * reduce the trigger threshold.
 */
static constexpr double MinHeapGrowthFactor =
    1.0f / std::min(HighFrequencyEagerAllocTriggerFactor,
                    LowFrequencyEagerAllocTriggerFactor);

GCSchedulingTunables::GCSchedulingTunables()
    : gcMaxBytes_(TuningDefaults::GCMaxBytes),
      gcMinNurseryBytes_(Nursery::roundSize(TuningDefaults::GCMinNurseryBytes)),
      gcMaxNurseryBytes_(Nursery::roundSize(JS::DefaultNurseryMaxBytes)),
      gcZoneAllocThresholdBase_(TuningDefaults::GCZoneAllocThresholdBase),
      smallHeapIncrementalLimit_(TuningDefaults::SmallHeapIncrementalLimit),
      largeHeapIncrementalLimit_(TuningDefaults::LargeHeapIncrementalLimit),
      zoneAllocDelayBytes_(TuningDefaults::ZoneAllocDelayBytes),
      highFrequencyThreshold_(
          TimeDuration::FromSeconds(TuningDefaults::HighFrequencyThreshold)),
      smallHeapSizeMaxBytes_(TuningDefaults::SmallHeapSizeMaxBytes),
      largeHeapSizeMinBytes_(TuningDefaults::LargeHeapSizeMinBytes),
      highFrequencySmallHeapGrowth_(
          TuningDefaults::HighFrequencySmallHeapGrowth),
      highFrequencyLargeHeapGrowth_(
          TuningDefaults::HighFrequencyLargeHeapGrowth),
      lowFrequencyHeapGrowth_(TuningDefaults::LowFrequencyHeapGrowth),
      balancedHeapLimitsEnabled_(TuningDefaults::BalancedHeapLimitsEnabled),
      heapGrowthFactor_(TuningDefaults::HeapGrowthFactor),
      nurseryFreeThresholdForIdleCollection_(
          TuningDefaults::NurseryFreeThresholdForIdleCollection),
      nurseryFreeThresholdForIdleCollectionFraction_(
          TuningDefaults::NurseryFreeThresholdForIdleCollectionFraction),
      nurseryTimeoutForIdleCollection_(TimeDuration::FromMilliseconds(
          TuningDefaults::NurseryTimeoutForIdleCollectionMS)),
      pretenureThreshold_(TuningDefaults::PretenureThreshold),
      pretenureGroupThreshold_(TuningDefaults::PretenureGroupThreshold),
      pretenureStringThreshold_(TuningDefaults::PretenureStringThreshold),
      stopPretenureStringThreshold_(
          TuningDefaults::StopPretenureStringThreshold),
      minLastDitchGCPeriod_(
          TimeDuration::FromSeconds(TuningDefaults::MinLastDitchGCPeriod)),
      mallocThresholdBase_(TuningDefaults::MallocThresholdBase),
      urgentThresholdBytes_(TuningDefaults::UrgentThresholdBytes) {}

bool GCSchedulingTunables::setParameter(JSGCParamKey key, uint32_t value) {
  // Limit various parameters to reasonable levels to catch errors.
  const double MaxHeapGrowthFactor = 100;
  const size_t MaxNurseryBytesParam = 128 * 1024 * 1024;

  switch (key) {
    case JSGC_MAX_BYTES:
      gcMaxBytes_ = value;
      break;
    case JSGC_MIN_NURSERY_BYTES:
      if (value < SystemPageSize() || value >= MaxNurseryBytesParam) {
        return false;
      }
      value = Nursery::roundSize(value);
      if (value > gcMaxNurseryBytes_) {
        return false;
      }
      gcMinNurseryBytes_ = value;
      break;
    case JSGC_MAX_NURSERY_BYTES:
      if (value < SystemPageSize() || value >= MaxNurseryBytesParam) {
        return false;
      }
      value = Nursery::roundSize(value);
      if (value < gcMinNurseryBytes_) {
        return false;
      }
      gcMaxNurseryBytes_ = value;
      break;
    case JSGC_HIGH_FREQUENCY_TIME_LIMIT:
      highFrequencyThreshold_ = TimeDuration::FromMilliseconds(value);
      break;
    case JSGC_SMALL_HEAP_SIZE_MAX: {
      size_t newLimit;
      if (!megabytesToBytes(value, &newLimit)) {
        return false;
      }
      setSmallHeapSizeMaxBytes(newLimit);
      break;
    }
    case JSGC_LARGE_HEAP_SIZE_MIN: {
      size_t newLimit;
      if (!megabytesToBytes(value, &newLimit) || newLimit == 0) {
        return false;
      }
      setLargeHeapSizeMinBytes(newLimit);
      break;
    }
    case JSGC_HIGH_FREQUENCY_SMALL_HEAP_GROWTH: {
      double newGrowth = value / 100.0;
      if (newGrowth < MinHeapGrowthFactor || newGrowth > MaxHeapGrowthFactor) {
        return false;
      }
      setHighFrequencySmallHeapGrowth(newGrowth);
      break;
    }
    case JSGC_HIGH_FREQUENCY_LARGE_HEAP_GROWTH: {
      double newGrowth = value / 100.0;
      if (newGrowth < MinHeapGrowthFactor || newGrowth > MaxHeapGrowthFactor) {
        return false;
      }
      setHighFrequencyLargeHeapGrowth(newGrowth);
      break;
    }
    case JSGC_BALANCED_HEAP_LIMITS_ENABLED: {
      balancedHeapLimitsEnabled_ = bool(value);
      break;
    }
    case JSGC_LOW_FREQUENCY_HEAP_GROWTH: {
      double newGrowth = value / 100.0;
      if (newGrowth < MinHeapGrowthFactor || newGrowth > MaxHeapGrowthFactor) {
        return false;
      }
      setLowFrequencyHeapGrowth(newGrowth);
      break;
    }
    case JSGC_HEAP_GROWTH_FACTOR: {
      setHeapGrowthFactor(double(value));
      break;
    }
    case JSGC_ALLOCATION_THRESHOLD: {
      size_t threshold;
      if (!megabytesToBytes(value, &threshold)) {
        return false;
      }
      gcZoneAllocThresholdBase_ = threshold;
      break;
    }
    case JSGC_SMALL_HEAP_INCREMENTAL_LIMIT: {
      double newFactor = value / 100.0;
      if (newFactor < 1.0f || newFactor > MaxHeapGrowthFactor) {
        return false;
      }
      smallHeapIncrementalLimit_ = newFactor;
      break;
    }
    case JSGC_LARGE_HEAP_INCREMENTAL_LIMIT: {
      double newFactor = value / 100.0;
      if (newFactor < 1.0f || newFactor > MaxHeapGrowthFactor) {
        return false;
      }
      largeHeapIncrementalLimit_ = newFactor;
      break;
    }
    case JSGC_NURSERY_FREE_THRESHOLD_FOR_IDLE_COLLECTION:
      if (value > gcMaxNurseryBytes()) {
        value = gcMaxNurseryBytes();
      }
      nurseryFreeThresholdForIdleCollection_ = value;
      break;
    case JSGC_NURSERY_FREE_THRESHOLD_FOR_IDLE_COLLECTION_PERCENT:
      if (value == 0 || value > 100) {
        return false;
      }
      nurseryFreeThresholdForIdleCollectionFraction_ = value / 100.0;
      break;
    case JSGC_NURSERY_TIMEOUT_FOR_IDLE_COLLECTION_MS:
      nurseryTimeoutForIdleCollection_ = TimeDuration::FromMilliseconds(value);
      break;
    case JSGC_PRETENURE_THRESHOLD: {
      // 100 disables pretenuring
      if (value == 0 || value > 100) {
        return false;
      }
      pretenureThreshold_ = value / 100.0;
      break;
    }
    case JSGC_PRETENURE_GROUP_THRESHOLD:
      if (value <= 0) {
        return false;
      }
      pretenureGroupThreshold_ = value;
      break;
    case JSGC_PRETENURE_STRING_THRESHOLD:
      // 100 disables pretenuring
      if (value == 0 || value > 100) {
        return false;
      }
      pretenureStringThreshold_ = value / 100.0;
      break;
    case JSGC_STOP_PRETENURE_STRING_THRESHOLD:
      if (value == 0 || value > 100) {
        return false;
      }
      stopPretenureStringThreshold_ = value / 100.0;
      break;
    case JSGC_MIN_LAST_DITCH_GC_PERIOD:
      minLastDitchGCPeriod_ = TimeDuration::FromSeconds(value);
      break;
    case JSGC_ZONE_ALLOC_DELAY_KB: {
      size_t delay;
      if (!kilobytesToBytes(value, &delay) || delay == 0) {
        return false;
      }
      zoneAllocDelayBytes_ = delay;
      break;
    }
    case JSGC_MALLOC_THRESHOLD_BASE: {
      size_t threshold;
      if (!megabytesToBytes(value, &threshold)) {
        return false;
      }
      mallocThresholdBase_ = threshold;
      break;
    }
    case JSGC_URGENT_THRESHOLD_MB: {
      size_t threshold;
      if (!megabytesToBytes(value, &threshold)) {
        return false;
      }
      urgentThresholdBytes_ = threshold;
      break;
    }
    default:
      MOZ_CRASH("Unknown GC parameter.");
  }

  return true;
}

/* static */
bool GCSchedulingTunables::megabytesToBytes(uint32_t value, size_t* bytesOut) {
  MOZ_ASSERT(bytesOut);

  // Parameters which represent heap sizes in bytes are restricted to values
  // which can be represented on 32 bit platforms.
  CheckedInt<uint32_t> size = CheckedInt<uint32_t>(value) * 1024 * 1024;
  if (!size.isValid()) {
    return false;
  }

  *bytesOut = size.value();
  return true;
}

/* static */
bool GCSchedulingTunables::kilobytesToBytes(uint32_t value, size_t* bytesOut) {
  MOZ_ASSERT(bytesOut);
  CheckedInt<size_t> size = CheckedInt<size_t>(value) * 1024;
  if (!size.isValid()) {
    return false;
  }

  *bytesOut = size.value();
  return true;
}

void GCSchedulingTunables::setSmallHeapSizeMaxBytes(size_t value) {
  smallHeapSizeMaxBytes_ = value;
  if (smallHeapSizeMaxBytes_ >= largeHeapSizeMinBytes_) {
    largeHeapSizeMinBytes_ = smallHeapSizeMaxBytes_ + 1;
  }
  MOZ_ASSERT(largeHeapSizeMinBytes_ > smallHeapSizeMaxBytes_);
}

void GCSchedulingTunables::setLargeHeapSizeMinBytes(size_t value) {
  largeHeapSizeMinBytes_ = value;
  if (largeHeapSizeMinBytes_ <= smallHeapSizeMaxBytes_) {
    smallHeapSizeMaxBytes_ = largeHeapSizeMinBytes_ - 1;
  }
  MOZ_ASSERT(largeHeapSizeMinBytes_ > smallHeapSizeMaxBytes_);
}

void GCSchedulingTunables::setHighFrequencyLargeHeapGrowth(double value) {
  highFrequencyLargeHeapGrowth_ = value;
  if (highFrequencyLargeHeapGrowth_ > highFrequencySmallHeapGrowth_) {
    highFrequencySmallHeapGrowth_ = highFrequencyLargeHeapGrowth_;
  }
  MOZ_ASSERT(highFrequencyLargeHeapGrowth_ >= MinHeapGrowthFactor);
  MOZ_ASSERT(highFrequencyLargeHeapGrowth_ <= highFrequencySmallHeapGrowth_);
}

void GCSchedulingTunables::setHighFrequencySmallHeapGrowth(double value) {
  highFrequencySmallHeapGrowth_ = value;
  if (highFrequencySmallHeapGrowth_ < highFrequencyLargeHeapGrowth_) {
    highFrequencyLargeHeapGrowth_ = highFrequencySmallHeapGrowth_;
  }
  MOZ_ASSERT(highFrequencyLargeHeapGrowth_ >= MinHeapGrowthFactor);
  MOZ_ASSERT(highFrequencyLargeHeapGrowth_ <= highFrequencySmallHeapGrowth_);
}

void GCSchedulingTunables::setLowFrequencyHeapGrowth(double value) {
  lowFrequencyHeapGrowth_ = value;
  MOZ_ASSERT(lowFrequencyHeapGrowth_ >= MinHeapGrowthFactor);
}

void GCSchedulingTunables::setHeapGrowthFactor(double value) {
  heapGrowthFactor_ = value;
}

void GCSchedulingTunables::resetParameter(JSGCParamKey key) {
  switch (key) {
    case JSGC_MAX_BYTES:
      gcMaxBytes_ = TuningDefaults::GCMaxBytes;
      break;
    case JSGC_MIN_NURSERY_BYTES:
    case JSGC_MAX_NURSERY_BYTES:
      // Reset these togeather to maintain their min <= max invariant.
      gcMinNurseryBytes_ = TuningDefaults::GCMinNurseryBytes;
      gcMaxNurseryBytes_ = JS::DefaultNurseryMaxBytes;
      break;
    case JSGC_HIGH_FREQUENCY_TIME_LIMIT:
      highFrequencyThreshold_ =
          TimeDuration::FromSeconds(TuningDefaults::HighFrequencyThreshold);
      break;
    case JSGC_SMALL_HEAP_SIZE_MAX:
      setSmallHeapSizeMaxBytes(TuningDefaults::SmallHeapSizeMaxBytes);
      break;
    case JSGC_LARGE_HEAP_SIZE_MIN:
      setLargeHeapSizeMinBytes(TuningDefaults::LargeHeapSizeMinBytes);
      break;
    case JSGC_HIGH_FREQUENCY_SMALL_HEAP_GROWTH:
      setHighFrequencySmallHeapGrowth(
          TuningDefaults::HighFrequencySmallHeapGrowth);
      break;
    case JSGC_HIGH_FREQUENCY_LARGE_HEAP_GROWTH:
      setHighFrequencyLargeHeapGrowth(
          TuningDefaults::HighFrequencyLargeHeapGrowth);
      break;
    case JSGC_LOW_FREQUENCY_HEAP_GROWTH:
      setLowFrequencyHeapGrowth(TuningDefaults::LowFrequencyHeapGrowth);
      break;
    case JSGC_BALANCED_HEAP_LIMITS_ENABLED:
      balancedHeapLimitsEnabled_ = TuningDefaults::BalancedHeapLimitsEnabled;
      break;
    case JSGC_HEAP_GROWTH_FACTOR:
      setHeapGrowthFactor(TuningDefaults::HeapGrowthFactor);
      break;
    case JSGC_ALLOCATION_THRESHOLD:
      gcZoneAllocThresholdBase_ = TuningDefaults::GCZoneAllocThresholdBase;
      break;
    case JSGC_SMALL_HEAP_INCREMENTAL_LIMIT:
      smallHeapIncrementalLimit_ = TuningDefaults::SmallHeapIncrementalLimit;
      break;
    case JSGC_LARGE_HEAP_INCREMENTAL_LIMIT:
      largeHeapIncrementalLimit_ = TuningDefaults::LargeHeapIncrementalLimit;
      break;
    case JSGC_NURSERY_FREE_THRESHOLD_FOR_IDLE_COLLECTION:
      nurseryFreeThresholdForIdleCollection_ =
          TuningDefaults::NurseryFreeThresholdForIdleCollection;
      break;
    case JSGC_NURSERY_FREE_THRESHOLD_FOR_IDLE_COLLECTION_PERCENT:
      nurseryFreeThresholdForIdleCollectionFraction_ =
          TuningDefaults::NurseryFreeThresholdForIdleCollectionFraction;
      break;
    case JSGC_NURSERY_TIMEOUT_FOR_IDLE_COLLECTION_MS:
      nurseryTimeoutForIdleCollection_ = TimeDuration::FromMilliseconds(
          TuningDefaults::NurseryTimeoutForIdleCollectionMS);
      break;
    case JSGC_PRETENURE_THRESHOLD:
      pretenureThreshold_ = TuningDefaults::PretenureThreshold;
      break;
    case JSGC_PRETENURE_GROUP_THRESHOLD:
      pretenureGroupThreshold_ = TuningDefaults::PretenureGroupThreshold;
      break;
    case JSGC_PRETENURE_STRING_THRESHOLD:
      pretenureStringThreshold_ = TuningDefaults::PretenureStringThreshold;
      break;
    case JSGC_MIN_LAST_DITCH_GC_PERIOD:
      minLastDitchGCPeriod_ =
          TimeDuration::FromSeconds(TuningDefaults::MinLastDitchGCPeriod);
      break;
    case JSGC_MALLOC_THRESHOLD_BASE:
      mallocThresholdBase_ = TuningDefaults::MallocThresholdBase;
      break;
    case JSGC_URGENT_THRESHOLD_MB:
      urgentThresholdBytes_ = TuningDefaults::UrgentThresholdBytes;
      break;
    default:
      MOZ_CRASH("Unknown GC parameter.");
  }
}

void GCSchedulingState::updateHighFrequencyMode(
    const mozilla::TimeStamp& lastGCTime, const mozilla::TimeStamp& currentTime,
    const GCSchedulingTunables& tunables) {
  if (js::SupportDifferentialTesting()) {
    return;
  }

  inHighFrequencyGCMode_ =
      !lastGCTime.IsNull() &&
      lastGCTime + tunables.highFrequencyThreshold() > currentTime;
}

void GCSchedulingState::updateHighFrequencyModeForReason(JS::GCReason reason) {
  // These reason indicate that the embedding isn't triggering GC slices often
  // enough and allocation rate is high.
  if (reason == JS::GCReason::ALLOC_TRIGGER ||
      reason == JS::GCReason::TOO_MUCH_MALLOC) {
    inHighFrequencyGCMode_ = true;
  }
}

static constexpr size_t BytesPerMB = 1024 * 1024;
static constexpr double CollectionRateSmoothingFactor = 0.5;
static constexpr double AllocationRateSmoothingFactor = 0.5;

static double ExponentialMovingAverage(double prevAverage, double newData,
                                       double smoothingFactor) {
  MOZ_ASSERT(smoothingFactor > 0.0 && smoothingFactor <= 1.0);
  return smoothingFactor * newData + (1.0 - smoothingFactor) * prevAverage;
}

void js::ZoneAllocator::updateCollectionRate(
    mozilla::TimeDuration mainThreadGCTime, size_t initialBytesForAllZones) {
  MOZ_ASSERT(initialBytesForAllZones != 0);
  MOZ_ASSERT(gcHeapSize.initialBytes() <= initialBytesForAllZones);

  double zoneFraction =
      double(gcHeapSize.initialBytes()) / double(initialBytesForAllZones);
  double zoneDuration = mainThreadGCTime.ToSeconds() * zoneFraction +
                        perZoneGCTime.ref().ToSeconds();
  double collectionRate =
      double(gcHeapSize.initialBytes()) / (zoneDuration * BytesPerMB);

  if (!smoothedCollectionRate.ref()) {
    smoothedCollectionRate = Some(collectionRate);
  } else {
    double prevRate = smoothedCollectionRate.ref().value();
    smoothedCollectionRate = Some(ExponentialMovingAverage(
        prevRate, collectionRate, CollectionRateSmoothingFactor));
  }
}

void js::ZoneAllocator::updateAllocationRate(TimeDuration mutatorTime) {
  // To get the total size allocated since the last collection we have to
  // take account of how much memory got freed in the meantime.
  size_t freedBytes = gcHeapSize.freedBytes();

  size_t sizeIncludingFreedBytes = gcHeapSize.bytes() + freedBytes;

  MOZ_ASSERT(prevGCHeapSize <= sizeIncludingFreedBytes);
  size_t allocatedBytes = sizeIncludingFreedBytes - prevGCHeapSize;

  double allocationRate =
      double(allocatedBytes) / (mutatorTime.ToSeconds() * BytesPerMB);

  if (!smoothedAllocationRate.ref()) {
    smoothedAllocationRate = Some(allocationRate);
  } else {
    double prevRate = smoothedAllocationRate.ref().value();
    smoothedAllocationRate = Some(ExponentialMovingAverage(
        prevRate, allocationRate, AllocationRateSmoothingFactor));
  }

  gcHeapSize.clearFreedBytes();
  prevGCHeapSize = gcHeapSize.bytes();
}

// GC thresholds may exceed the range of size_t on 32-bit platforms, so these
// are calculated using 64-bit integers and clamped.
static inline size_t ToClampedSize(uint64_t bytes) {
  return std::min(bytes, uint64_t(SIZE_MAX));
}

void HeapThreshold::setIncrementalLimitFromStartBytes(
    size_t retainedBytes, const GCSchedulingTunables& tunables) {
  // Calculate the incremental limit for a heap based on its size and start
  // threshold.
  //
  // This effectively classifies the heap size into small, medium or large, and
  // uses the small heap incremental limit paramer, the large heap incremental
  // limit parameter or an interpolation between them.
  //
  // The incremental limit is always set greater than the start threshold by at
  // least the maximum nursery size to reduce the chance that tenuring a full
  // nursery will send us straight into non-incremental collection.

  MOZ_ASSERT(tunables.smallHeapIncrementalLimit() >=
             tunables.largeHeapIncrementalLimit());

  double factor = LinearInterpolate(
      retainedBytes, tunables.smallHeapSizeMaxBytes(),
      tunables.smallHeapIncrementalLimit(), tunables.largeHeapSizeMinBytes(),
      tunables.largeHeapIncrementalLimit());

  uint64_t bytes =
      std::max(uint64_t(double(startBytes_) * factor),
               uint64_t(startBytes_) + tunables.gcMaxNurseryBytes());
  incrementalLimitBytes_ = ToClampedSize(bytes);
  MOZ_ASSERT(incrementalLimitBytes_ >= startBytes_);

  // Maintain the invariant that the slice threshold is always less than the
  // incremental limit when adjusting GC parameters.
  if (hasSliceThreshold() && sliceBytes() > incrementalLimitBytes()) {
    sliceBytes_ = incrementalLimitBytes();
  }
}

double HeapThreshold::eagerAllocTrigger(bool highFrequencyGC) const {
  double eagerTriggerFactor = highFrequencyGC
                                  ? HighFrequencyEagerAllocTriggerFactor
                                  : LowFrequencyEagerAllocTriggerFactor;
  return eagerTriggerFactor * startBytes();
}

void HeapThreshold::setSliceThreshold(ZoneAllocator* zone,
                                      const HeapSize& heapSize,
                                      const GCSchedulingTunables& tunables,
                                      bool waitingOnBGTask) {
  // Set the allocation threshold at which to trigger the a GC slice in an
  // ongoing incremental collection. This is used to ensure progress in
  // allocation heavy code that may not return to the main event loop.
  //
  // The threshold is based on the JSGC_ZONE_ALLOC_DELAY_KB parameter, but this
  // is reduced to increase the slice frequency as we approach the incremental
  // limit, in the hope that we never reach it. If collector is waiting for a
  // background task to complete, don't trigger any slices until we reach the
  // urgent threshold.

  size_t bytesRemaining = incrementalBytesRemaining(heapSize);
  bool isUrgent = bytesRemaining < tunables.urgentThresholdBytes();

  size_t delayBeforeNextSlice = tunables.zoneAllocDelayBytes();
  if (isUrgent) {
    double fractionRemaining =
        double(bytesRemaining) / double(tunables.urgentThresholdBytes());
    delayBeforeNextSlice =
        size_t(double(delayBeforeNextSlice) * fractionRemaining);
    MOZ_ASSERT(delayBeforeNextSlice <= tunables.zoneAllocDelayBytes());
  } else if (waitingOnBGTask) {
    delayBeforeNextSlice = bytesRemaining - tunables.urgentThresholdBytes();
  }

  sliceBytes_ = ToClampedSize(
      std::min(uint64_t(heapSize.bytes()) + uint64_t(delayBeforeNextSlice),
               uint64_t(incrementalLimitBytes_)));
}

size_t HeapThreshold::incrementalBytesRemaining(
    const HeapSize& heapSize) const {
  if (heapSize.bytes() >= incrementalLimitBytes_) {
    return 0;
  }

  return incrementalLimitBytes_ - heapSize.bytes();
}

/* static */
double HeapThreshold::computeZoneHeapGrowthFactorForHeapSize(
    size_t lastBytes, const GCSchedulingTunables& tunables,
    const GCSchedulingState& state) {
  // For small zones, our collection heuristics do not matter much: favor
  // something simple in this case.
  if (lastBytes < 1 * 1024 * 1024) {
    return tunables.lowFrequencyHeapGrowth();
  }

  // The heap growth factor depends on the heap size after a GC and the GC
  // frequency. If GC's are not triggering in rapid succession, use a lower
  // threshold so that we will collect garbage sooner.
  if (!state.inHighFrequencyGCMode()) {
    return tunables.lowFrequencyHeapGrowth();
  }

  // For high frequency GCs we let the heap grow depending on whether we
  // classify the heap as small, medium or large. There are parameters for small
  // and large heap sizes and linear interpolation is used between them for
  // medium sized heaps.

  MOZ_ASSERT(tunables.smallHeapSizeMaxBytes() <=
             tunables.largeHeapSizeMinBytes());
  MOZ_ASSERT(tunables.highFrequencyLargeHeapGrowth() <=
             tunables.highFrequencySmallHeapGrowth());

  return LinearInterpolate(lastBytes, tunables.smallHeapSizeMaxBytes(),
                           tunables.highFrequencySmallHeapGrowth(),
                           tunables.largeHeapSizeMinBytes(),
                           tunables.highFrequencyLargeHeapGrowth());
}

/* static */
size_t GCHeapThreshold::computeZoneTriggerBytes(
    double growthFactor, size_t lastBytes,
    const GCSchedulingTunables& tunables) {
  size_t base = std::max(lastBytes, tunables.gcZoneAllocThresholdBase());
  double trigger = double(base) * growthFactor;
  double triggerMax =
      double(tunables.gcMaxBytes()) / tunables.largeHeapIncrementalLimit();
  return ToClampedSize(std::min(triggerMax, trigger));
}

// Parameters for balanced heap limits computation.

// The W0 parameter. How much memory can be traversed in the minimum collection
// time.
static constexpr double BalancedHeapBaseMB = 5.0;

// The minimum heap limit. Do not constrain the heap to any less than this size.
static constexpr double MinBalancedHeapLimitMB = 10.0;

// The minimum amount of additional space to allow beyond the retained size.
static constexpr double MinBalancedHeadroomMB = 3.0;

// The maximum factor by which to expand the heap beyond the retained size.
static constexpr double MaxHeapGrowth = 3.0;

// The default allocation rate in MB/s allocated by the mutator to use before we
// have an estimate. Used to set the heap limit for zones that have not yet been
// collected.
static constexpr double DefaultAllocationRate = 0.0;

// The s0 parameter. The default collection rate in MB/s to use before we have
// an estimate. Used to set the heap limit for zones that have not yet been
// collected.
static constexpr double DefaultCollectionRate = 200.0;

double GCHeapThreshold::computeBalancedHeapLimit(
    size_t lastBytes, double allocationRate, double collectionRate,
    const GCSchedulingTunables& tunables) {
  MOZ_ASSERT(tunables.balancedHeapLimitsEnabled());

  // Optimal heap limits as described in https://arxiv.org/abs/2204.10455

  double W = double(lastBytes) / BytesPerMB;  // Retained size / MB.
  double W0 = BalancedHeapBaseMB;
  double d = tunables.heapGrowthFactor();  // Rearranged constant 'c'.
  double g = allocationRate;
  double s = collectionRate;
  double f = d * sqrt((W + W0) * (g / s));
  double M = W + std::min(f, MaxHeapGrowth * W);
  M = std::max({MinBalancedHeapLimitMB, W + MinBalancedHeadroomMB, M});

  return M * double(BytesPerMB);
}

void GCHeapThreshold::updateStartThreshold(
    size_t lastBytes, mozilla::Maybe<double> allocationRate,
    mozilla::Maybe<double> collectionRate, const GCSchedulingTunables& tunables,
    const GCSchedulingState& state, bool isAtomsZone) {
  if (!tunables.balancedHeapLimitsEnabled()) {
    double growthFactor =
        computeZoneHeapGrowthFactorForHeapSize(lastBytes, tunables, state);

    startBytes_ = computeZoneTriggerBytes(growthFactor, lastBytes, tunables);
  } else {
    double threshold = computeBalancedHeapLimit(
        lastBytes, allocationRate.valueOr(DefaultAllocationRate),
        collectionRate.valueOr(DefaultCollectionRate), tunables);

    double triggerMax =
        double(tunables.gcMaxBytes()) / tunables.largeHeapIncrementalLimit();

    startBytes_ = ToClampedSize(uint64_t(std::min(triggerMax, threshold)));
  }

  setIncrementalLimitFromStartBytes(lastBytes, tunables);
}

/* static */
size_t MallocHeapThreshold::computeZoneTriggerBytes(double growthFactor,
                                                    size_t lastBytes,
                                                    size_t baseBytes) {
  return ToClampedSize(double(std::max(lastBytes, baseBytes)) * growthFactor);
}

void MallocHeapThreshold::updateStartThreshold(
    size_t lastBytes, const GCSchedulingTunables& tunables,
    const GCSchedulingState& state) {
  double growthFactor =
      computeZoneHeapGrowthFactorForHeapSize(lastBytes, tunables, state);

  startBytes_ = computeZoneTriggerBytes(growthFactor, lastBytes,
                                        tunables.mallocThresholdBase());

  setIncrementalLimitFromStartBytes(lastBytes, tunables);
}

#ifdef DEBUG

static const char* MemoryUseName(MemoryUse use) {
  switch (use) {
#  define DEFINE_CASE(Name) \
    case MemoryUse::Name:   \
      return #Name;
    JS_FOR_EACH_MEMORY_USE(DEFINE_CASE)
#  undef DEFINE_CASE
  }

  MOZ_CRASH("Unknown memory use");
}

MemoryTracker::MemoryTracker() : mutex(mutexid::MemoryTracker) {}

void MemoryTracker::checkEmptyOnDestroy() {
  bool ok = true;

  if (!gcMap.empty()) {
    ok = false;
    fprintf(stderr, "Missing calls to JS::RemoveAssociatedMemory:\n");
    for (auto r = gcMap.all(); !r.empty(); r.popFront()) {
      fprintf(stderr, "  %p 0x%zx %s\n", r.front().key().ptr(),
              r.front().value(), MemoryUseName(r.front().key().use()));
    }
  }

  if (!nonGCMap.empty()) {
    ok = false;
    fprintf(stderr, "Missing calls to Zone::decNonGCMemory:\n");
    for (auto r = nonGCMap.all(); !r.empty(); r.popFront()) {
      fprintf(stderr, "  %p 0x%zx\n", r.front().key().ptr(), r.front().value());
    }
  }

  MOZ_ASSERT(ok);
}

/* static */
inline bool MemoryTracker::isGCMemoryUse(MemoryUse use) {
  // Most memory uses are for memory associated with GC things but some are for
  // memory associated with non-GC thing pointers.
  return !isNonGCMemoryUse(use);
}

/* static */
inline bool MemoryTracker::isNonGCMemoryUse(MemoryUse use) {
  return use == MemoryUse::TrackedAllocPolicy;
}

/* static */
inline bool MemoryTracker::allowMultipleAssociations(MemoryUse use) {
  // For most uses only one association is possible for each GC thing. Allow a
  // one-to-many relationship only where necessary.
  return isNonGCMemoryUse(use) || use == MemoryUse::RegExpSharedBytecode ||
         use == MemoryUse::BreakpointSite || use == MemoryUse::Breakpoint ||
         use == MemoryUse::ForOfPICStub || use == MemoryUse::ICUObject;
}

void MemoryTracker::trackGCMemory(Cell* cell, size_t nbytes, MemoryUse use) {
  MOZ_ASSERT(cell->isTenured());
  MOZ_ASSERT(isGCMemoryUse(use));

  LockGuard<Mutex> lock(mutex);

  Key<Cell> key{cell, use};
  AutoEnterOOMUnsafeRegion oomUnsafe;
  auto ptr = gcMap.lookupForAdd(key);
  if (ptr) {
    if (!allowMultipleAssociations(use)) {
      MOZ_CRASH_UNSAFE_PRINTF("Association already present: %p 0x%zx %s", cell,
                              nbytes, MemoryUseName(use));
    }
    ptr->value() += nbytes;
    return;
  }

  if (!gcMap.add(ptr, key, nbytes)) {
    oomUnsafe.crash("MemoryTracker::trackGCMemory");
  }
}

void MemoryTracker::untrackGCMemory(Cell* cell, size_t nbytes, MemoryUse use) {
  MOZ_ASSERT(cell->isTenured());

  LockGuard<Mutex> lock(mutex);

  Key<Cell> key{cell, use};
  auto ptr = gcMap.lookup(key);
  if (!ptr) {
    MOZ_CRASH_UNSAFE_PRINTF("Association not found: %p 0x%zx %s", cell, nbytes,
                            MemoryUseName(use));
  }

  if (!allowMultipleAssociations(use) && ptr->value() != nbytes) {
    MOZ_CRASH_UNSAFE_PRINTF(
        "Association for %p %s has different size: "
        "expected 0x%zx but got 0x%zx",
        cell, MemoryUseName(use), ptr->value(), nbytes);
  }

  if (nbytes > ptr->value()) {
    MOZ_CRASH_UNSAFE_PRINTF(
        "Association for %p %s size is too large: "
        "expected at most 0x%zx but got 0x%zx",
        cell, MemoryUseName(use), ptr->value(), nbytes);
  }

  ptr->value() -= nbytes;

  if (ptr->value() == 0) {
    gcMap.remove(ptr);
  }
}

void MemoryTracker::swapGCMemory(Cell* a, Cell* b, MemoryUse use) {
  Key<Cell> ka{a, use};
  Key<Cell> kb{b, use};

  LockGuard<Mutex> lock(mutex);

  size_t sa = getAndRemoveEntry(ka, lock);
  size_t sb = getAndRemoveEntry(kb, lock);

  AutoEnterOOMUnsafeRegion oomUnsafe;

  if ((sa && b->isTenured() && !gcMap.put(kb, sa)) ||
      (sb && a->isTenured() && !gcMap.put(ka, sb))) {
    oomUnsafe.crash("MemoryTracker::swapGCMemory");
  }
}

size_t MemoryTracker::getAndRemoveEntry(const Key<Cell>& key,
                                        LockGuard<Mutex>& lock) {
  auto ptr = gcMap.lookup(key);
  if (!ptr) {
    return 0;
  }

  size_t size = ptr->value();
  gcMap.remove(ptr);
  return size;
}

void MemoryTracker::registerNonGCMemory(void* mem, MemoryUse use) {
  LockGuard<Mutex> lock(mutex);

  Key<void> key{mem, use};
  auto ptr = nonGCMap.lookupForAdd(key);
  if (ptr) {
    MOZ_CRASH_UNSAFE_PRINTF("%s assocaition %p already registered",
                            MemoryUseName(use), mem);
  }

  AutoEnterOOMUnsafeRegion oomUnsafe;
  if (!nonGCMap.add(ptr, key, 0)) {
    oomUnsafe.crash("MemoryTracker::registerNonGCMemory");
  }
}

void MemoryTracker::unregisterNonGCMemory(void* mem, MemoryUse use) {
  LockGuard<Mutex> lock(mutex);

  Key<void> key{mem, use};
  auto ptr = nonGCMap.lookup(key);
  if (!ptr) {
    MOZ_CRASH_UNSAFE_PRINTF("%s association %p not found", MemoryUseName(use),
                            mem);
  }

  if (ptr->value() != 0) {
    MOZ_CRASH_UNSAFE_PRINTF(
        "%s association %p still has 0x%zx bytes associated",
        MemoryUseName(use), mem, ptr->value());
  }

  nonGCMap.remove(ptr);
}

void MemoryTracker::moveNonGCMemory(void* dst, void* src, MemoryUse use) {
  LockGuard<Mutex> lock(mutex);

  Key<void> srcKey{src, use};
  auto srcPtr = nonGCMap.lookup(srcKey);
  if (!srcPtr) {
    MOZ_CRASH_UNSAFE_PRINTF("%s association %p not found", MemoryUseName(use),
                            src);
  }

  size_t nbytes = srcPtr->value();
  nonGCMap.remove(srcPtr);

  Key<void> dstKey{dst, use};
  auto dstPtr = nonGCMap.lookupForAdd(dstKey);
  if (dstPtr) {
    MOZ_CRASH_UNSAFE_PRINTF("%s %p already registered", MemoryUseName(use),
                            dst);
  }

  AutoEnterOOMUnsafeRegion oomUnsafe;
  if (!nonGCMap.add(dstPtr, dstKey, nbytes)) {
    oomUnsafe.crash("MemoryTracker::moveNonGCMemory");
  }
}

void MemoryTracker::incNonGCMemory(void* mem, size_t nbytes, MemoryUse use) {
  MOZ_ASSERT(isNonGCMemoryUse(use));

  LockGuard<Mutex> lock(mutex);

  Key<void> key{mem, use};
  auto ptr = nonGCMap.lookup(key);
  if (!ptr) {
    MOZ_CRASH_UNSAFE_PRINTF("%s allocation %p not found", MemoryUseName(use),
                            mem);
  }

  ptr->value() += nbytes;
}

void MemoryTracker::decNonGCMemory(void* mem, size_t nbytes, MemoryUse use) {
  MOZ_ASSERT(isNonGCMemoryUse(use));

  LockGuard<Mutex> lock(mutex);

  Key<void> key{mem, use};
  auto ptr = nonGCMap.lookup(key);
  if (!ptr) {
    MOZ_CRASH_UNSAFE_PRINTF("%s allocation %p not found", MemoryUseName(use),
                            mem);
  }

  size_t& value = ptr->value();
  if (nbytes > value) {
    MOZ_CRASH_UNSAFE_PRINTF(
        "%s allocation %p is too large: "
        "expected at most 0x%zx but got 0x%zx bytes",
        MemoryUseName(use), mem, value, nbytes);
  }

  value -= nbytes;
}

void MemoryTracker::fixupAfterMovingGC() {
  // Update the table after we move GC things. We don't use MovableCellHasher
  // because that would create a difference between debug and release builds.
  for (GCMap::Enum e(gcMap); !e.empty(); e.popFront()) {
    const auto& key = e.front().key();
    Cell* cell = key.ptr();
    if (cell->isForwarded()) {
      cell = gc::RelocationOverlay::fromCell(cell)->forwardingAddress();
      e.rekeyFront(Key<Cell>{cell, key.use()});
    }
  }
}

template <typename Ptr>
inline MemoryTracker::Key<Ptr>::Key(Ptr* ptr, MemoryUse use)
    : ptr_(uint64_t(ptr)), use_(uint64_t(use)) {
#  ifdef JS_64BIT
  static_assert(sizeof(Key) == 8,
                "MemoryTracker::Key should be packed into 8 bytes");
#  endif
  MOZ_ASSERT(this->ptr() == ptr);
  MOZ_ASSERT(this->use() == use);
}

template <typename Ptr>
inline Ptr* MemoryTracker::Key<Ptr>::ptr() const {
  return reinterpret_cast<Ptr*>(ptr_);
}
template <typename Ptr>
inline MemoryUse MemoryTracker::Key<Ptr>::use() const {
  return static_cast<MemoryUse>(use_);
}

template <typename Ptr>
inline HashNumber MemoryTracker::Hasher<Ptr>::hash(const Lookup& l) {
  return mozilla::HashGeneric(DefaultHasher<Ptr*>::hash(l.ptr()),
                              DefaultHasher<unsigned>::hash(unsigned(l.use())));
}

template <typename Ptr>
inline bool MemoryTracker::Hasher<Ptr>::match(const KeyT& k, const Lookup& l) {
  return k.ptr() == l.ptr() && k.use() == l.use();
}

template <typename Ptr>
inline void MemoryTracker::Hasher<Ptr>::rekey(KeyT& k, const KeyT& newKey) {
  k = newKey;
}

#endif  // DEBUG
