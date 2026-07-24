IP Protection
=============

This document describes the implementation of the IP Protection feature in Firefox.

The code lives in `browser/components/ipprotection` and is composed of three major areas:

 * A finite-state machine managed by the main component: `IPProtectionService`.
 * The UI, controlled by `IPProtection` and `IPProtectionPanel`.
 * The proxy/network controller: `IPPProxyManager` and helper classes.

See the following pages for details on components, preferences, and the state machine.

.. toctree::

   Components
   Preferences
   StateMachine
