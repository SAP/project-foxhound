Environment
===========

These environments are available by specifying a comment at the top of the file,
e.g.

.. code-block:: js

   /* eslint-env mozilla/chrome-worker */

There are also built-in ESLint environments available as well. Find them here: http://eslint.org/docs/user-guide/configuring#specifying-environments

browser-window
--------------

Defines the environment for scripts that are in the main browser.xhtml scope.

chrome-script
-------------

Defines the environment for scripts loaded by
``SpecialPowers.loadChromeScript``.

chrome-worker
-------------

Defines the environment for chrome workers. This differs from normal workers by
the fact that `ctypes` can be accessed as well.

frame-script
------------

Defines the environment for scripts loaded by ``Services.mm.loadFrameScript``.

sysmjs
---

Defines the environment for system module files (.sys.mjs).

privileged
----------

Defines the environment for privileged JS files.

process-script
--------------

Defines the environment for scripts loaded by
``Services.ppmm.loadProcessScript``.

remote-page
-----------

Defines the environment for scripts loaded with ``<script src="...">`` in
``about:`` pages.

simpletest
----------

Defines the environment for scripts that use the SimpleTest mochitest harness.

sjs
---

Defines the environment for sjs files.

special-powers-sandbox
----------------------

Defines the environment for scripts evaluated inside ``SpecialPowers`` sandbox
with the default options.

testharness
-----------

Defines the environment the globals that are injected from
:searchfox:`dom/imptests/testharness.js <dom/imptests/testharness.js>`.

It is injected automatically into (x)html files which include:

.. code-block:: html

    <script src="/resources/testharness.js"></script>

It may need to be included manually in JavaScript files which are loaded into
the same scope.

xpcshell
--------

Defines the environment for xpcshell test files.
