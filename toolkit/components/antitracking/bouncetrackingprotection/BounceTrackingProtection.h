/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef mozilla_BounceTrackingProtection_h__
#define mozilla_BounceTrackingProtection_h__

#include "mozilla/Logging.h"
#include "mozilla/MozPromise.h"
#include "nsIBounceTrackingProtection.h"
#include "nsIBTPRemoteExceptionList.h"
#include "mozilla/Maybe.h"
#include "nsIObserver.h"
#include "nsWeakReference.h"
#include "nsTHashSet.h"

class nsIPrincipal;
class nsITimer;

namespace mozilla {

class BounceTrackingAllowList;
class BounceTrackingState;
class BounceTrackingStateGlobal;
class BounceTrackingProtectionStorage;
class ClearDataCallback;
class OriginAttributes;

namespace dom {
class WindowContext;
}

using ClearDataMozPromise = MozPromise<nsCString, uint32_t, true>;

extern LazyLogModule gBounceTrackingProtectionLog;

class BounceTrackingProtection final : public nsIBounceTrackingProtection,
                                       public nsIObserver,
                                       public nsSupportsWeakReference {
  NS_DECL_ISUPPORTS
  NS_DECL_NSIOBSERVER
  NS_DECL_NSIBOUNCETRACKINGPROTECTION

 public:
  static already_AddRefed<BounceTrackingProtection> GetSingleton();

  // This algorithm is called when detecting the end of an extended navigation.
  // This could happen if a user-initiated navigation is detected in process
  // navigation start for bounce tracking, or if the client bounce detection
  // timer expires after process response received for bounce tracking without
  // observing a client redirect.
  [[nodiscard]] nsresult RecordStatefulBounces(
      BounceTrackingState* aBounceTrackingState);

  // Stores a user activation flag with a timestamp for the given principal. The
  // timestamp defaults to the current time, but can be overridden via
  // aActivationTime.
  // Parent process only. Prefer the WindowContext variant if possible.
  [[nodiscard]] static nsresult RecordUserActivation(
      nsIPrincipal* aPrincipal, Maybe<PRTime> aActivationTime = Nothing());

  // Same as above but can be called from any process given a WindowContext.
  // Gecko callers should prefer this method because it takes care of IPC and
  // gets the principal user activation. IPC messages from the content to parent
  // passing a principal should be avoided for security reasons. aActivationTime
  // defaults to PR_Now().
  [[nodiscard]] static nsresult RecordUserActivation(
      dom::WindowContext* aWindowContext);

  // Clears expired user interaction flags for the given state global. If
  // aStateGlobal == nullptr, clears expired user interaction flags for all
  // state globals.
  [[nodiscard]] nsresult ClearExpiredUserInteractions(
      BounceTrackingStateGlobal* aStateGlobal = nullptr);

 private:
  BounceTrackingProtection() = default;
  ~BounceTrackingProtection() = default;

  // Initializes the singleton instance of BounceTrackingProtection.
  [[nodiscard]] nsresult Init();

  // Keeps track of whether the feature is enabled based on pref state.
  // Initialized on first call of GetSingleton.
  static Maybe<bool> sFeatureIsEnabled;

  // Timer which periodically runs PurgeBounceTrackers.
  nsCOMPtr<nsITimer> mBounceTrackingPurgeTimer;

  // Storage for user agent globals.
  RefPtr<BounceTrackingProtectionStorage> mStorage;

  // Interface to remote settings exception list.
  nsCOMPtr<nsIBTPRemoteExceptionList> mRemoteExceptionList;

  // In-memory copy of the remote settings exception list.
  nsTHashSet<nsCStringHashKey> mRemoteSiteHostExceptions;

  // Lazily initializes the remote exception list.
  RefPtr<GenericPromise> EnsureRemoteExceptionListService();

  // Clear state for classified bounce trackers. To be called on an interval.
  using PurgeBounceTrackersMozPromise =
      MozPromise<nsTArray<nsCString>, nsresult, true>;
  RefPtr<PurgeBounceTrackersMozPromise> PurgeBounceTrackers();

  // Report purged trackers to the anti-tracking database via
  // nsITrackingDBService.
  static void ReportPurgedTrackersToAntiTrackingDB(
      const nsTArray<nsCString>& aPurgedSiteHosts);

  // Clear state for classified bounce trackers for a specific state global.
  // aClearPromises is populated with promises for each host that is cleared.
  [[nodiscard]] nsresult PurgeBounceTrackersForStateGlobal(
      BounceTrackingStateGlobal* aStateGlobal,
      BounceTrackingAllowList& aBounceTrackingAllowList,
      nsTArray<RefPtr<ClearDataMozPromise>>& aClearPromises);

  // Whether a purge operation is currently in progress. This avoids running
  // multiple purge operations at the same time.
  bool mPurgeInProgress = false;

  // Imports user activation permissions from permission manager if needed. This
  // is important so we don't purge data for sites the user has interacted with
  // before the feature was enabled.
  [[nodiscard]] nsresult MaybeMigrateUserInteractionPermissions();
};

}  // namespace mozilla

#endif
