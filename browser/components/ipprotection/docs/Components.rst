Components
==========

This page summarizes the main components and how to extend the system safely.

Component Diagram
-----------------

A diagram of all the main components is the following:

.. mermaid::
   :align: center
   :caption: IP Protection architecture

   flowchart TD

     IPProtectionService

     Helpers["IPProtectionHelpers"]

     %% UI
     subgraph UI
       IPProtection
       IPProtectionPanel
       IPPExceptionsManager
     end

     %% Helpers
     subgraph Helpers
       IPPStartupCache["Startup Cache Helper"]
       IPPSignInWatcher["Sign-in Observer"]
       IPProtectionServerlist
       IPPEnrollAndEntitleManager["Enroll & Entitle Manager"]
       IPPProxyManager
       UIHelper["UI Helper"]
       IPPAutoStart["Auto-Start Helper"]
       IPPEarlyStartupFilter["Early Startup Filter Helper"]
       IPPNimbusHelper["Nimbus Eligibility Helper"]
     end

     %% Proxy stack
     subgraph Proxy
       IPPChannelFilter
       IPPNetworkErrorObserver
       GuardianClient
     end

     %% Service wiring
     IPProtectionService --> GuardianClient
     IPProtectionService --> Helpers

     %% UI wiring
     IPProtection --> IPProtectionPanel
     IPProtection --> IPProtectionService

     %% Proxy wiring
     IPPProxyManager --> IPPChannelFilter
     IPPProxyManager --> IPPNetworkErrorObserver
     IPPNetworkErrorObserver -- "error events (401)" --> IPPProxyManager


GuardianClient
  Manages communication between Firefox and the Guardian backend. It retrieves
  account information, obtains the token for the proxy, and exposes the server list.

IPPChannelFilter
  Main network component. It processes network requests and decides which ones
  should go through the proxy.

IPPProxyManager
  Implements the proxy activation/deactivation and exposes the current status.

IPProtectionPanel
  Controls the feature’s panel UI.

IPPExceptionsManager
  Manages the exceptions UI and logic (for example, domain exclusions)
  in coordination with the panel and preferences.

IPProtectionService
  The main service. It is initialized during browser startup, initializes helpers
  and other components, and implements the state machine that drives the feature.

IPProtection
  Manages the UI integration and interactions with the panel.

Additional proxy/telemetry components
-------------------------------------

IPProtectionServerlist
  Provides the available proxy endpoints (server list) to the proxy manager.

IPProtectionUsage
  Gathers usage information and telemetry related to proxy activity.

IPPNetworkErrorObserver
  Observes network errors related to the proxy and notifies the proxy manager
  (for example, authentication or connectivity failures).

Helper objects
--------------

The list of helpers lives in ``IPProtectionHelpers.sys.mjs`` and is exported
as the ``IPPHelpers`` array. Helpers implement small, self‑contained behaviors
and listen to service events when needed.

IPPAutoStart
  Activates the proxy at startup time when auto‑start is enabled.

IPPSignInWatcher
  Observes user authentication state. It informs the state machine when the user
  signs in or out.

IPPStartupCache
  Exposes cached information to keep the state machine responsive during startup
  (last known state and entitlement JSON object).

UIHelper
  Shows and hides the UI based on the current state machine state.

AccountResetHelper
  Resets stored account information and stops the proxy when the account becomes
  unavailable.

IPPNimbusHelper
  Monitors the Nimbus feature (``NimbusFeatures.ipProtection``) and triggers a
  state recomputation on updates.

IPPEnrollAndEntitleManager
  Orchestrates the user enrollment flow with Guardian and updates the service
  when enrollment status changes.

IPPProxyManager
  Manages the proxy lifecycle: requests proxy passes, selects the active server,
  and exposes the connection status to the rest of the feature.

How to implement new components
-------------------------------

Do not modify the state machine. New functionality should be added via helper
classes to keep the core simple and robust.

Recommended steps:

1. Create a helper class with the methods ``init()``, ``initOnStartupCompleted()``
   and ``uninit()`` as appropriate for lifecycle needs.
2. If your helper reacts to state changes, listen to the
   ``IPProtectionService:StateChanged`` event.
3. Add your helper to the ``IPPHelpers`` array in ``IPProtectionHelpers.sys.mjs``.
   Be mindful of ordering if your helper depends on others. For example,
   ``IPPNimbusHelper`` is registered last to avoid premature state updates
   triggered by Nimbus’ immediate callback.
4. If your component needs to recompute the service state, call
   ``IPProtectionService.updateState()`` after updating the helper data it
   relies on; the recomputation is synchronous.
