# Bounce Tracking Protection

Bounce Tracking Protection (BTP) is an anti-tracking feature in Gecko which
detects bounce trackers (navigational tracking) based on a set of heuristics. As
opposed to the [cookie purging](../cookie-purging/index.md) feature it does not
rely on a list of trackers which makes it more webcompat friendly while also
covering unknown bounce trackers.


## Standardization

The protection is a work item of the PrivacyCG. The implementation in Gecko
closely follows the
[Bounce Tracking Mitigations spec draft](https://privacycg.github.io/nav-tracking-mitigations/#bounce-tracking-mitigations).

Mozilla also has a [specification position on Bounce Tracking Mitigations](https://mozilla.github.io/standards-positions/#bounce-tracking-mitigations).


## Behavior

BTP detects bounce trackers by looking at navigation timing. It establishes the
concept of an extended navigation which can encompass a chain of short-lived
redirects. These short-lived redirects are commonly used by bounce trackers. If
a site accesses cookies or storage in such a short-lived redirect it gets added
to a classification list. Classified bounce trackers have their cookies, site
data and cache purged periodically. In order to avoid false positives and
purging data that may be important for users, sites which the user directly
interacted with in the last 45 days are exempt from being classified or purged.

See
[Bounce Tracking Mitigations Explainer](https://github.com/privacycg/nav-tracking-mitigations/blob/main/bounce-tracking-explainer.md)
for a more detailed (albeit chromium-oriented) description of the feature and how trackers are classified.

<!---
    TODO: This section should be extended to describe the behavior and rely less on the chromium explainer.
    It should also talk about potential deviations from the spec.
-->

## Gecko Implementation

Work for the Gecko implementation in tracked under following meta-bug:
[Bug 1839915 - \[meta\] Bounce Tracking Protection](https://bugzilla.mozilla.org/show_bug.cgi?id=1839915).


A simplified UML diagram of the BTP implementation in Gecko. Note that some
classes and attributes have been omitted for readability. You can use the
diagram feature in Searchfox to view the full diagram
([example](https://searchfox.org/mozilla-central/query/default?q=class-diagram%3A%27mozilla%3A%3ABounceTrackingState%27+depth%3A2)).

```{mermaid}
classDiagram
    class BounceTrackingProtection {
        - mBounceTrackingPurgeTimer: nsITimer
        - mStorage: BounceTrackingProtectionStorage
        - mStorageObserver: BounceTrackingStorageObserver
    }

    note for BounceTrackingProtection "Singleton class to manage the feature."

    class BounceTrackingProtectionStorage {
        - mStateGlobal : nsTHashMap&lt;OriginAttributesHashKey, RefPtr&lt;BounceTrackingStateGlobal&gt;&gt;
        - mDatabaseFile : nsCOMPtr&lt;nsIFile&gt;
    }

    class BounceTrackingStateGlobal {
        - mUserActivation: nsTHashMap&lt;nsCStringHashKey, PRTime&gt;
        - mBounceTrackers: nsTHashMap&lt;nsCStringHashKey, PRTime&gt;
        - mOriginAttributes: OriginAttributes
    }

    note for BounceTrackingStateGlobal "Manages the global maps for bounce tracker candidates
                                        and user activation for a specific OriginAttributes dict."

    class BounceTrackingStorageObserver {
        <!-- [...] -->
    }

    note for BounceTrackingStorageObserver "Listens to cookie/storage access
                                            and notifies BounceTrackingState"

    class BounceTrackingRecord {
        - mInitialHost: nsAutoCString
        - mBounceHosts: nsTHashSet&lt;nsCStringHashKey&gt;
        - mFinalHost: nsAutoCString
        - mStorageAccessHosts: nsTHashSet&lt;nsCStringHashKey&gt;
    }

    note for BounceTrackingRecord "Encapsulates the per-tab navigation state
                                   during an extended navigation."

    class BounceTrackingState {
        - mBounceTrackingProtection: BounceTrackingProtection
        - mBounceTrackingRecord: BounceTrackingRecord
        - mClientBounceDetectionTimeout: nsReadOnlyTimer
        - mOriginAttributes: OriginAttributes
    }


    class BrowsingContextWebProgress {
        - mBounceTrackingState: BounceTrackingState
    }

    class nsIBTPExceptionList {
        <!-- Bug 1930704: Empty classes lead to build errors. Adding a comment inside the class fixes the issue -->
        <!-- [...] -->
    }

    class BounceTrackingAllowList {
        <!-- [...] -->
    }

    class DocumentLoadListener{
        <!-- [...] -->
    }

    note for BrowsingContextWebProgress "Every tab has a web progress
                                         and therefore a BounceTrackingState"

    BounceTrackingProtection *-- BounceTrackingProtectionStorage
    BounceTrackingProtection *-- BounceTrackingStorageObserver
    BounceTrackingState --o BounceTrackingProtection
    BounceTrackingState --> BounceTrackingProtection : RecordStatefulBounces() on extended nav end
    BounceTrackingState *-- BounceTrackingRecord
    BounceTrackingStorageObserver --> BounceTrackingState : Storage access signals
    BrowsingContextWebProgress *-- BounceTrackingState
    BounceTrackingStateGlobal --* BounceTrackingProtectionStorage
    BounceTrackingStateGlobal --> BounceTrackingProtectionStorage : Persists state changes in storage.
    BounceTrackingProtection --> BounceTrackingStateGlobal : Manages global state
    nsIBTPExceptionList --* BounceTrackingProtection
    nsIBTPExceptionList --> BounceTrackingProtection : Site host purge exceptions from RemoteSettings.
    BounceTrackingAllowList --* BounceTrackingProtection
    BounceTrackingAllowList --> BounceTrackingProtection :  Site host purge exceptions from PermissionManager.
    BrowsingContextWebProgress --> BounceTrackingState : Navigation signals
    DocumentLoadListener --> BounceTrackingState : Navigation signals
```

## Preferences

The feature can be enabled and it's behavior can be adjusted using the
`privacy.bounceTrackingProtection.*` prefs. See
[StaticPrefList.yaml](https://searchfox.org/mozilla-central/rev/ec342a3d481d9ac3324d1041e05eefa6b61392d2/modules/libpref/init/StaticPrefList.yaml#15125-15180)
for a list of prefs with descriptions.

The main feature pref is `privacy.bounceTrackingProtection.mode` where `0` is
fully disabled and `1` is fully enabled. See
[nsIBounceTrackingProtection.idl](https://searchfox.org/mozilla-central/rev/ec342a3d481d9ac3324d1041e05eefa6b61392d2/toolkit/components/antitracking/bouncetrackingprotection/nsIBounceTrackingProtection.idl#10-42)
for a full list of options.

## Logging
BTP has a logger which can be enabled by starting Firefox with the `MOZ_LOG`
environment variable. Use `MOZ_LOG=BounceTrackingProtection:5` for verbose
logging for every navigation and `MOZ_LOG=BounceTrackingProtection:3` for more
concise logging focused on classification and purging.

## Testing
When testing sites to ensure they don't get purged for bounce tracking behavior
you can use both logging (as described above) to observe classification and
direct calls to the feature via the Browser Toolbox to trigger the purging
early.

You can also check the developer tools console for warning messages which will
be logged when a site gets classified. Example:

> “bounce-tracking-demo-tracker-server.glitch.me” has been classified as a
> bounce tracker. If it does not receive user activation within the next 3,600
> seconds it will have its state purged.

The snippets in the following section need to be executed in the [Browser
Toolbox]. Note that while the toolbox looks like the regular devtools it's a
special console used to debug Firefox itself rather than websites.

[Browser Toolbox]: /devtools-user/browser_toolbox/index.rst

### Print the list of classified bounce trackers

To get a list of all currently classified bounce trackers use the following snippet:
```javascript
await Cc[
  "@mozilla.org/bounce-tracking-protection;1"
].getService(Ci.nsIBounceTrackingProtection).testGetUserActivationHosts({})
```
This prints the list excluding private browsing and tab containers. For those
you need to pass in an `OriginAttributes` object. See
[nsIBounceTrackingProtection](https://searchfox.org/mozilla-central/rev/ec342a3d481d9ac3324d1041e05eefa6b61392d2/toolkit/components/antitracking/bouncetrackingprotection/nsIBounceTrackingProtection.idl#90)
for more documentation.

Sites which have been purged or which receive user interaction are automatically
removed from this list.

Note that just because a site is in this list it doesn't mean that it gets
classified. Once classified there is a grace period of 1h in which the site may
receive user interaction. If the user interacts with the site in that time
window it is removed from the bounce tracker list and exempt from purging for 45
days.

### Trigger a purge of all classified trackers:
Before navigating to the site set
`privacy.bounceTrackingProtection.bounceTrackingGracePeriodSec` to `0` or a low
number. This controls how fast after (classified) bounce a site may be purged.
If you don't update this pref you need to wait up to 1h for a site to be purged.

Purges normally run every hour. To trigger a purge manually you can use the
following snippet:
```javascript
await Cc[
  "@mozilla.org/bounce-tracking-protection;1"
].getService(Ci.nsIBounceTrackingProtection).testRunPurgeBounceTrackers();
```
The return value will be an array of sites that have been purged. Note that
purging applies for the entire domain (eTLD+1).

## Test Page
https://bounce-tracking-demo.glitch.me/ is a demo page with two links that
exhibit bounce tracking behaviour. You can use it combined with the methods
above to verify that the mechanism is running.
