Preferences
===========

This document describes preferences affecting Firefox's IP Protection.
These preferences are normally hidden and should not be used unless you really
know what you are doing.

Feature enablement and experiments
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

``browser.ipProtection.enabled`` (boolean, default: ``false``)
  Master feature toggle controlled by Nimbus and testing harnesses.

``browser.ipProtection.userEnabled`` (boolean, default: ``false``)
  For testing; simulates user‑enabled state.

``browser.ipProtection.added`` (boolean, default: ``false``)
  Tracks whether the toolbar button was auto-placed next to the FxA button.
  Once true, the widget is not reinserted automatically after manual removal.

Startup and caching
~~~~~~~~~~~~~~~~~~~

``browser.ipProtection.autoStartEnabled`` (boolean, default: ``false``)
  Enables the auto-start helper so the proxy connects during browser startup.

``browser.ipProtection.stateCache`` (string, default: ``""``)
  Caches the latest ``IPProtectionStates`` value for use during startup.

``browser.ipProtection.entitlementCache`` (string, default: ``""``)
  Cached entitlement JSON string used during startup to avoid network requests.

``browser.ipProtection.locationListCache`` (string, default: ``""``)
  Cached Guardian location list shared between ``IPProtectionService`` and
  ``GuardianClient``.

``browser.ipProtection.cacheDisabled`` (boolean, default: ``false``)
  Turns off all startup caches. Used primarily by xpcshell tests.

Networking and routing
~~~~~~~~~~~~~~~~~~~~~~

``browser.ipProtection.guardian.endpoint`` (string, default: ``"https://vpn.mozilla.org/"``)
  Endpoint for the server‑side infrastructure.

``browser.ipProtection.productVpn.endpoint`` (string, default: ``"https://www.mozilla.org/"``)
  Endpoint for the production mozilla webservice.

``browser.ipProtection.mode`` (integer, default: ``0``)
  Selects which requests are proxied by ``IPPChannelFilter``:
  ``0`` routes all traffic (``MODE_FULL``), ``1`` only private browsing windows
  (``MODE_PB``), ``2`` only requests classified as tracking (``MODE_TRACKER``).

``browser.ipProtection.override.serverlist`` (string)
  A JSON Payload that overrides the server list. Follows the Remote-Settings Schema.

UI Features
~~~~~~~~~~~

``browser.ipProtection.bandwidth.enabled`` (boolean, default: ``false``)
  Controls whether bandwidth usage information is displayed in the status panel.

``browser.ipProtection.egressLocationEnabled`` (boolean, default: ``false``)
  Controls whether the VPN egress location is displayed in the status panel.

Diagnostics
~~~~~~~~~~~

``browser.ipProtection.log`` (boolean, default: ``false``)
  Enable/disable logging.

``browser.ipProtection.everOpenedPanel`` (boolean, default: ``false``)
  Tracks if the user has ever opened the VPN panel
