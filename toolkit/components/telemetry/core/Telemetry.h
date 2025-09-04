/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef Telemetry_h__
#define Telemetry_h__

#include "mozilla/Maybe.h"
#include "mozilla/TelemetryEventEnums.h"
#include "mozilla/TelemetryHistogramEnums.h"
#include "mozilla/TelemetryScalarEnums.h"
#include "mozilla/TimeStamp.h"
#include "nsString.h"
#include "nsTArray.h"
#include "nsXULAppAPI.h"

/******************************************************************************
 * This implements the Telemetry system.
 * It allows recording into histograms as well some more specialized data
 * points and gives access to the data.
 *
 * For documentation on how to add and use new Telemetry probes, see:
 * https://firefox-source-docs.mozilla.org/toolkit/components/telemetry/start/adding-a-new-probe.html
 *
 * For more general information on Telemetry see:
 * https://wiki.mozilla.org/Telemetry
 *****************************************************************************/

namespace mozilla {
namespace Telemetry {

struct HistogramAccumulation;
struct KeyedHistogramAccumulation;
struct ScalarAction;
struct KeyedScalarAction;
struct ChildEventData;

struct EventExtraEntry {
  nsCString key;
  nsCString value;
};

/**
 * Initialize the Telemetry service on the main thread at startup.
 */
void Init();

/**
 * Shutdown the Telemetry service.
 */
void ShutdownTelemetry();

/**
 * Adds sample to a histogram defined in TelemetryHistogramEnums.h
 *
 * @param id - histogram id
 * @param sample - value to record.
 */
void Accumulate(HistogramID id, uint32_t sample);

/**
 * Adds an array of samples to a histogram defined in TelemetryHistograms.h
 * @param id - histogram id
 * @param samples - values to record.
 */
void Accumulate(HistogramID id, const nsTArray<uint32_t>& samples);

/**
 * Adds sample to a keyed histogram defined in TelemetryHistogramEnums.h
 *
 * @param id - keyed histogram id
 * @param key - the string key
 * @param sample - (optional) value to record, defaults to 1.
 */
void Accumulate(HistogramID id, const nsCString& key, uint32_t sample = 1);

/**
 * Adds an array of samples to a histogram defined in TelemetryHistograms.h
 * @param id - histogram id
 * @param samples - values to record.
 * @param key - the string key
 */
void Accumulate(HistogramID id, const nsCString& key,
                const nsTArray<uint32_t>& samples);

/**
 * Adds a sample to a histogram defined in TelemetryHistogramEnums.h.
 * This function is here to support telemetry measurements from Java,
 * where we have only names and not numeric IDs.  You should almost
 * certainly be using the by-enum-id version instead of this one.
 *
 * @param name - histogram name
 * @param sample - value to record
 */
void Accumulate(const char* name, uint32_t sample);

/**
 * Adds a sample to a histogram defined in TelemetryHistogramEnums.h.
 * This function is here to support telemetry measurements from Java,
 * where we have only names and not numeric IDs.  You should almost
 * certainly be using the by-enum-id version instead of this one.
 *
 * @param name - histogram name
 * @param key - the string key
 * @param sample - sample - (optional) value to record, defaults to 1.
 */
void Accumulate(const char* name, const nsCString& key, uint32_t sample = 1);

/**
 * Adds sample to a categorical histogram defined in TelemetryHistogramEnums.h
 * This is the typesafe - and preferred - way to use the categorical histograms
 * by passing values from the corresponding Telemetry::LABELS_* enum.
 *
 * @param enumValue - Label value from one of the Telemetry::LABELS_* enums.
 */
template <class E>
void AccumulateCategorical(E enumValue) {
  static_assert(IsCategoricalLabelEnum<E>::value,
                "Only categorical label enum types are supported.");
  Accumulate(static_cast<HistogramID>(CategoricalLabelId<E>::value),
             static_cast<uint32_t>(enumValue));
};

/**
 * Adds sample to a keyed categorical histogram defined in
 * TelemetryHistogramEnums.h This is the typesafe - and preferred - way to use
 * the keyed categorical histograms by passing values from the corresponding
 * Telemetry::LABELS_* enum.
 *
 * @param key - the string key
 * @param enumValue - Label value from one of the Telemetry::LABELS_* enums.
 */
template <class E>
void AccumulateCategoricalKeyed(const nsCString& key, E enumValue) {
  static_assert(IsCategoricalLabelEnum<E>::value,
                "Only categorical label enum types are supported.");
  Accumulate(static_cast<HistogramID>(CategoricalLabelId<E>::value), key,
             static_cast<uint32_t>(enumValue));
};

/**
 * Adds sample to a categorical histogram defined in TelemetryHistogramEnums.h
 * This string will be matched against the labels defined in Histograms.json.
 * If the string does not match a label defined for the histogram, nothing will
 * be recorded.
 *
 * @param id - The histogram id.
 * @param label - A string label value that is defined in Histograms.json for
 *                this histogram.
 */
void AccumulateCategorical(HistogramID id, const nsCString& label);

/**
 * Adds an array of samples to a categorical histogram defined in
 * Histograms.json
 *
 * @param id - The histogram id
 * @param labels - The array of labels to accumulate
 */
void AccumulateCategorical(HistogramID id, const nsTArray<nsCString>& labels);

/**
 * Adds time delta in milliseconds to a histogram defined in
 * TelemetryHistogramEnums.h
 *
 * @param id - histogram id
 * @param start - start time
 * @param end - end time
 */
void AccumulateTimeDelta(HistogramID id, TimeStamp start,
                         TimeStamp end = TimeStamp::Now());

/**
 * Adds time delta in milliseconds to a keyed histogram defined in
 * TelemetryHistogramEnums.h
 *
 * @param id - histogram id
 * @param key - the string key
 * @param start - start time
 * @param end - end time
 */
void AccumulateTimeDelta(HistogramID id, const nsCString& key, TimeStamp start,
                         TimeStamp end = TimeStamp::Now());

const char* GetHistogramName(HistogramID id);

template <HistogramID id>
class MOZ_RAII AutoTimer {
 public:
  explicit AutoTimer(TimeStamp aStart = TimeStamp::Now()) : start(aStart) {}

  explicit AutoTimer(const nsCString& aKey, TimeStamp aStart = TimeStamp::Now())
      : start(aStart), key(aKey) {
    MOZ_ASSERT(!aKey.IsEmpty(), "The key must not be empty.");
  }

  ~AutoTimer() {
    if (key.IsEmpty()) {
      AccumulateTimeDelta(id, start);
    } else {
      AccumulateTimeDelta(id, key, start);
    }
  }

 private:
  const TimeStamp start;
  const nsCString key;
};

/**
 * Indicates whether Telemetry base data recording is turned on. Added for
 * future uses.
 */
bool CanRecordBase();

/**
 * Indicates whether Telemetry extended data recording is turned on.  This is
 * intended to guard calls to Accumulate when the statistic being recorded is
 * expensive to compute.
 */
bool CanRecordExtended();

/**
 * Indicates whether Telemetry release data recording is turned on. Usually
 * true.
 *
 * @see nsITelemetry.canRecordReleaseData
 */
bool CanRecordReleaseData();

/**
 * Indicates whether Telemetry pre-release data recording is turned on. Tends
 * to be true on pre-release channels.
 *
 * @see nsITelemetry.canRecordPrereleaseData
 */
bool CanRecordPrereleaseData();

/**
 * Records slow SQL statements for Telemetry reporting.
 *
 * @param statement - offending SQL statement to record
 * @param dbName - DB filename
 * @param delay - execution time in milliseconds
 */
void RecordSlowSQLStatement(const nsACString& statement,
                            const nsACString& dbName, uint32_t delay);

/**
 * Initialize I/O Reporting
 * Initially this only records I/O for files in the binary directory.
 *
 * @param aXreDir - XRE directory
 */
void InitIOReporting(nsIFile* aXreDir);

/**
 * Set the profile directory. Once called, files in the profile directory will
 * be included in I/O reporting. We can't use the directory
 * service to obtain this information because it isn't running yet.
 */
void SetProfileDir(nsIFile* aProfD);

/**
 * Called to inform Telemetry that startup has completed.
 */
void LeavingStartupStage();

/**
 * Called to inform Telemetry that shutdown is commencing.
 */
void EnteringShutdownStage();

/**
 * Thresholds for a statement to be considered slow, in milliseconds
 */
const uint32_t kSlowSQLThresholdForMainThread = 50;
const uint32_t kSlowSQLThresholdForHelperThreads = 100;

/**
 * Record a failed attempt at locking the user's profile.
 *
 * @param aProfileDir The profile directory whose lock attempt failed
 */
void WriteFailedProfileLock(nsIFile* aProfileDir);

}  // namespace Telemetry
}  // namespace mozilla

#endif  // Telemetry_h__
