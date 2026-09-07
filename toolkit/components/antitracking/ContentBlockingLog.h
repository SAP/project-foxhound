/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_ContentBlockingLog_h
#define mozilla_ContentBlockingLog_h

#include "mozilla/ContentBlockingNotifier.h"
#include "mozilla/JSONStringWriteFuncs.h"
#include "mozilla/Maybe.h"
#include "mozilla/StaticPrefs_browser.h"

#include "mozilla/UniquePtr.h"
#include "nsIWebProgressListener.h"
#include "nsReadableUtils.h"
#include "nsTArray.h"
#include "nsWindowSizes.h"

class nsIPrincipal;

namespace mozilla {

class nsRFPService;

class ContentBlockingLog final {
  typedef ContentBlockingNotifier::StorageAccessPermissionGrantedReason
      StorageAccessPermissionGrantedReason;

 protected:
  struct LogEntry {
    uint32_t mType;
    uint32_t mRepeatCount;
    bool mBlocked;
    Maybe<ContentBlockingNotifier::StorageAccessPermissionGrantedReason>
        mReason;
    nsTArray<nsCString> mTrackingFullHashes;
    Maybe<CanvasFingerprintingEvent> mCanvasFingerprintingEvent;

    // Portion of mRepeatCount that has already been emitted to the tracking
    // database by a previous ReportLog() flush. Subsequent incremental flushes
    // emit only (mRepeatCount - mReportedRepeatCount), so additional
    // aggregated repeats on a previously-flushed entry are not lost.
    uint32_t mReportedRepeatCount = 0;
  };

  // Bits used to track which of the origin-level "custom field" flags have
  // already been serialized in a previous ReportLog() flush, so that
  // subsequent incremental flushes don't re-emit them.
  enum ReportedFlag : uint8_t {
    eReportedLevel1Tracking = 1 << 0,
    eReportedLevel2Tracking = 1 << 1,
    eReportedCookiesLoaded = 1 << 2,
    eReportedTrackerCookiesLoaded = 1 << 3,
    eReportedSocialTrackerCookiesLoaded = 1 << 4,
    eReportedSuspiciousFingerprinting = 1 << 5,
  };

  struct OriginDataEntry {
    OriginDataEntry()
        : mHasLevel1TrackingContentLoaded(false),
          mHasLevel2TrackingContentLoaded(false),
          mHasSuspiciousFingerprintingActivity(false) {}

    bool mHasLevel1TrackingContentLoaded;
    bool mHasLevel2TrackingContentLoaded;
    bool mHasSuspiciousFingerprintingActivity;
    Maybe<bool> mHasCookiesLoaded;
    Maybe<bool> mHasTrackerCookiesLoaded;
    Maybe<bool> mHasSocialTrackerCookiesLoaded;
    nsTArray<LogEntry> mLogs;

    // Bitmask of ReportedFlag bits already serialized in a previous flush.
    uint8_t mReportedFlags = 0;
  };

  struct OriginEntry {
    OriginEntry() { mData = MakeUnique<OriginDataEntry>(); }

    nsCString mOrigin;
    UniquePtr<OriginDataEntry> mData;
  };

  friend class nsRFPService;

  typedef nsTArray<OriginEntry> OriginDataTable;

  struct Comparator {
   public:
    bool Equals(const OriginDataTable::value_type& aLeft,
                const OriginDataTable::value_type& aRight) const {
      return aLeft.mOrigin.Equals(aRight.mOrigin);
    }

    bool Equals(const OriginDataTable::value_type& aLeft,
                const nsACString& aRight) const {
      return aLeft.mOrigin.Equals(aRight);
    }
  };

 public:
  static const nsLiteralCString kDummyOriginHash;

  ContentBlockingLog() = default;
  ~ContentBlockingLog() = default;

  // Record the log in the parent process. This should be called only in the
  // parent process and will replace the RecordLog below after we remove the
  // ContentBlockingLog from content processes.
  Maybe<uint32_t> RecordLogParent(
      const nsACString& aOrigin, uint32_t aType, bool aBlocked,
      const Maybe<
          ContentBlockingNotifier::StorageAccessPermissionGrantedReason>&
          aReason = Nothing(),
      const nsTArray<nsCString>& aTrackingFullHashes = nsTArray<nsCString>(),
      const Maybe<CanvasFingerprintingEvent>& aCanvasFingerprintingEvent =
          Nothing());

  void RecordLog(
      const nsACString& aOrigin, uint32_t aType, bool aBlocked,
      const Maybe<
          ContentBlockingNotifier::StorageAccessPermissionGrantedReason>&
          aReason,
      const nsTArray<nsCString>& aTrackingFullHashes) {
    RecordLogInternal(aOrigin, aType, aBlocked, aReason, aTrackingFullHashes);
  }

  void ReportLog();
  void ReportCanvasFingerprintingLog(nsIPrincipal* aFirstPartyPrincipal);
  void ReportFontFingerprintingLog(nsIPrincipal* aFirstPartyPrincipal);
  void ReportEmailTrackingLog(nsIPrincipal* aFirstPartyPrincipal);

  // Serialize the log as JSON. When aOnlyUnreported is true, only entries
  // not previously reported (via MarkAsReported) are emitted, producing an
  // incremental delta suitable for flushing to the tracking database
  // multiple times per document lifetime without double-counting.
  nsAutoCString Stringify(bool aOnlyUnreported = false) {
    nsAutoCString buffer;

    JSONStringRefWriteFunc js(buffer);
    JSONWriter w(js);
    w.Start();

    for (const OriginEntry& entry : mLog) {
      if (!entry.mData) {
        continue;
      }

      const bool hasPendingCustomFields =
          aOnlyUnreported ? HasUnreportedCustomFields(entry) : true;
      const bool hasPendingLogs =
          aOnlyUnreported ? HasUnreportedLogs(entry) : true;

      if (aOnlyUnreported && !hasPendingCustomFields && !hasPendingLogs) {
        continue;
      }

      w.StartArrayProperty(entry.mOrigin, w.SingleLineStyle);

      StringifyCustomFields(entry, w, aOnlyUnreported);
      for (const LogEntry& item : entry.mData->mLogs) {
        const uint32_t emitCount =
            aOnlyUnreported ? item.mRepeatCount - item.mReportedRepeatCount
                            : item.mRepeatCount;
        if (emitCount == 0) {
          continue;
        }
        w.StartArrayElement(w.SingleLineStyle);
        {
          w.IntElement(item.mType);
          w.BoolElement(item.mBlocked);
          w.IntElement(emitCount);
          if (item.mReason.isSome()) {
            w.IntElement(item.mReason.value());
          }
        }
        w.EndArray();
      }
      w.EndArray();
    }

    w.End();

    return buffer;
  }

  // Advance every per-entry repeat-count cursor and the origin-level
  // reported-flag bitmask so the next call to
  // Stringify(/*aOnlyUnreported=*/true) sees an empty delta. Call
  // synchronously after handing the delta off to TrackingDBService.
  void MarkAsReported() {
    for (OriginEntry& entry : mLog) {
      if (!entry.mData) {
        continue;
      }
      for (LogEntry& item : entry.mData->mLogs) {
        item.mReportedRepeatCount = item.mRepeatCount;
      }
      if (entry.mData->mHasLevel1TrackingContentLoaded) {
        entry.mData->mReportedFlags |= eReportedLevel1Tracking;
      }
      if (entry.mData->mHasLevel2TrackingContentLoaded) {
        entry.mData->mReportedFlags |= eReportedLevel2Tracking;
      }
      if (entry.mData->mHasCookiesLoaded.isSome()) {
        entry.mData->mReportedFlags |= eReportedCookiesLoaded;
      }
      if (entry.mData->mHasTrackerCookiesLoaded.isSome()) {
        entry.mData->mReportedFlags |= eReportedTrackerCookiesLoaded;
      }
      if (entry.mData->mHasSocialTrackerCookiesLoaded.isSome()) {
        entry.mData->mReportedFlags |= eReportedSocialTrackerCookiesLoaded;
      }
      if (entry.mData->mHasSuspiciousFingerprintingActivity) {
        entry.mData->mReportedFlags |= eReportedSuspiciousFingerprinting;
      }
    }
  }

  bool HasBlockedAnyOfType(uint32_t aType) const {
    // Note: nothing inside this loop should return false, the goal for the
    // loop is to scan the log to see if we find a matching entry, and if so
    // we would return true, otherwise in the end of the function outside of
    // the loop we take the common `return false;` statement.
    for (const OriginEntry& entry : mLog) {
      if (!entry.mData) {
        continue;
      }

      if (aType ==
          nsIWebProgressListener::STATE_LOADED_LEVEL_1_TRACKING_CONTENT) {
        if (entry.mData->mHasLevel1TrackingContentLoaded) {
          return true;
        }
      } else if (aType == nsIWebProgressListener::
                              STATE_LOADED_LEVEL_2_TRACKING_CONTENT) {
        if (entry.mData->mHasLevel2TrackingContentLoaded) {
          return true;
        }
      } else if (aType == nsIWebProgressListener::STATE_COOKIES_LOADED) {
        if (entry.mData->mHasCookiesLoaded.isSome() &&
            entry.mData->mHasCookiesLoaded.value()) {
          return true;
        }
      } else if (aType ==
                 nsIWebProgressListener::STATE_COOKIES_LOADED_TRACKER) {
        if (entry.mData->mHasTrackerCookiesLoaded.isSome() &&
            entry.mData->mHasTrackerCookiesLoaded.value()) {
          return true;
        }
      } else if (aType ==
                 nsIWebProgressListener::STATE_COOKIES_LOADED_SOCIALTRACKER) {
        if (entry.mData->mHasSocialTrackerCookiesLoaded.isSome() &&
            entry.mData->mHasSocialTrackerCookiesLoaded.value()) {
          return true;
        }
      } else {
        for (const auto& item : entry.mData->mLogs) {
          if (((item.mType & aType) != 0) && item.mBlocked) {
            return true;
          }
        }
      }
    }
    return false;
  }

  void AddSizeOfExcludingThis(nsWindowSizes& aSizes) const {
    aSizes.mDOMSizes.mDOMOtherSize +=
        mLog.ShallowSizeOfExcludingThis(aSizes.mState.mMallocSizeOf);

    // Now add the sizes of each origin log queue.
    for (const OriginEntry& entry : mLog) {
      if (entry.mData) {
        aSizes.mDOMSizes.mDOMOtherSize +=
            aSizes.mState.mMallocSizeOf(entry.mData.get()) +
            entry.mData->mLogs.ShallowSizeOfExcludingThis(
                aSizes.mState.mMallocSizeOf);
      }
    }
  }

  uint32_t GetContentBlockingEventsInLog() {
    uint32_t events = 0;

    // We iterate the whole log to produce the overview of blocked events.
    for (const OriginEntry& entry : mLog) {
      if (!entry.mData) {
        continue;
      }

      if (entry.mData->mHasLevel1TrackingContentLoaded) {
        events |= nsIWebProgressListener::STATE_LOADED_LEVEL_1_TRACKING_CONTENT;
      }

      if (entry.mData->mHasLevel2TrackingContentLoaded) {
        events |= nsIWebProgressListener::STATE_LOADED_LEVEL_2_TRACKING_CONTENT;
      }

      if (entry.mData->mHasSuspiciousFingerprintingActivity) {
        events |=
            nsIWebProgressListener::STATE_BLOCKED_SUSPICIOUS_FINGERPRINTING;
      }

      if (entry.mData->mHasCookiesLoaded.isSome() &&
          entry.mData->mHasCookiesLoaded.value()) {
        events |= nsIWebProgressListener::STATE_COOKIES_LOADED;
      }

      if (entry.mData->mHasTrackerCookiesLoaded.isSome() &&
          entry.mData->mHasTrackerCookiesLoaded.value()) {
        events |= nsIWebProgressListener::STATE_COOKIES_LOADED_TRACKER;
      }

      if (entry.mData->mHasSocialTrackerCookiesLoaded.isSome() &&
          entry.mData->mHasSocialTrackerCookiesLoaded.value()) {
        events |= nsIWebProgressListener::STATE_COOKIES_LOADED_SOCIALTRACKER;
      }

      for (const auto& item : entry.mData->mLogs) {
        if (item.mBlocked ||
            item.mType &
                nsIWebProgressListener::STATE_ALLOWED_TRACKING_CONTENT) {
          events |= item.mType;
        }
      }
    }

    return events;
  }

 private:
  OriginEntry* RecordLogInternal(
      const nsACString& aOrigin, uint32_t aType, bool aBlocked,
      const Maybe<
          ContentBlockingNotifier::StorageAccessPermissionGrantedReason>&
          aReason = Nothing(),
      const nsTArray<nsCString>& aTrackingFullHashes = nsTArray<nsCString>(),
      const Maybe<CanvasFingerprintingEvent>& aCanvasFingerprintingEvent =
          Nothing());

  bool RecordLogEntryInCustomField(uint32_t aType, OriginEntry& aEntry,
                                   bool aBlocked) {
    if (aType ==
        nsIWebProgressListener::STATE_LOADED_LEVEL_1_TRACKING_CONTENT) {
      aEntry.mData->mHasLevel1TrackingContentLoaded = aBlocked;
      return true;
    }
    if (aType ==
        nsIWebProgressListener::STATE_LOADED_LEVEL_2_TRACKING_CONTENT) {
      aEntry.mData->mHasLevel2TrackingContentLoaded = aBlocked;
      return true;
    }
    if (aType == nsIWebProgressListener::STATE_COOKIES_LOADED) {
      if (aEntry.mData->mHasCookiesLoaded.isSome()) {
        aEntry.mData->mHasCookiesLoaded.ref() = aBlocked;
      } else {
        aEntry.mData->mHasCookiesLoaded.emplace(aBlocked);
      }
      return true;
    }
    if (aType == nsIWebProgressListener::STATE_COOKIES_LOADED_TRACKER) {
      if (aEntry.mData->mHasTrackerCookiesLoaded.isSome()) {
        aEntry.mData->mHasTrackerCookiesLoaded.ref() = aBlocked;
      } else {
        aEntry.mData->mHasTrackerCookiesLoaded.emplace(aBlocked);
      }
      return true;
    }
    if (aType == nsIWebProgressListener::STATE_COOKIES_LOADED_SOCIALTRACKER) {
      if (aEntry.mData->mHasSocialTrackerCookiesLoaded.isSome()) {
        aEntry.mData->mHasSocialTrackerCookiesLoaded.ref() = aBlocked;
      } else {
        aEntry.mData->mHasSocialTrackerCookiesLoaded.emplace(aBlocked);
      }
      return true;
    }
    return false;
  }

  bool HasUnreportedLogs(const OriginEntry& aEntry) const {
    for (const LogEntry& item : aEntry.mData->mLogs) {
      if (item.mReportedRepeatCount < item.mRepeatCount) {
        return true;
      }
    }
    return false;
  }

  bool HasUnreportedCustomFields(const OriginEntry& aEntry) const {
    const uint8_t reported = aEntry.mData->mReportedFlags;
    return (aEntry.mData->mHasLevel1TrackingContentLoaded &&
            !(reported & eReportedLevel1Tracking)) ||
           (aEntry.mData->mHasLevel2TrackingContentLoaded &&
            !(reported & eReportedLevel2Tracking)) ||
           (aEntry.mData->mHasCookiesLoaded.isSome() &&
            !(reported & eReportedCookiesLoaded)) ||
           (aEntry.mData->mHasTrackerCookiesLoaded.isSome() &&
            !(reported & eReportedTrackerCookiesLoaded)) ||
           (aEntry.mData->mHasSocialTrackerCookiesLoaded.isSome() &&
            !(reported & eReportedSocialTrackerCookiesLoaded)) ||
           (aEntry.mData->mHasSuspiciousFingerprintingActivity &&
            !(reported & eReportedSuspiciousFingerprinting));
  }

  void StringifyCustomFields(const OriginEntry& aEntry, JSONWriter& aWriter,
                             bool aOnlyUnreported) {
    const uint8_t reported = aEntry.mData->mReportedFlags;
    if (aEntry.mData->mHasLevel1TrackingContentLoaded &&
        !(aOnlyUnreported && (reported & eReportedLevel1Tracking))) {
      aWriter.StartArrayElement(aWriter.SingleLineStyle);
      {
        aWriter.IntElement(
            nsIWebProgressListener::STATE_LOADED_LEVEL_1_TRACKING_CONTENT);
        aWriter.BoolElement(true);  // blocked
        aWriter.IntElement(1);      // repeat count
      }
      aWriter.EndArray();
    }
    if (aEntry.mData->mHasLevel2TrackingContentLoaded &&
        !(aOnlyUnreported && (reported & eReportedLevel2Tracking))) {
      aWriter.StartArrayElement(aWriter.SingleLineStyle);
      {
        aWriter.IntElement(
            nsIWebProgressListener::STATE_LOADED_LEVEL_2_TRACKING_CONTENT);
        aWriter.BoolElement(true);  // blocked
        aWriter.IntElement(1);      // repeat count
      }
      aWriter.EndArray();
    }
    if (aEntry.mData->mHasCookiesLoaded.isSome() &&
        !(aOnlyUnreported && (reported & eReportedCookiesLoaded))) {
      aWriter.StartArrayElement(aWriter.SingleLineStyle);
      {
        aWriter.IntElement(nsIWebProgressListener::STATE_COOKIES_LOADED);
        aWriter.BoolElement(
            aEntry.mData->mHasCookiesLoaded.value());  // blocked
        aWriter.IntElement(1);                         // repeat count
      }
      aWriter.EndArray();
    }
    if (aEntry.mData->mHasTrackerCookiesLoaded.isSome() &&
        !(aOnlyUnreported && (reported & eReportedTrackerCookiesLoaded))) {
      aWriter.StartArrayElement(aWriter.SingleLineStyle);
      {
        aWriter.IntElement(
            nsIWebProgressListener::STATE_COOKIES_LOADED_TRACKER);
        aWriter.BoolElement(
            aEntry.mData->mHasTrackerCookiesLoaded.value());  // blocked
        aWriter.IntElement(1);                                // repeat count
      }
      aWriter.EndArray();
    }
    if (aEntry.mData->mHasSocialTrackerCookiesLoaded.isSome() &&
        !(aOnlyUnreported &&
          (reported & eReportedSocialTrackerCookiesLoaded))) {
      aWriter.StartArrayElement(aWriter.SingleLineStyle);
      {
        aWriter.IntElement(
            nsIWebProgressListener::STATE_COOKIES_LOADED_SOCIALTRACKER);
        aWriter.BoolElement(
            aEntry.mData->mHasSocialTrackerCookiesLoaded.value());  // blocked
        aWriter.IntElement(1);  // repeat count
      }
      aWriter.EndArray();
    }
    if (aEntry.mData->mHasSuspiciousFingerprintingActivity &&
        !(aOnlyUnreported && (reported & eReportedSuspiciousFingerprinting))) {
      aWriter.StartArrayElement(aWriter.SingleLineStyle);
      {
        aWriter.IntElement(
            nsIWebProgressListener::STATE_BLOCKED_SUSPICIOUS_FINGERPRINTING);
        aWriter.BoolElement(true);  // blocked
        aWriter.IntElement(1);      // repeat count
      }
      aWriter.EndArray();
    }
  }

 private:
  OriginDataTable mLog;
};

}  // namespace mozilla

#endif
