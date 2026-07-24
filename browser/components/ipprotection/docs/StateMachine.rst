State Machine
=============

Service state machine
---------------------

The finite state machine is implemented in the ``IPProtectionService`` class
and the states are defined in the ``IPProtectionStates`` object.

Service states
~~~~~~~~~~~~~~

The service transitions across the following states:

- ``UNINITIALIZED``: Service not initialized or feature disabled.
- ``UNAVAILABLE``: User not eligible (Nimbus) or signed out with no eligibility; UI hidden.
- ``UNAUTHENTICATED``: User signed out but eligible; UI shows login.
- ``READY``: Ready to activate the proxy.

High‑level transitions
~~~~~~~~~~~~~~~~~~~~~~

- Feature disabled → ``UNINITIALIZED``.
- During startup, if initialization isn’t complete, use cached state from ``IPPStartupCache``.
- Not signed in → ``UNAVAILABLE`` if not eligible, otherwise ``UNAUTHENTICATED``.
- If an entitlement is cached/valid → ``READY``.
- Otherwise, check enrollment with Guardian (via ``IPPEnrollAndEntitleManager``):
  - Not enrolled → ``UNAVAILABLE`` (not eligible).
  - Enrolled → fetch entitlement; if successful → ``READY``, else ``UNAVAILABLE`` when not eligible.

Events and integration points
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- ``IPProtectionService:StateChanged`` is dispatched on state changes with
  ``detail.state`` and ``detail.prevState``.
- Helpers can call ``IPProtectionService.updateState()`` to recompute the state immediately; update any helper-owned data first because the call is synchronous.
- Public actions: ``start(userAction)``, ``stop(userAction)``.

Proxy manager state machine
---------------------------

The ``IPPProxyManager`` layers a proxy‑specific finite state machine on top of
``IPProtectionService``. It mirrors eligibility changes from the service and
drives the lifecycle of the proxy connection.

Proxy states
~~~~~~~~~~~~

- ``NOT_READY``: Service is not ``READY``. Channel filters are torn down and UI should not offer activation.
- ``READY``: Service is ``READY`` and the proxy can be activated.
- ``ACTIVATING``: ``start()`` is creating a channel filter, fetching a proxy pass, and selecting an endpoint.
- ``ACTIVE``: Proxy connected. Usage and network observers are reporting metrics.
- ``ERROR``: An unrecoverable error occurred while the proxy is connected such as failing when rotating credentials. Stop must be called to change states.
- ``PAUSED``: Everything is working but the bandwidth limit has been reached so we can't connect to the VPN. The bandwidth will reset next month.

Proxy transitions
~~~~~~~~~~~~~~~~~

- ``IPProtectionService:StateChanged`` → ``IPPProxyManager.updateState()``:
  - Service ``READY`` → proxy ``READY`` (resets connection/error history).
  - Any other service state → proxy ``NOT_READY`` (stops active connections).
- ``start(userAction)`` from ``READY`` moves to ``ACTIVATING``.
  - Successful activation → ``ACTIVE`` and telemetry ``ipprotection.toggled``.
  - Failures during activation (missing entitlement, server list, proxy pass…) call ``updateState()`` to demote the proxy back to its previous state.
  - Errors after the proxy is connected  → ``ERROR`` via ``#setErrorState``.
- ``stop(userAction)`` from ``ACTIVE`` → ``READY`` after closing the channel filter and observers.
- ``reset()`` or helper‑driven recomputations call ``updateState()`` which demotes the proxy back to ``READY``/``NOT_READY`` and clears the credential cache.
- Network errors (``proxy-http-error`` with 401) trigger Proxy Pass rotation while staying ``ACTIVE``; repeated failures bubble up through ``#setErrorState``.

Proxy events and hooks
~~~~~~~~~~~~~~~~~~~~~~

- ``IPPProxyManager:StateChanged`` is dispatched with ``detail.state`` whenever the proxy state machine moves.
- ``IPPProxyManager`` listens to ``IPProtectionService:StateChanged`` and to ``proxy-http-error`` from ``IPPNetworkErrorObserver``.
- Consumers can observe ``IPPProxyManager.state`` (or listen for events) to synchronize UI/telemetry with the proxy lifecycle.
