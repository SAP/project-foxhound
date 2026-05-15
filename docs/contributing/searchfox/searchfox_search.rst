.. _searchfox_search:

Searchfox Query Language Documentation
======================================

Searchfox provides a powerful query language for searching code
repositories. The system is designed with simplicity in mind - you can
start with basic searches and refine them interactively, while also
supporting advanced query syntax for power users.

.. contents:: Table of Contents

Basic Search
------------

The simplest way to search is to just type what you're looking for. No
special syntax is required:

https://searchfox.org/mozilla-central/search?q=AudioContext

This will search for:

- Text occurrences in files
- Symbol/identifier matches (prefix-based)
- File names containing the term

The path filter input on the right hand side supports glob patterns that
supports the following features:

- ``*`` : matches any characters except path separators (``/``)
- ``**`` : matches any characters including path separators
- ``?`` : matches any single character
- ``{a,b,c}``: matches any of the comma-separated alternatives
- ``^`` and ``$``: regex anchors (preserved as-is)
- Literal parentheses, pipes, and dots are escaped

The same syntax is used whenever globbing is expected in searchfox.

Query Parameters
----------------

Searches can be customized using URL parameters:

Case Sensitivity
~~~~~~~~~~~~~~~~

-  **Parameter**: ``case``
-  **Values**: ``true`` for case-sensitive, anything else for
   case-insensitive (default)

https://searchfox.org/mozilla-central/search?q=AudioContext&case=true

Regular Expressions
~~~~~~~~~~~~~~~~~~~

-  **Parameter**: ``regexp``
-  **Values**: ``true`` to treat query as regex, anything else for
   literal search
-  **Note**: Regex mode only performs textual content search, not semantic search
   unless ``symbol:`` or ``id:`` prefixes are used

https://searchfox.org/mozilla-central/search?q=AudioContext%3A%3A.*Panner*&regexp=true

Path Filtering
~~~~~~~~~~~~~~

-  **Parameter**: ``path``
-  **Description**: Filter results by file paths using glob patterns
-  **Example**: ``?q=MyFunction&path=src/main/*``

For example, finding media playback tests (not Web Audio tests that are in
``dom/media/webaudio/tests``) that use an ``AudioContext``:

https://searchfox.org/mozilla-central/search?q=path%3Adom%2Fmedia%2Ftest+AudioContext&path=&case=false&regexp=false

Advanced Query Syntax
---------------------

The query language supports ``term:value`` syntax for more precise searches.

**Important**: ``term:value`` syntax must be placed before any search terms.
The search endpoint stops parsing once it encounters an unrecognized term.

``path:``
~~~~~~~~~

Filters results by file paths using glob patterns (same as path
parameter):

::

   path:src/components/* MyFunction

``pathre:``
~~~~~~~~~~~

Filters results using regular expressions for paths:

::

    pathre:^src/(main|test)/.*\.js$ MyFunction

Example, finding all tests for the ``PannerNode``, in WPT and Mochitests:

https://searchfox.org/mozilla-central/search?q=pathre%3Atesting%5C%2Fwpt%7Cdom%5C%2Fmedia%5C%2Fwebaudio%5C%2Ftest+PannerNode

Context
~~~~~~~

Allows displaying the result and surrounding context. A current limitation is
that this only works with fulltext search via ``text:`` or ``re:`` and if you
forget to use one, you may get semantic results without any context.

::

    context:3 re:AudioContext::.*Create

Search for all factory methods of an AudioContext, with 3 lines of context,
above and below the search hit:

https://searchfox.org/mozilla-central/search?q=context%3A3+re%3AAudioContext%3A%3A.*Create

Search Type Terms
~~~~~~~~~~~~~~~~~

``symbol:``
^^^^^^^^^^^

Search only for symbols/identifiers

::

   symbol:cubeb_stream_init

-  Multiple symbols can be comma-separated: ``symbol:Foo,Bar``
-  Dot notation is normalized to hash: ``symbol:obj.method`` becomes
   ``symbol:obj#method``
- Note: in C++, this requires the mangled symbol name, and so it is best access by clicking on a member

``id:``
^^^^^^^

Exact-match identifier search (not prefix-based like the default search):

::

   id:main

This means ``id:creategain`` won't match ``createGainNode()`` calls, that are
also present indexed code.

``text:``
^^^^^^^^^

Exact text match, this escapes regexp characters

::

   text:function main()

``re:``
^^^^^^^

Treat remainder of query as regular expression

::

   re:get\w+Value

``nresult:``
^^^^^^^^^^^^

Show the `nsresult` definition for given hex or decimal notation.

::

   nsresult:0x80004005
   nsresult:80004005
   nsresult:2147500037

Sharing and Collaboration
-------------------------

All non-default searches are encoded in URLs, making them easy to
bookmark for later use, sharing with team members, include in
documentation or bug reports, and building into automated tools.

When including a searchfox link in source code, consider using a
permalink to a revision when it makes sense.

**Update Schedule**: It takes up to 12 hours for trees other than
the Firefox tree to receive the latest enhancements and fixes.
