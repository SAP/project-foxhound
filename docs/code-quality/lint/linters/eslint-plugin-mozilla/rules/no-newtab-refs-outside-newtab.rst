no-newtab-refs-outside-newtab
=============================

Prevents the use of ``chrome://newtab`` or ``resource://newtab`` URIs from code
outside of the newtab codebase. This is because as of Firefox 142, newtab can
be updated out-of-band from the rest of the browser. This linting rule aims to
prevent accidental dependencies from being created against a moving newtab
target. If external code _must_ depend or call into newtab code, please consult
with the newtab team before adding an exception.

**Allowed locations:**

* ``browser/extensions/newtab/``
* ``browser/components/newtab/``
* ``browser/modules/AboutNewTab.sys.mjs``
* ``browser/actors/AboutNewTabChild.sys.mjs``

Examples of incorrect code for this rule:
-----------------------------------------

.. code-block:: js

    // In toolkit/components/places/PlacesUtils.sys.mjs:
    ChromeUtils.importESModule("resource://newtab/lib/TopSitesFeed.sys.mjs")

    // In browser/components/urlbar/UrlbarProviderTopSites.sys.mjs:
    const { ActivityStream } = ChromeUtils.importESModule("resource://newtab/lib/ActivityStream.sys.mjs")

    // In browser/base/content/browser.js:
    ChromeUtils.defineESModuleGetters(lazy, {
      "NewTabMessaging": "resource://newtab/lib/NewTabMessaging.sys.mjs"
    })

    // In browser/components/sessionstore/SessionStore.sys.mjs:
    Services.wm.getMostRecentWindow("chrome://newtab/content/newtab.xhtml")

    // In toolkit/modules/ResetProfile.sys.mjs:
    fetch("resource://newtab/data/content/activity-stream.bundle.js")
