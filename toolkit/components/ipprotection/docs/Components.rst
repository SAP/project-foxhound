Components
==========

This page summarizes the main components and how to extend the system safely.

The implementation is split across three layers:

* ``toolkit/components/ipprotection`` — platform-independent core (state machine,
  proxy/network stack, core helpers).
* ``browser/components/ipprotection`` — desktop-specific UI layer (panel, toolbar
  button, alert/infobar managers, and onboarding helpers).
* ``mobile/shared/modules/geckoview/`` — Android GeckoView entry point.

Component Diagram
-----------------

A diagram of all the main components is the following:

.. mermaid::
   :align: center
   :caption: IP Protection architecture

   ---
   config:
     flowchart:
       defaultRenderer: "elk"
   ---
   flowchart LR

     %% browser/components/ipprotection
     subgraph Browser["browser/components/ipprotection (UI layer)"]
       IPProtection
       IPProtectionPanel

       subgraph BrowserHelpers["Browser Helpers"]
         UIHelper["UI Helper"]
         IPPOnboardingMessage["Onboarding Message"]
         IPPOptOutHelper["Opt-Out Helper"]
         IPPUsageHelper["Usage Helper"]
         IPProtectionAlertManager["Alert Manager"]
         IPProtectionInfobarManager["Infobar Manager"]
       end
     end

     %% toolkit/components/ipprotection
     subgraph Toolkit["toolkit/components/ipprotection (core)"]
       IPProtectionService
       IPProtectionActivator

       subgraph CoreHelpers["Core Helpers"]
         IPPStartupCache["Startup Cache Helper"]
         IPProtectionServerlist
         IPPProxyManager
         IPPAutoStart["Auto-Start Helper"]
         IPPAutoRestoreHelper["Auto-Restore Helper"]
         IPPNimbusHelper["Nimbus Eligibility Helper"]
         IPPSessionPrefManager["Session Pref Manager"]
         IPPExceptionsManager
       end

       subgraph FxaAuth["FxA Authentication (fxa/)"]
         IPPAuthProvider
         IPPFxaBaseAuthProvider["FxA Base Auth Provider"]
         IPPFxaAuthProvider
         IPPFxaActivateAuthProvider["Activate Auth Provider"]
         IPPSignInWatcher["Sign-in Observer"]
         GuardianClient
       end

       subgraph Proxy["Proxy stack"]
         IPPChannelFilter
         IPPNetworkErrorObserver
       end
     end

     %% Android layer
     subgraph Android["Android Glue"]
       GeckoViewIPProtection

       subgraph AndroidAuth["Android Authentication"]
         IPPAndroidAuthProvider["Android FxA Auth Provider"]
         IPPGpiAuthProvider["GPI Auth Provider"]
         IPPAndroidSignInWatcher["Android Sign-in Observer"]
       end
     end

     %% Activator wiring
     BrowserHelpers -- "addHelpers()" --> IPProtectionActivator
     IPProtectionActivator --> IPProtectionService
     IPProtectionActivator --> CoreHelpers
     IPProtectionActivator -- "setAuthProvider()" --> IPPFxaAuthProvider
     GeckoViewIPProtection -- "setAuthProvider()" --> IPProtectionActivator

     %% Service wiring
     IPProtectionService --> CoreHelpers
     IPProtectionService -- "authProvider" --> IPPAuthProvider

     %% FxA auth wiring
     IPPFxaBaseAuthProvider -->|extends| IPPAuthProvider
     IPPFxaAuthProvider -->|extends| IPPFxaBaseAuthProvider
     IPPFxaActivateAuthProvider -->|extends| IPPFxaBaseAuthProvider
     IPPFxaBaseAuthProvider --> IPPSignInWatcher
     IPPFxaBaseAuthProvider --> GuardianClient

     %% Android auth wiring
     IPPAndroidAuthProvider -->|extends| IPPFxaAuthProvider
     IPPAndroidAuthProvider --> IPPAndroidSignInWatcher
     IPPGpiAuthProvider -->|extends| IPPAuthProvider

     %% UI wiring
     IPProtection --> IPProtectionPanel
     IPProtection --> IPProtectionService

     %% Proxy wiring
     IPPProxyManager --> IPPChannelFilter
     IPPProxyManager --> IPPNetworkErrorObserver
     IPPNetworkErrorObserver -- "error events (401)" --> IPPProxyManager


Toolkit components (``toolkit/components/ipprotection``)
---------------------------------------------------------

GuardianClient
  HTTP client for the Guardian backend. Manages communication with Guardian to
  retrieve account information, obtain proxy tokens, and run the FxA enrollment
  flow.

IPPChannelFilter
  Main network component. It processes network requests and decides which ones
  should go through the proxy.

IPPProxyManager
  Implements the proxy activation/deactivation and exposes the current status.

IPProtectionService
  The main service. It is initialized during browser startup, initializes helpers
  and other components, and implements the state machine that drives the feature.

IPProtectionActivator
  Entry point that assembles the full helper list and initialises
  ``IPProtectionService``.  It owns the ordered list of core helpers and exposes
  ``addHelpers()`` so that the browser layer can register additional,
  browser-specific helpers before ``init()`` is called.  It also exposes
  ``setAuthProvider()`` to set the active authentication provider.

IPPExceptionsManager
  Manages the exceptions logic (for example, domain exclusions) in coordination
  with the panel and preferences.

Additional proxy/telemetry components
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

IPProtectionServerlist
  Provides the available proxy endpoints (server list) to the proxy manager.

IPPNetworkErrorObserver
  Observes network errors related to the proxy and notifies the proxy manager
  (for example, authentication or connectivity failures).

Core helpers
~~~~~~~~~~~~

The core helper list is defined in ``IPProtectionActivator.sys.mjs`` (toolkit).

IPPAutoStart
  Activates the proxy at startup time when auto-start is enabled.

IPPAutoRestoreHelper
  Restores the proxy state after a crash or restart when auto-restore is enabled.

IPPStartupCache
  Exposes cached information to keep the state machine responsive during startup
  (last known state and entitlement JSON object).

IPPNimbusHelper
  Monitors the Nimbus feature (``NimbusFeatures.ipProtection``) and triggers a
  state recomputation on updates.

FxA authentication (``toolkit/components/ipprotection/fxa``)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Authentication is abstracted behind ``IPPAuthProvider``, which lives in the
toolkit root.  ``IPProtectionService`` always interacts with the provider through
this interface, so all FxA dependencies are fully contained in the ``fxa/``
sub-directory.  On desktop, the concrete provider and its helpers are registered
from ``IPProtectionHelpers.sys.mjs`` in the browser layer.  On Android, the
selection is done by ``GeckoViewIPProtection`` at initialisation time (see below).

IPPAuthProvider
  Base class that defines the authentication interface used by
  ``IPProtectionService``.  The default implementation is a no-op that keeps
  the service in an unauthenticated/inactive state.

IPPFxaBaseAuthProvider
  Abstract base class for FxA-backed providers.

IPPFxaAuthProvider
  Concrete FxA implementation of ``IPPAuthProvider``.  Extends
  ``IPPFxaBaseAuthProvider`` and adds Guardian enrollment via a hidden OAuth
  window.

IPPFxaActivateAuthProvider
  Alternative FxA provider that extends ``IPPFxaBaseAuthProvider``.  Enrolls the
  user by sending the FxA Bearer token directly to Guardian's activate endpoint,
  without using a hidden tab or window.  On desktop, the choice between
  ``IPPFxaAuthProvider`` and ``IPPFxaActivateAuthProvider`` is controlled by
  ``browser.ipProtection.fxa.useActivateFlow``.

IPPSignInWatcher
  Observes user authentication state.  It informs the state machine when the
  user signs in or out.

IPPSessionPrefManager
  Sets session-scoped preferences while the
  proxy is active and resets them when it deactivates, preserving any
  user-set values.

Android authentication
~~~~~~~~~~~~~~~~~~~~~~

On Android, two concrete ``IPPAuthProvider`` implementations are available and
selected at initialisation time by ``GeckoViewIPProtection`` based on the FxA
sign-in state stored in ``toolkit.ipProtection.android.authProvider``.

IPPAndroidAuthProvider
  Android variant of the FxA provider.  Extends ``IPPFxaActivateAuthProvider``
  and uses ``IPPAndroidSignInWatcher`` to track the FxA sign-in state.

IPPGpiAuthProvider
  Google Play Integrity implementation of ``IPPAuthProvider``.  Used when the
  user is not signed into FxA.  Obtains a short-lived GPI token from the Android
  layer via ``EventDispatcher`` and exchanges it for an Auth JWT with Guardian.
  The JWT is cached in ``browser.ipProtection.gpi.authJwt`` so that subsequent
  proxy starts require no network requests.

IPPAndroidSignInWatcher
  Monitors the FxA sign-in state on Android by listening to
  ``IPP:AuthStateChanged`` events from the Android layer.  Exposes ``isSignedIn``
  and dispatches ``IPPSignInWatcher:StateChanged`` when the state changes.

Android GeckoView entry point
-----------------------------

GeckoViewIPProtection
  GeckoView module that owns the IP Protection lifecycle on Android.  On
  ``GeckoView:IPProtection:Init`` it reads the ``toolkit.ipProtection.android.authProvider``
  preference to determine which auth provider to activate: ``IPPAndroidAuthProvider``
  (with its FxA helpers) when the user is signed in, or ``IPPGpiAuthProvider``
  otherwise.  When the FxA sign-in state changes the Android layer clears the
  preference and calls ``Uninit`` followed by ``Init`` so that the correct
  provider is selected again.

Browser components (``browser/components/ipprotection``)
---------------------------------------------------------

IPProtection
  Manages the UI integration and interactions with the panel.

IPProtectionPanel
  Controls the feature's panel UI.

IPProtectionHelpers
  Registers browser-specific helpers with ``IPProtectionActivator`` via
  ``addHelpers()``: ``UIHelper``, ``IPPOnboardingMessage``, ``IPPOptOutHelper``,
  ``IPPUsageHelper``, ``IPProtectionAlertManager``, and ``IPProtectionInfobarManager``.
  It also registers ``IPPFxaAuthProvider`` (and its FxA helpers) via
  ``setAuthProvider()`` and ``addHelpers()``.

UIHelper
  Shows and hides the UI based on the current state machine state.

IPPOptOutHelper
  Handles the user opt-out flow and clears stored state accordingly.

IPPOnboardingMessage
  Handles the onboarding message flow for new users.

IPPUsageHelper
  Tracks bandwidth usage warning state and fires state-change events when
  usage crosses the 75% or 90% thresholds.

IPProtectionAlertManager
  Manages alert notifications related to IP Protection.

IPProtectionInfobarManager
  Manages infobar notifications displayed to the user.

How to implement new components
-------------------------------

Do not modify the state machine. New functionality should be added via helper
classes to keep the core simple and robust.

Recommended steps:

1. Decide whether the helper belongs in the **toolkit** layer (no UI, no chrome
   dependency) or the **browser** layer (UI or chrome integration required).
2. Create a helper class with the methods ``init()``, ``initOnStartupCompleted()``
   and ``uninit()`` as appropriate for lifecycle needs.
3. If your helper reacts to state changes, listen to the
   ``IPProtectionService:StateChanged`` event.
4. Register your helper:

   * **Toolkit helpers**: add it to the ``coreHelpers`` array in
     ``toolkit/components/ipprotection/IPProtectionActivator.sys.mjs``.
   * **Browser helpers**: call ``IPProtectionActivator.addHelpers([...])`` in
     ``browser/components/ipprotection/IPProtectionHelpers.sys.mjs``.

   Be mindful of ordering if your helper depends on others. For example,
   ``IPPNimbusHelper`` is registered last to avoid premature state updates
   triggered by Nimbus' immediate callback.
5. If your component needs to recompute the service state, call
   ``IPProtectionService.updateState()`` after updating the helper data it
   relies on; the recomputation is synchronous.
