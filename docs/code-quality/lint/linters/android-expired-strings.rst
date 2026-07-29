Android Expired Strings
=======================

This linter checks that Android string resources marked for removal
(``moz:removedIn``) are not referenced anywhere in the codebase.

When a developer marks a string with ``moz:removedIn``, it means the string is
no longer used and its definition is only kept so it can safely ride the release
trains. Any remaining references (``R.string.<name>`` or ``@string/<name>``)
indicate an incomplete removal.

Run Locally
-----------

This mozlint linter can be run using mach:

.. parsed-literal::

    $ mach lint --linter android-expired-strings <file paths>

Configuration
-------------

This linter is enabled by default, and will run if you make changes to
``.kt``, ``.java``, or ``.xml`` files under ``mobile/android``.

Sources
-------

* :searchfox:`Configuration (YAML) <tools/lint/android-expired-strings.yml>`
* :searchfox:`Source <tools/lint/android-expired-strings/__init__.py>`
