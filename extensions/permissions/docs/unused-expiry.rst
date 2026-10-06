Unused Permission Expiry
========================

Persistent site permissions (camera, microphone, geolocation, etc.) do not
traditionally expire. This can be a privacy and security concern: users may
forget they granted a site access to powerful capabilities, especially after not
visiting the site for a long time.

To address this, the permission manager can automatically expire permissions for
sites the user has not interacted with recently. Rather than a simple lifetime
cap on all permissions, this approach targets only inactive sites, so
frequently-used sites keep their permissions.

.. note::

   This feature is currently enabled on Nightly builds only.

How It Works
------------

1. **Interaction tracking.** Each time the user activates (clicks, types, etc.)
   a page, the content process sends an IPC message
   (``RecordUserInteractionForPermissions``) to the parent process. The
   permission manager records the current timestamp for the page's origin in the
   ``moz_origin_interactions`` database table.

2. **Expiry check.** On the ``idle-daily`` observer notification, the permission
   manager runs ``ExpireUnusedPermissions()``. For each persistent permission
   whose type is in the configurable allowlist, it checks whether the origin's
   last interaction timestamp is older than the expiry threshold. If so, the
   permission is removed. If there is no interaction data for an origin, its
   permissions are **not** expired.

3. **Cleanup.** Orphaned interaction records (origins with no remaining
   permissions) are cleaned up on ``idle-daily`` and when permissions are removed
   through ``ClearDataService``.

.. important::

   Interaction tracking is always active, even when the expiry feature itself is
   disabled. This allows the interaction store to warm up before the feature is
   enabled, so that expiry decisions are based on real usage data from day one.

   However, for profiles where the interaction store has only recently started
   collecting data, the permission manager must first observe user interactions
   with sites before it can expire their permissions. Since permissions without
   interaction data are never expired, users will have to wait at least the full
   expiry threshold (default: 13 months) after interactions are first recorded
   before any permissions are actually removed.

Configuration
-------------

Three preferences control the feature (see their definitions in
:searchfox:`modules/libpref/init/StaticPrefList.yaml`):

``permissions.expireUnused.enabled``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Enables or disables the expiry mechanism. Currently enabled on Nightly only.

``permissions.expireUnusedThresholdSec``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Duration in seconds of site inactivity after which permissions are eligible for
expiry.

``permissions.expireUnusedTypes``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Comma-separated list of permission types that can be expired due to inactivity.
Double-keyed permission types include the ``^`` delimiter (e.g.,
``open-protocol-handler^``). This list is derived from the site permissions
defined in :searchfox:`browser/modules/SitePermissions.sys.mjs`.

Interaction Tracking
--------------------

User interactions are tracked in the ``moz_origin_interactions`` table in the
permissions database (added in schema version 13).

The flow for recording an interaction:

1. ``Document::MaybeStoreUserInteractionAsPermission()`` (in
   :searchfox:`dom/base/Document.cpp`) fires on first user activation in a
   document.
2. In the content process, ``PermissionManager::RecordSiteInteraction()`` (in
   :searchfox:`extensions/permissions/PermissionManager.cpp`) sends
   ``PWindowGlobal::RecordUserInteractionForPermissions()`` via IPC.
3. In the parent process, ``WindowGlobalParent`` receives the message and calls
   ``PermissionManager::UpdateLastInteractionForPrincipal()``, which dispatches
   a write to the permissions database thread.

Interactions in private browsing are not recorded.

Origin Attributes Handling
--------------------------

Interaction timestamps are stored with origin attributes (OA) stripped, so a
single timestamp represents all OA variants of the same origin.

During the expiry check, certain permission types that are forced to strip OA
(e.g., ``cookie``, ``https-only-load-insecure``) are looked up against a
separate OA-stripped index. This ensures the expiry logic correctly matches
interactions to permissions regardless of origin attribute context.

Data Cleanup
------------

Orphaned interaction records (entries in ``moz_origin_interactions`` whose origin
has no corresponding entry in ``moz_perms``) are removed:

- Automatically during ``idle-daily`` maintenance.
- After per-entry permission removal in ``ClearDataService``, via the
  ``removeOrphanedInteractionRecords()`` IDL method.
- Bulk removal methods (e.g., ``removeAll``, ``removePermissionsWithAttributes``)
  handle cleanup internally.

IDL API
-------

Two methods were added to :searchfox:`nsIPermissionManager <netwerk/base/nsIPermissionManager.idl>`:

``updateLastInteractionForPrincipal``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Manually update the last interaction timestamp for a principal. Skips system
principals and private browsing contexts.

``removeOrphanedInteractionRecords``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Returns a ``Promise`` that resolves once orphaned interaction records have been
deleted. Used by ``ClearDataService`` to ensure interaction data is cleaned up
alongside permissions.

Telemetry
---------

Three Glean metrics are recorded each time permissions are expired (see
:searchfox:`extensions/permissions/metrics.yaml` for full definitions):

- **permissions.unused_permission_age_at_expiry** -- distribution of time since
  last site interaction when a permission was expired.
- **permissions.unused_permissions_expired_by_type** -- count of expired
  permissions broken down by permission type.
- **permissions.unused_permission_modified_age_at_expiry** -- distribution of
  time since the permission was last modified when it was expired.
