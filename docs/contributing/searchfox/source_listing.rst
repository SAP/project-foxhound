==============
Source listing
==============

.. image:: img/source-listing.png
    :class: border
    :alt: The source listing and each component
    :width: 958px

Search field
------------

The header shows the :ref:`search <searchfox_search>` field.

Revision
--------

In the file listing, the header shows the currently-showing revision's hash and
the commit message.

Breadcrumbs
-----------

Below the header, breadcrumbs for the file is shown.

You can select different tree from the repository drop down menu there, and also navigate to other directory, or open a context menu for the file symbol.

Line numbers
------------

Lines can be selected by clicking, optionally with modifier keys.  The selected lines are reflected to the URL, and opening URLs with those lines shows the selected lines.

This is handy for sharing a code with pointing specific lines.

  * Click the line number selects the line.
  * :kbd:`Shift` + click: selects lines by start/end range.
  * :kbd:`Ctrl` + click / :kbd:`Cmd` + click: adds/removes individual line from/to the selection.

Blame strip
-----------

See the :ref:`Blame strip <searchfox-blame-strip>` documentation.

Code coverage
-------------

The light-blue line next to the blame strip shows the `code coverage <https://firefox-source-docs.mozilla.org/tools/code-coverage/index.html>`__ information.

Hovering a pointer over the coverage strip shows a coverage popup, which shows how many times the line is hit in the automation.

.. image:: img/coverage.png
    :class: border
    :alt: The code coverage information
    :width: 589px

Nesting header
--------------

.. image:: img/nesting.png
    :class: border
    :alt: The nesting header
    :width: 535px

For nesting structures inside a source code, such as namespaces, classes, functions, etc, Searchfox shows a sticky header for the nesting.

For variable declarations spans across multiple lines in C++ code, the nesting header is shown if it has 10+ lines.

Symbols
-------

Clicking each symbol (functions, variables) opens :ref:`Context menu <searchfox_context_menu>`.
