# Firefox Resource Tailing Documentation

## Overview

Resource tailing is a network optimization mechanism in Firefox that delays the loading of certain low-priority resources (typically third-party tracking resources) until higher-priority resources have finished loading. This helps improve page load performance by prioritizing resources that are critical for rendering and user interaction.

For information about how resource tailing integrates with Firefox's overall network scheduling and prioritization system, see [Firefox Network Scheduling and Prioritization](prioritization.md).

## How Resource Tailing Works

### The Mechanism

1. **Request Context**: Each page load has an associated [nsIRequestContext](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIRequestContext.idl#41) that tracks the state of all network requests belonging to that context.

2. **Tailed vs Non-Tailed Requests**:
   - Non-tailed requests are regular resources that load immediately
   - Tailed requests are delayed resources that are queued until certain conditions are met
   - The request context maintains a count of active non-tailed requests via [AddNonTailRequest()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIRequestContext.idl#82) and [RemoveNonTailRequest()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIRequestContext.idl#83)

3. **Tail Blocking Logic** (see [RequestContext::IsContextTailBlocked()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/RequestContextService.cpp#334):
   - When a channel marked as "tailable" attempts to open, it calls [IsContextTailBlocked()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/RequestContextService.cpp#334)
   - If the context is in tail-blocked state (has active non-tailed requests), the channel is queued
   - The channel implements [nsIRequestTailUnblockCallback](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIRequestContext.idl#19) and its [OnTailUnblock()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIRequestContext.idl#29) method is called when unblocked

4. **Unblocking Conditions**:
   - **Time-based**: A timer schedules when to unblock tailed requests. The delay is calculated as:
     - `delay = quantum * mNonTailRequests` (with maximum limits)
     - Default quantum decreases after DOMContentLoaded
     - The delay decreases progressively with time since page load began
   - **Load completion**: When non-tailed request count drops to zero after DOMContentLoaded
   - **Forced unblocking**: When the request context is canceled (e.g., navigation away)

5. **Implementation Flow**
   ```
   AsyncOpen() or Connect()
     → WaitingForTailUnblock() checks if channel should be tailed
       → If yes: queued via IsContextTailBlocked()
       → mOnTailUnblock callback is set
     → Later: OnTailUnblock() is called
       → Executes the saved callback to continue operation
   ```

## Eligibility for Tailing

A Resource is Eligible for Tailing When:

1. Has the [nsIClassOfService::Tail](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIClassOfService.idl#112) flag set
2. Does NOT have any of these flags:
   - `UrgentStart` - User-initiated or high-priority requests
   - `Leader` - Blocking resources in document head
   - `TailForbidden` - Explicitly forbidden from tailing
3. If marked `Unblocked`, must also have `TailAllowed` flag
4. Is NOT a navigation request ([IsNavigation()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/protocol/http/HttpBaseChannel.cpp#4391) returns false)

## Resources That Are Tailed

### Primary Case: Third-Party Tracking Resources
- **When**: A resource is classified as a third-party tracker (see [nsHttpChannel::Connect()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/protocol/http/nsHttpChannel.cpp#1436))
- **Detected**: via [IsThirdPartyTrackingResource()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/protocol/http/HttpBaseChannel.cpp#1831) using URL classifier
- **Flag added**: [nsIClassOfService::Tail](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIClassOfService.idl#112)

### Secondary Case: Async Scripts with TailAllowed
- **Resource**: Async `<script>` elements (see [ScriptLoader::PrepareRequestPriorityAndRequestDependencies](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/dom/script/ScriptLoader.cpp#892))
- **Flags**: `Unblocked | TailAllowed`
- **Reasoning**: Async scripts don't block DOMContentLoaded, so they can be tailed if detected as trackers

## Resources That Are NEVER Tailed

### 1. Navigation Requests
- **Resource**: Top-level document loads (see [HttpBaseChannel::IsNavigation()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/protocol/http/HttpBaseChannel.cpp#4391))
- **Check**: `LoadForceMainDocumentChannel() || (mLoadFlags & LOAD_DOCUMENT_URI)`
- **Reason**: Primary content must load first

### 2. Leader Resources (Critical Render-Blocking)
- **Resources**:
  - Non-deferred stylesheets (see [Loader::LoadSheetAsyncInternal](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/layout/style/Loader.cpp#1398))
  - Synchronous scripts in document `<head>` that block loading (see [ScriptLoader::PrepareRequestPriorityAndRequestDependencies](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/dom/script/ScriptLoader.cpp#870))
- **Flag**: [nsIClassOfService::Leader](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIClassOfService.idl#88)
- **Reason**: These block rendering and must load as fast as possible

### 3. UrgentStart Resources (User-Initiated)
- **Resources**:
  - Fetches triggered during user input events (see [FetchDriver::HttpFetch()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/dom/fetch/FetchDriver.cpp#498))
  - Images loaded with urgent flag during interactions (see [ImageLoadTask::mUseUrgentStartForChannel](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/dom/base/nsImageLoadingContent.cpp#92))
  - Top-level document loads
- **Flag**: [nsIClassOfService::UrgentStart](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIClassOfService.idl#106)
- **Reason**: Direct response to user actions must be immediate

### 4. TailForbidden Resources
- **Resources**:
  - Deferred scripts when tailing is disabled (see [ScriptLoader::PrepareRequestPriorityAndRequestDependencies](https://searchfox.org/firefox-main/rev/d4456d810664a2a13a871a68e5323522a78c1131/dom/script/ScriptLoader.cpp#880))
  - Resources explicitly marked to never be tailed
- **Flag**: [nsIClassOfService::TailForbidden](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIClassOfService.idl#118)
- **Reason**: These resources need to load to fire DOMContentLoaded

### 5. Other Unblocked Resources (without TailAllowed)
- **Resources**:
  - Body synchronous scripts and head/body async scripts (see [ScriptLoader::PrepareRequestPriorityAndRequestDependencies](https://searchfox.org/firefox-main/rev/d4456d810664a2a13a871a68e5323522a78c1131/dom/script/ScriptLoader.cpp#884))
  - Other resources that shouldn't be blocked by Leaders but also shouldn't be tailed
- **Flags**: `Unblocked` without `TailAllowed`

### 6. Resources with TailForbidden Override
- **Check**: See [nsHttpChannel::EligibleForTailing()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/protocol/http/nsHttpChannel.cpp#12075) which checks for `TailForbidden` flag
- Any combination of flags with `TailForbidden` prevents tailing

## Key Files and Interfaces

### Core Interfaces
- **[netwerk/base/nsIRequestContext.idl](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIRequestContext.idl)**: Defines the request context interface for managing tail blocking
- **[netwerk/base/nsIClassOfService.idl](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIClassOfService.idl)**: Defines class of service flags (Tail, TailAllowed, TailForbidden, Leader, UrgentStart, etc.)

### Implementation
- **[netwerk/base/RequestContextService.cpp](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/RequestContextService.cpp)**: Implements the request context and tail queue management
- **[netwerk/protocol/http/nsHttpChannel.cpp](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/protocol/http/nsHttpChannel.cpp)**:
  - [WaitingForTailUnblock()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/protocol/http/nsHttpChannel.cpp#12098): Checks if channel should be tailed
  - [EligibleForTailing()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/protocol/http/nsHttpChannel.cpp#12075): Determines tailing eligibility
  - [OnTailUnblock()](https://searchfox.org/firefox-main/rev/d4456d810664a2a13a871a68e5323522a78c1131/netwerk/protocol/http/nsHttpChannel.cpp#12139): Callback when channel is unblocked
  - [Connect()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/protocol/http/nsHttpChannel.cpp#1365) / [AsyncOpen()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/protocol/http/nsHttpChannel.cpp#7391): Entry points that check for tailing

### Resource-Specific Code
- **[dom/script/ScriptLoader.cpp](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/dom/script/ScriptLoader.cpp)**: Sets flags for script resources (Leader, TailForbidden, TailAllowed)
- **[layout/style/Loader.cpp](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/layout/style/Loader.cpp)**: Sets Leader flag for blocking stylesheets
- **[dom/fetch/FetchDriver.cpp](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/dom/fetch/FetchDriver.cpp)**: Sets UrgentStart for user-initiated fetches
- **[dom/base/nsImageLoadingContent.cpp](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/dom/base/nsImageLoadingContent.cpp)**: Handles urgent image loading

### Classification
- **[netwerk/protocol/http/HttpBaseChannel.cpp](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/protocol/http/HttpBaseChannel.cpp)**: [IsThirdPartyTrackingResource()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/protocol/http/HttpBaseChannel.cpp#1831) determines if a resource is a tracker
- **[netwerk/url-classifier/UrlClassifierCommon.cpp](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/url-classifier/UrlClassifierCommon.cpp)**: URL classification logic for trackers

## HTTP/2 Priority Mapping

For HTTP/2 connections (see urgency calculation in [nsHttpHandler::UrgencyFromCoSFlags()](https://searchfox.org/firefox-main/rev/d4456d810664a2a13a871a68e5323522a78c1131/netwerk/protocol/http/nsHttpHandler.cpp#921):
- Tailed resources get a special urgency level: `network.http.tailing.urgency` pref
- See comments in [nsIClassOfService.idl](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/nsIClassOfService.idl) for full HTTP/2 priority tree documentation

## Configuration Preferences

- **`network.http.tailing.enabled`**: Master switch for tailing feature
- **`network.http.tailing.urgency`**: HTTP/2 urgency level for tailed resources
- Delay calculation parameters in [nsHttpHandler](https://searchfox.org/firefox-main/rev/d4456d810664a2a13a871a68e5323522a78c1131/netwerk/protocol/http/nsHttpHandler.cpp#1744-1760)

## Child Process Handling

- **Tailing is not supported in child processes** (see [RequestContext::BeginLoad()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/RequestContextService.cpp#113) and [RequestContext::DOMContentLoaded()](https://searchfox.org/firefox-main/rev/39bc83bb8632d54d70542dc5d98c046a317ec99d/netwerk/base/RequestContextService.cpp#132))
- Request context state is synchronized with parent process via Necko IPC
- Actual tail blocking only occurs in the parent process

## Summary

Resource tailing intelligently delays low-priority resources (primarily third-party trackers) to improve page load performance. The system uses:

1. **Class of Service flags** to mark resource priority and tailing eligibility
2. **Request Contexts** to manage tail queues per page load
3. **Time-based and load-based heuristics** to determine when to unblock
4. **Strict rules** to ensure critical resources (navigations, Leaders, UrgentStart) are never delayed

This creates a more responsive browsing experience by prioritizing resources that matter most to the user while still allowing tracking and analytics resources to eventually load.

Note that on some pages tailing can actually make the pageload slower. See [bug 1962817](https://bugzilla.mozilla.org/show_bug.cgi?id=1962817) where the page hides the content until the tracking content loads.
