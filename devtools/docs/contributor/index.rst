.. toctree::
   :name: devtools-contributor-doc

=================================
Firefox DevTools Contributor Docs
=================================

This is the contributor documentation for Firefox Developer Tools. If you're looking for help with using the tools, see the `user docs </devtools-user>`_. Note that this section only contains technical information specific to Firefox DevTools, make sure to first read the `Firefox contributor documentation <https://firefox-source-docs.mozilla.org/contributing/index.html>`_ which explains how to contribute to Firefox in general (setting up the environment, submitting patches, etc.).

Automated tests
===============
.. toctree::
   :maxdepth: 1

   Automated tests <tests/README.md>
   xpcshell <tests/xpcshell.md>
   Chrome mochitests <tests/mochitest-chrome.md>
   DevTools mochitests <tests/mochitest-devtools.md>
   Node tests <tests/node-tests.md>
   Memory Allocation tests </devtools/tests/memory/index.md>
   JavaScript Objects tests<tests/js-object-tests.md>
   Writing tests <tests/writing-tests.md>
   Debugging intermittent failures </testing/debugging-intermittents/index.md>
   Performance tests overview<tests/performance-tests-overview.md>
   DAMP Performance tests <tests/performance-tests-damp.md>
   Writing a new test <tests/writing-perf-tests.md>
   Example <tests/writing-perf-tests-example.md>
   Advanced tips <tests/writing-perf-tests-tips.md>

Files and directories
=====================
.. toctree::
   :maxdepth: 1

   Files and directories <files/README.md>
   Adding New Files <files/adding-files.md>


Tool Architectures
==================
.. toctree::
   :maxdepth: 1

   Inspector Panel Architecture <tools/inspector-panel.md>
   Inspector Highlighters <tools/highlighters.md>
   Memory <tools/memory-panel.md>
   Debugger <tools/debugger-panel.md>
   Responsive Design Mode <tools/responsive-design-mode.md>
   Console <tools/console-panel.md>
   Network </devtools/netmonitor/architecture.md>
   Storage <tools/storage.md>


Frontend
========
.. toctree::
   :maxdepth: 1

   CSS <frontend/css.md>
   Panel SVGs <frontend/svgs.md>
   React <frontend/react.md>
   React Guidelines <frontend/react-guidelines.md>
   Redux <frontend/redux.md>
   Redux Guidelines <frontend/redux-guidelines.md>
   Telemetry <frontend/telemetry.md>
   Content Security Policy <frontend/csp.md>


Backend
=======
.. toctree::
   :maxdepth: 1

   Remote Debugging Protocol <backend/protocol.md>
   Backend Overview <backend/watcher-architecture.md>
   Client API <backend/client-api.md>
   Debugger API <backend/debugger-api.md>
   Backward Compatibility <backend/backward-compatibility.md>
   Actors Organization <backend/actor-hierarchy.md>
   Writing Actors With protocol.js <backend/protocol.js.md>
   Registering A New Actor <backend/actor-registration.md>
   Actor Best Practices <backend/actor-best-practices.md>


Performance
============
.. toctree::
   :maxdepth: 1

   Investigating performance issues <performance/performance.md>
   Writing efficient React code <performance/react-performance-tips.md>


Preferences
===========
.. toctree::
   :maxdepth: 1

   Preferences <preferences.md>


Recurring tasks
===============
.. toctree::
   :maxdepth: 1

   Release tasks<release.md>
   Performance sheriffing<performance-sheriffing.md>
