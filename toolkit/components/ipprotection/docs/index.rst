IP Protection
=============

This document describes the implementation of the IP Protection feature in Firefox.

The code is split across two directories:

* ``toolkit/components/ipprotection`` — platform-independent core: the state machine,
  the proxy/network stack, and all core helpers.  This layer has no dependency on
  browser UI or chrome.
* ``browser/components/ipprotection`` — browser-specific UI layer: the panel, toolbar
  button, alert and infobar managers, and onboarding helpers.

Each layer is composed of three major areas:

 * A finite-state machine managed by the main component: ``IPProtectionService`` (toolkit).
 * The UI, controlled by ``IPProtection`` and ``IPProtectionPanel`` (browser).
 * The proxy/network controller: ``IPPProxyManager`` and helper classes (toolkit).

The two layers are wired together by ``IPProtectionActivator`` (toolkit), which
assembles the full helper list and initialises the service.

See the following pages for details on components, preferences, and the state machine.

.. toctree::

   Components
   Constants
   Preferences
   StateMachine
