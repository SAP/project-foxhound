reject-import-preferences-module
================================

Rejects usage of ``Preferences.sys.mjs``, which is deprecated. Use
``Services.prefs`` directly instead.

Examples of incorrect code for this rule:
-----------------------------------------

.. code-block:: js

    import { Preferences } from "resource://gre/modules/Preferences.sys.mjs";

    ChromeUtils.defineESModuleGetters(lazy, {
      Preferences: "resource://gre/modules/Preferences.sys.mjs",
    });

Examples of correct code for this rule:
----------------------------------------

.. code-block:: js

    Services.prefs.getStringPref("my.pref", "default");
