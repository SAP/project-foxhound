Browser-Scoped Permissions
==========================

Browser-scoped permissions are temporary, per-tab permissions managed directly
by the permission manager. They are never persisted to disk and are automatically
cleared when the tab is closed.

These permissions were previously managed by ``SitePermissions.sys.mjs`` as
"temporary permissions" and have been moved into the C++ permission manager for
better integration with the Permissions API and content processes. Most
consumers (geolocation, notifications, permission UI, etc.) should continue to
go through `SitePermissions.sys.mjs
<https://searchfox.org/mozilla-central/source/browser/modules/SitePermissions.sys.mjs>`__
rather than calling the ``ForBrowser`` methods directly. ``SitePermissions``
provides higher-level helpers for combining browser-scoped and persistent
permissions and is the expected interface for browser UI code.

Overview
--------

Browser-scoped permissions are keyed by a **browser ID** (the unique identifier
of a tab's ``<xul:browser>`` element). They are stored in an in-memory hash
table (``mBrowserPermissionTable``) and are not written to the permissions
database.

Permissions created through this mechanism use the ``EXPIRE_SESSION_TAB``
expiration type and fire the ``"browser-perm-changed"`` observer notification
(as opposed to ``"perm-changed"`` for regular permissions).

Keying: Origin vs. Site
-----------------------

Browser-scoped permissions use different scoping depending on the permission
action:

- **Deny** (``DENY_ACTION``) permissions are **site-scoped** (keyed by base
  domain). When a user blocks a permission, the block applies to the entire site
  (e.g., all subdomains of ``example.com``). This prevents sites from nagging
  users with repeated permission requests from different subdomains.

- **All other actions** (``ALLOW_ACTION``, ``PROMPT_ACTION``, etc.) are
  **origin-scoped**. This means ``https://sub.example.com`` and
  ``https://example.com`` are treated as separate origins, each with their own
  permission.

When a permission changes between deny and a non-deny action for the same type,
the old entry under the other key style is automatically removed.

Lifetime
--------

Browser-scoped permissions have two lifetime mechanisms:

1. **Tab lifetime**: All browser-scoped permissions for a tab are automatically
   removed when the tab's browsing context is discarded (observed via the
   ``"browsing-context-discarded"`` notification). Browsing context replacements
   (e.g., process switches) where the browser ID transfers to a new context are
   not treated as discards.

2. **Timer-based expiry**: Permissions can optionally be given a duration in
   milliseconds. A timer is scheduled in the parent process to automatically
   remove the permission after the specified duration. The ``expireTimeMS``
   parameter to ``addFromPrincipalForBrowser`` specifies the duration relative
   to the current time, not an absolute timestamp.

If no expiry duration is specified, the permission lives until the tab is
closed.

Interfacing with Browser-Scoped Permissions
-------------------------------------------

Browser-scoped permissions can be accessed through the ``nsIPermissionManager``
interface using the ``ForBrowser`` family of methods.

``addFromPrincipalForBrowser``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Adds a browser-scoped permission for a given principal, type, action, and
browser ID. Optionally specify an expiry duration in milliseconds.

.. code:: js

  let principal = gBrowser.selectedBrowser.contentPrincipal;
  let browserId = gBrowser.selectedBrowser.browserId;

  // Allow geolocation for this tab (no expiry)
  Services.perms.addFromPrincipalForBrowser(
    principal,
    "geo",
    Services.perms.ALLOW_ACTION,
    browserId
  );

  // Block camera for this tab, expires in 1 hour
  Services.perms.addFromPrincipalForBrowser(
    principal,
    "camera",
    Services.perms.DENY_ACTION,
    browserId,
    1000 * 60 * 60
  );

``testForBrowser``
~~~~~~~~~~~~~~~~~~

Returns the permission action for a given principal, type, and browser ID.
Returns ``UNKNOWN_ACTION`` if no browser-scoped permission is set. Origin-scoped
permissions are checked before site-scoped ones.

.. code:: js

  let perm = Services.perms.testForBrowser(
    principal,
    "geo",
    browserId
  );
  if (perm == Services.perms.ALLOW_ACTION) {
    // Geolocation is temporarily allowed for this tab
  }

``removeFromPrincipalForBrowser``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Removes a browser-scoped permission. Both origin-scoped and site-scoped keys
are tried.

.. code:: js

  Services.perms.removeFromPrincipalForBrowser(principal, "geo", browserId);

``removeAllForBrowser``
~~~~~~~~~~~~~~~~~~~~~~~

Removes all browser-scoped permissions for a given browser ID.

.. code:: js

  Services.perms.removeAllForBrowser(browserId);

``removeByActionForBrowser``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Removes all browser-scoped permissions with a specific action for a given
browser ID. Useful for clearing only blocks or only allows.

.. code:: js

  // Remove all deny permissions for this tab
  Services.perms.removeByActionForBrowser(browserId, Services.perms.DENY_ACTION);

``getForBrowser``
~~~~~~~~~~~~~~~~~

Returns the browser-scoped permission as an ``nsIPermission`` object, or
``null`` if not set.

.. code:: js

  let perm = Services.perms.getForBrowser(principal, "geo", browserId);
  if (perm) {
    // perm.capability, perm.expireTime, perm.browserId are available
  }

``getAllForBrowser``
~~~~~~~~~~~~~~~~~~~~

Returns all browser-scoped permissions for a given principal and browser ID as
an array of ``nsIPermission`` objects.

.. code:: js

  let perms = Services.perms.getAllForBrowser(principal, browserId);

``copyBrowserPermissions``
~~~~~~~~~~~~~~~~~~~~~~~~~~

Copies all browser-scoped permissions from one browser to another. Used during
tab-swapping operations.

.. code:: js

  Services.perms.copyBrowserPermissions(srcBrowserId, destBrowserId);

Observer Notifications
----------------------

Browser-scoped permission changes fire the ``"browser-perm-changed"``
notification (not ``"perm-changed"``). The subject is an ``nsIPermission``
object with the ``browserId`` attribute set, and the data string is one of
``"added"``, ``"changed"``, or ``"deleted"``.

Interaction with Regular Permissions
------------------------------------

When both a browser-scoped permission and a regular (persistent or
session-scoped) permission exist for the same principal and type, the
browser-scoped permission takes precedence for that tab. Other tabs without a
browser-scoped permission will use the regular permission as usual.

The ``SitePermissions.sys.mjs`` module provides a higher-level interface that
combines browser-scoped and regular permissions for UI display purposes.
