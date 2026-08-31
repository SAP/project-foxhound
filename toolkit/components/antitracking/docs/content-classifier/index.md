# Content Classifier Service

The Content Classifier Service (`toolkit/components/content-classifier/`) is
the anti-tracking component that classifies network channels against
adblock-format filter lists delivered through Remote Settings. It is a
parallel classification path layered alongside the older URL Classifier and
its safebrowsing-format hash tables: same set of features (trackers, social
trackers, fingerprinters, cryptominers, email trackers, plus
allow-list/exception features and dedicated `test_block` / `test_annotate`
features), but driven by full adblock syntax rules evaluated by a Rust
engine wrapping the [`adblock`](https://crates.io/crates/adblock) crate.

This page is a reference for how the service is wired up internally: where
list bytes live, how they get turned into engines, how a channel
classification request flows through it, and which invariants the code
depends on.

## Components

| File | Role |
| ---  | ---  |
| `nsIContentClassifierService.idl` | XPCOM contract surfaced to JS: `onListsChanged(updated, removed)`, `getFeatureNames()`, and the test-only `NS_CONTENT_CLASSIFIER_FILTER_LISTS_LOADED_TOPIC` observer notification that fires after every rebuild. |
| `nsIContentClassifierRemoteSettingsClient.idl` | JS-side contract: `init`, `shutdown`, `getListBytes(listName)`. |
| `ContentClassifierService.{h,cpp}` | The singleton C++ service. Owns the feature table, the per-feature engine map, the four mode-keyed active-engine lists, the mutex, pref/Nimbus observers, async-shutdown blocker, and the build thread. |
| `ContentClassifierRemoteSettingsClient.sys.mjs` | Wraps the `content-classifier-lists` Remote Settings collection. Owns the on-disk attachment cache, registers a sync listener, and pulls bytes on demand. |
| `content_classifier_engine/` (Rust crate) | Wraps the `adblock` crate (v0.12.1, `full-regex-handling` + `single-thread` features) behind a small FFI: `engine_from_rules`, `check_network_request_preparsed`, `engine_destroy`, plus init/teardown for an `nsIEffectiveTLDService`-backed domain resolver. |
| `ContentClassifierEngine.{h,cpp}` | Thread-safe refcounted C++ wrapper around the Rust FFI engine. Extracts request metadata from an `nsIChannel`-derived `ContentClassifierRequest` and calls into Rust. |
| `components.conf`, `moz.build` | Component registration and build setup (cbindgen generates `content_classifier_ffi.h`). |

## Features and prefs

The static `kFeatures[]` table (`ContentClassifierService.cpp`) is the single
source of truth for which feature names exist, which Remote Settings list
IDs roll up into each feature's engine, and how matches are reported to the
channel. Each entry carries:

- `mName` — the identifier used in prefs.
- `mListIds` — one or more Remote Settings record names whose attachments
  are concatenated into the feature's engine rules.
- `mClassificationFlag` — the
  `nsIClassifiedChannel::ClassificationFlags` bit set on the channel for an
  annotation match.
- `mLoadedState` / `mReplacedState` / `mAllowedState` —
  `nsIWebProgressListener` STATE_LOADED_* / STATE_REPLACED_* /
  STATE_ALLOWED_* values logged into the content blocking log.
  `mLoadedState == 0` denotes an annotate-without-notify feature.
- `mBlockingErrorCode` — `NS_ERROR_*_URI` passed to
  `UrlClassifierCommon::SetBlockedContent` for a cancellation; `NS_OK`
  means the feature has no blocking variant and is only ever an annotation.
- `mExceptionOnly` — true if the feature contains only allowlist /
  exception rules. This means it must be last in a list of features.
  A console warning will yell at you for this.

Enable switches (per mode):

- `privacy.trackingprotection.content.protection.enabled`
- `privacy.trackingprotection.content.annotation.enabled`

Feature selection (comma-separated feature names):

- `privacy.trackingprotection.content.protection.engines`
- `privacy.trackingprotection.content.protection.engines.pbmode`
- `privacy.trackingprotection.content.annotation.engines`
- `privacy.trackingprotection.content.annotation.engines.pbmode`

Test-only lists fetched over HTTP (used by the `test_block` /
`test_annotate` features so tests don't need a live Remote Settings
collection):

- `privacy.trackingprotection.content.protection.test_list_urls`
- `privacy.trackingprotection.content.annotation.test_list_urls`

All of the above prefs are mapped onto Nimbus feature variables in
`toolkit/components/nimbus/FeatureManifest.yaml`.

## Threading model

Three thread types appear in this code, and the rebuild and classify
paths both deliberately move work between them:

- **Main thread.** All init, pref observers, Remote Settings sync
  callbacks, and final channel-side decisions (`MaybeCancelChannel`,
  `MaybeAnnotateChannel`) run here.
- **`mBuildThread`** (an `nsISerialEventTarget` task queue, created in
  `Init`). The CPU-heavy half of an engine rebuild runs here:
  `Engine::from_rules` calls (the actual adblock parser) happen with no
  lock held, and the lock-protected `InstallEngine` /
  `PopulateAllActiveEnginesFromPreferenceSnapshot` / `PruneInactiveEngines`
  steps run here too, just briefly under `mLock`.
- **URL-classifier worker thread.** `ClassifyForCancel` and
  `ClassifyForAnnotate` run here, called from
  `netwerk/url-classifier/AsyncUrlChannelClassifier.cpp`. Both acquire
  `mLock` briefly to snapshot the active-engine list pointer and then
  release it before crossing the FFI.

The `mozilla::Mutex mLock` is **non-recursive**. Reacquiring it while
already held will deadlock the calling thread. The header enforces this
by:

- Marking `mInitPhase`, `mEngines`, `mFeatureVersions`,
  `mUpdateGeneration`, and the four active-engine arrays as
  `MOZ_GUARDED_BY(mLock)`.
- Annotating `InstallEngine`,
  `PopulateAllActiveEnginesFromPreferenceSnapshot`, and
  `PruneInactiveEngines` with `MOZ_REQUIRES(mLock)`.
- Releasing `mLock` before any call into the engine FFI (so a long
  classification cannot stall a rebuild and vice versa).

You may be tempted to use a RWLock. This will give you less than you think
because we really only have one classifying thread. Worse yet, I don't
remember if the engine lookup is threadsafe.

## List load and engine rebuild

A rebuild is triggered by any of:

- Initial `InitRSClient()` (first time the service sees an active RS
  feature).
- A Remote Settings sync push (`onSync` in the JS client).
- A pref change: master enable, an engines selection pref, or one of the
  `test_list_urls` prefs.

`onListsChanged(updated, removed)` on the main thread calls
`ProcessListChanges`, which takes a fresh `EnginesPrefsSnapshot` of the
current pref state, walks the active features named in that snapshot, and
selects every feature that either has no engine yet or whose
`mListIds` overlap `updated` ∪ `removed`. That set goes to
`UpdateFeatures`.

`UpdateFeatures` (main thread) bumps `mUpdateGeneration` (global) and the
per-feature `mFeatureVersions` entry for every feature it's about to
rebuild — both under `mLock`. It then fires
`FetchEngineDataForFeature` to get the rule lists.
The `MozPromise<>` returned by each fetch is
collected via `MozPromise::AllSettled`; when all of them resolve, the
collected rule arrays plus the captured generation and per-feature
versions are dispatched onto `mBuildThread`.

On `mBuildThread`, with no lock held, we build the rule engines.

The same `mBuildThread` task then reacquires `mLock` and performs the
install / populate / prune step under it:

- For each freshly built engine, compare the captured per-feature version
  to the current `mFeatureVersions` entry. If a newer rebuild has been
  issued since this one was dispatched, the captured version is stale and
  the engine is dropped on the floor. Otherwise it's stored into `mEngines`
  via `InstallEngine`.
- After all installs, compare the captured `mUpdateGeneration` to the
  current one. Only if it's still the latest do we run
  `PopulateAllActiveEnginesFromPreferenceSnapshot` (rebuild the four
  per-mode active-engine arrays from `mEngines`, in pref order) and
  `PruneInactiveEngines` (drop entries from `mEngines` not referenced by
  any active-engine array).

This versioning-and-recheck pattern is the safety invariant for concurrent
rebuilds: two rebuilds racing through `mBuildThread` can never have the
older one's snapshot overwrite the newer one's results, because the
older one's captured generation no longer matches by the time it tries
to commit.

Finally a small task is dispatched back to the main thread to fire
`NS_CONTENT_CLASSIFIER_FILTER_LISTS_LOADED_TOPIC` (test-only, gated on the
`privacy.trackingprotection.content.testing` pref), which is how the
browser tests await rebuild completion. These need to be debounced.

## Channel classification

A channel classification request enters from
`netwerk/url-classifier/AsyncUrlChannelClassifier.cpp` on the URL-classifier
worker thread. The caller has already constructed a `ContentClassifierRequest`
on the main thread that extracts the URL, the schemeless site and source
schemeless site (via `nsIEffectiveTLDService`), the request type (mapped
from `ExtContentPolicyType` to an adblock type string), the third-party
flag (via `mozIThirdPartyUtil`), and the PBM flag.

`ClassifyForCancel` and `ClassifyForAnnotate` both acquire `mLock`, pick
the appropriate active-engine array based on PBM and mode, and call
`ClassifyWithEngines`. The lock is released before returning the result.

`ClassifyWithEngines` takes an `aIndependentEngines` flag that controls
how engine evaluation chains:

- **Cancel (`aIndependentEngines = false`).** Threads a `matchedSoFar`
  flag through every `CheckNetworkRequest` call so exception-only engines
  see the propagated `matched_rule`. Stops iterating when the aggregated
  status reaches `ImportantHit` or `ImportantException` — either of those
  pins the outcome and further engines can't change it — but otherwise
  continues so a trailing exception can still demote an earlier hit.
- **Annotate (`aIndependentEngines = true`).** Each engine sees
  `previously_matched_rule = false`, so each evaluates its own rules in
  isolation and `MaybeAnnotateChannel` can attribute matches to every
  feature whose rules fired.

`ContentClassifierEngine::CheckNetworkRequest` short-circuits to a `Miss`
for first-party requests before crossing the FFI. For genuine
third-party requests, it builds the preparsed request fields once and
calls `content_classifier_engine_check_network_request_preparsed`. The
Rust side constructs an `adblock::Request` via `Request::preparsed`,
calls `Engine::check_network_request_subset(req, previously_matched_rule,
false)`, and writes back `matched`, `important`, and an optional
`exception` rule string.

Each per-engine result is folded into a `ContentClassifierResult` via
`Accumulate`. The status enum is ordered (Miss < Hit < Exception <
ImportantHit < ImportantException), and `Accumulate` promotes
monotonically: any Exception promotes the aggregate over a Hit, and any
Important value pins the status against later non-Important results.
Really, the status enum only matters for annotation.

The worker thread dispatches the result back to the main thread, which
then calls either `MaybeCancelChannel` (consults
`ChannelClassifierUtils::IsAllowListed`, finds the first matched feature
whose `mBlockingErrorCode` is non-`NS_OK`, hands off to
`ChannelClassifierUtils::MaybeBlockChannel`) or `MaybeAnnotateChannel`
(iterates the engine-result list and calls
`ChannelClassifierUtils::AnnotateChannel` for each matched feature with a
non-zero `mLoadedState`, applying the feature's classification flag and
loaded state to the channel).
