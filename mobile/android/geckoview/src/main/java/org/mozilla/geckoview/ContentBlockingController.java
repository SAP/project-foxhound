/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.geckoview;

import androidx.annotation.AnyThread;
import androidx.annotation.IntDef;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.UiThread;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.mozilla.gecko.EventDispatcher;
import org.mozilla.gecko.util.GeckoBundle;
import org.mozilla.gecko.util.ThreadUtils;

/**
 * ContentBlockingController is used to manage and modify the content blocking exception list. This
 * list is shared across all sessions.
 */
@AnyThread
public class ContentBlockingController {
  private static final String LOGTAG = "GeckoContentBlocking";

  /** Content blocking event constants and data. */
  public static class Event {
    // These values must be kept in sync with the corresponding values in
    // nsIWebProgressListener.idl.
    /** Tracking content has been blocked from loading. */
    public static final int BLOCKED_TRACKING_CONTENT = 0x00001000;

    /** Level 1 tracking content has been loaded. */
    public static final int LOADED_LEVEL_1_TRACKING_CONTENT = 0x00002000;

    /** Level 2 tracking content has been loaded. */
    public static final int LOADED_LEVEL_2_TRACKING_CONTENT = 0x00100000;

    /** Fingerprinting content has been blocked from loading. */
    public static final int BLOCKED_FINGERPRINTING_CONTENT = 0x00000040;

    /** Fingerprinting content has been loaded. */
    public static final int LOADED_FINGERPRINTING_CONTENT = 0x00000400;

    /** Fingerprinting content which should be blocked from loading was replaced with a shim. */
    public static final int REPLACED_FINGERPRINTING_CONTENT = 0x08000000;

    /** Cryptomining content has been blocked from loading. */
    public static final int BLOCKED_CRYPTOMINING_CONTENT = 0x00000800;

    /** Cryptomining content has been loaded. */
    public static final int LOADED_CRYPTOMINING_CONTENT = 0x00200000;

    /** Content which appears on the SafeBrowsing list has been blocked from loading. */
    public static final int BLOCKED_UNSAFE_CONTENT = 0x00004000;

    /**
     * Performed a storage access check, which usually means something like a cookie or a storage
     * item was loaded/stored on the current tab. Alternatively this could indicate that something
     * in the current tab attempted to communicate with its same-origin counterparts in other tabs.
     */
    public static final int COOKIES_LOADED = 0x00008000;

    /**
     * Similar to {@link #COOKIES_LOADED}, but only sent if the subject of the action was a
     * third-party tracker when the active cookie policy imposes restrictions on such content.
     */
    public static final int COOKIES_LOADED_TRACKER = 0x00040000;

    /**
     * Similar to {@link #COOKIES_LOADED}, but only sent if the subject of the action was a
     * third-party social tracker when the active cookie policy imposes restrictions on such
     * content.
     */
    public static final int COOKIES_LOADED_SOCIALTRACKER = 0x00080000;

    /** Rejected for custom site permission. */
    public static final int COOKIES_BLOCKED_BY_PERMISSION = 0x10000000;

    /** Rejected because the resource is a tracker and cookie policy doesn't allow its loading. */
    public static final int COOKIES_BLOCKED_TRACKER = 0x20000000;

    /**
     * Rejected because the resource is a tracker from a social origin and cookie policy doesn't
     * allow its loading.
     */
    public static final int COOKIES_BLOCKED_SOCIALTRACKER = 0x01000000;

    /** Rejected because cookie policy blocks all cookies. */
    public static final int COOKIES_BLOCKED_ALL = 0x40000000;

    /**
     * Rejected because the resource is a third-party tracker and cookie policy forces third-party
     * resources to be partitioned.
     */
    public static final int COOKIES_PARTITIONED_TRACKER = 0x00000002;

    /**
     * Rejected because the resource is a third-party and cookie policy forces third-party resources
     * to be partitioned.
     */
    public static final int COOKIES_PARTITIONED_FOREIGN = 0x80000000;

    /** Rejected because cookie policy blocks 3rd party cookies. */
    public static final int COOKIES_BLOCKED_FOREIGN = 0x00000080;

    /** SocialTracking content has been blocked from loading. */
    public static final int BLOCKED_SOCIALTRACKING_CONTENT = 0x00010000;

    /** SocialTracking content has been loaded. */
    public static final int LOADED_SOCIALTRACKING_CONTENT = 0x00020000;

    /** Email content has been blocked from loading. */
    public static final int BLOCKED_EMAILTRACKING_CONTENT = 0x00400000;

    /** EmailTracking content from the Disconnect level 1 has been loaded. */
    public static final int LOADED_EMAILTRACKING_LEVEL_1_CONTENT = 0x00800000;

    /** EmailTracking content from the Disconnect level 2 has been loaded. */
    public static final int LOADED_EMAILTRACKING_LEVEL_2_CONTENT = 0x00000100;

    /**
     * Indicates that content that would have been blocked has instead been replaced with a shim.
     */
    public static final int REPLACED_TRACKING_CONTENT = 0x00000010;

    /** Indicates that content that would have been blocked has instead been allowed by a shim. */
    public static final int ALLOWED_TRACKING_CONTENT = 0x00000020;

    /** Indicates that bounce trackers have been purged. */
    public static final int PURGED_BOUNCETRACKER = 0x00000008;

    /** Indicates that suspicious fingerprinting content has been blocked */
    public static final int BLOCKED_SUSPICIOUS_FINGERPRINTING = 0x00000004;

    /** Protected constructor for Event. */
    protected Event() {}
  }

  /** An entry in the content blocking log for a site. */
  @AnyThread
  public static class LogEntry {
    /** Data about why a given entry was blocked. */
    public static class BlockingData {
      /** Log event type definitions for content blocking. */
      @Retention(RetentionPolicy.SOURCE)
      @IntDef({
        Event.BLOCKED_TRACKING_CONTENT,
        Event.LOADED_LEVEL_1_TRACKING_CONTENT,
        Event.LOADED_LEVEL_2_TRACKING_CONTENT,
        Event.BLOCKED_FINGERPRINTING_CONTENT,
        Event.LOADED_FINGERPRINTING_CONTENT,
        Event.REPLACED_FINGERPRINTING_CONTENT,
        Event.BLOCKED_CRYPTOMINING_CONTENT,
        Event.LOADED_CRYPTOMINING_CONTENT,
        Event.BLOCKED_UNSAFE_CONTENT,
        Event.COOKIES_LOADED,
        Event.COOKIES_LOADED_TRACKER,
        Event.COOKIES_LOADED_SOCIALTRACKER,
        Event.COOKIES_BLOCKED_BY_PERMISSION,
        Event.COOKIES_BLOCKED_TRACKER,
        Event.COOKIES_BLOCKED_SOCIALTRACKER,
        Event.COOKIES_BLOCKED_ALL,
        Event.COOKIES_PARTITIONED_FOREIGN,
        Event.COOKIES_PARTITIONED_TRACKER,
        Event.COOKIES_BLOCKED_FOREIGN,
        Event.BLOCKED_SOCIALTRACKING_CONTENT,
        Event.LOADED_SOCIALTRACKING_CONTENT,
        Event.REPLACED_TRACKING_CONTENT,
        Event.LOADED_EMAILTRACKING_LEVEL_1_CONTENT,
        Event.LOADED_EMAILTRACKING_LEVEL_2_CONTENT,
        Event.BLOCKED_EMAILTRACKING_CONTENT,
        Event.PURGED_BOUNCETRACKER,
        Event.BLOCKED_SUSPICIOUS_FINGERPRINTING
      })
      public @interface LogEvent {}

      /** A category the entry falls under. */
      public final @LogEvent int category;

      /** Indicates whether or not blocking occured for this category, where applicable. */
      public final boolean blocked;

      /** The count of consecutive repeated appearances. */
      public final int count;

      /* package */ BlockingData(final @NonNull GeckoBundle bundle) {
        category = bundle.getInt("category");
        blocked = bundle.getBoolean("blocked");
        count = bundle.getInt("count");
      }

      /** Protected constructor for BlockingData. */
      protected BlockingData() {
        category = Event.BLOCKED_TRACKING_CONTENT;
        blocked = false;
        count = 0;
      }
    }

    /** The origin of this log entry. */
    public final @NonNull String origin;

    /** The blocking data for this origin, sorted chronologically. */
    public final @NonNull List<BlockingData> blockingData;

    /* package */ LogEntry(final @NonNull GeckoBundle bundle) {
      origin = bundle.getString("origin");
      final GeckoBundle[] data = bundle.getBundleArray("blockData");
      final ArrayList<BlockingData> dataArray = new ArrayList<BlockingData>(data.length);
      for (final GeckoBundle b : data) {
        dataArray.add(new BlockingData(b));
      }
      blockingData = Collections.unmodifiableList(dataArray);
    }

    /** Protected constructor for LogEntry. */
    protected LogEntry() {
      origin = null;
      blockingData = null;
    }
  }

  private List<LogEntry> logFromBundle(final GeckoBundle value) {
    final GeckoBundle[] bundles = value.getBundleArray("log");
    final ArrayList<LogEntry> logArray = new ArrayList<>(bundles.length);
    for (final GeckoBundle b : bundles) {
      logArray.add(new LogEntry(b));
    }
    return Collections.unmodifiableList(logArray);
  }

  /**
   * Get a log of all content blocking information for the site currently loaded by the supplied
   * {@link GeckoSession}.
   *
   * @param session A {@link GeckoSession} for which you want the content blocking log.
   * @return A {@link GeckoResult} that resolves to the list of content blocking log entries.
   */
  @UiThread
  public @NonNull GeckoResult<List<LogEntry>> getLog(final @NonNull GeckoSession session) {
    return session
        .getEventDispatcher()
        .queryBundle("ContentBlocking:RequestLog")
        .map(this::logFromBundle);
  }

  /**
   * An entry from the content blocking aggregate database. The tracker type constants are expected
   * to match the same from nsITrackingDBService.
   */
  @AnyThread
  public static class TrackingDbEvent {
    /** Generic cookies. */
    public static final int OTHER_COOKIES_BLOCKED_ID = 0;

    /** Generic tracking scripts. */
    public static final int TRACKERS_ID = 1;

    /** Generic tracking cookies. */
    public static final int TRACKING_COOKIES_ID = 2;

    /** Cryptocurrency miners. */
    public static final int CRYPTOMINERS_ID = 3;

    /** Fingerprinting trackers. */
    public static final int FINGERPRINTERS_ID = 4;

    /** Social trackers from the social-track-digest256 list. */
    public static final int SOCIAL_ID = 5;

    /** Scripts potentially aiding in fingerprinting. */
    public static final int SUSPICIOUS_FINGERPRINTERS_ID = 6;

    /**
     * Redirect-based trackers. [Bounce tracking
     * mitigations](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Bounce_tracking_mitigations)
     */
    public static final int BOUNCETRACKERS_ID = 7;

    /** The tracker type for this event. */
    public final int type;

    /** The aggregated count for this type on the given date. */
    public final int count;

    /** The date for this event, in "YYYY-MM-DD" format. May be null if this is not known. */
    public final @Nullable String date;

    /* package */ TrackingDbEvent(final @NonNull GeckoBundle bundle) {
      type = bundle.getInt("type");
      count = bundle.getInt("count");
      date = bundle.getString("date", null);
    }

    /** Protected constructor for TrackingDBEvent. */
    protected TrackingDbEvent() {
      type = 0;
      count = 0;
      date = null;
    }
  }

  /**
   * Get content blocking events aggregated by date and type for a given date range.
   *
   * @param dateFrom Start of the date range, in milliseconds since epoch.
   * @param dateTo End of the date range, in milliseconds since epoch.
   * @return A {@link GeckoResult} that resolves to the list of tracking database events.
   */
  @HandlerThread
  public @NonNull GeckoResult<List<TrackingDbEvent>> getTrackingDbEventsByDateRange(
      final long dateFrom, final long dateTo) {
    ThreadUtils.assertOnHandlerThread();

    final GeckoBundle msg = new GeckoBundle(2);
    msg.putLong("dateFrom", dateFrom);
    msg.putLong("dateTo", dateTo);
    return EventDispatcher.getInstance()
        .queryBundle("GeckoView:TrackingDB:GetEventsByDateRange", msg)
        .map(this::eventsFromBundle);
  }

  /**
   * Get the total count of all content blocking events ever recorded.
   *
   * @return A {@link GeckoResult} that resolves to the total event count.
   */
  @HandlerThread
  public @NonNull GeckoResult<Integer> sumAllTrackingDbEvents() {
    ThreadUtils.assertOnHandlerThread();

    return EventDispatcher.getInstance()
        .queryBundle("GeckoView:TrackingDB:SumAllEvents")
        .map(bundle -> bundle.getInt("sum", 0));
  }

  /**
   * Get the earliest recorded date in the content blocking database.
   *
   * @return A {@link GeckoResult} that resolves to the earliest date as milliseconds since epoch,
   *     or 0 if no data exists.
   */
  @HandlerThread
  public @NonNull GeckoResult<Long> getTrackingDbEarliestRecordedDate() {
    ThreadUtils.assertOnHandlerThread();

    return EventDispatcher.getInstance()
        .queryBundle("GeckoView:TrackingDB:GetEarliestRecordedDate")
        .map(bundle -> bundle.getLong("date", 0L));
  }

  /**
   * Remove all entries from the content blocking database.
   *
   * @return A {@link GeckoResult} that completes when the database has been cleared.
   */
  @HandlerThread
  public @NonNull GeckoResult<Void> clearTrackingDb() {
    ThreadUtils.assertOnHandlerThread();

    return EventDispatcher.getInstance().queryVoid("GeckoView:TrackingDB:ClearAll");
  }

  private List<TrackingDbEvent> eventsFromBundle(final GeckoBundle value) {
    final GeckoBundle[] bundles = value.getBundleArray("events");
    if (bundles == null) {
      return Collections.emptyList();
    }
    final ArrayList<TrackingDbEvent> list = new ArrayList<>(bundles.length);
    for (final GeckoBundle b : bundles) {
      list.add(new TrackingDbEvent(b));
    }
    return Collections.unmodifiableList(list);
  }
}
