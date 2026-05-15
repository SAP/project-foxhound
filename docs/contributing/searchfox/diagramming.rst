.. _searchfox_diagramming:

===========
Diagramming
===========

The diagramming feature provides generating diagrams for calls/uses relations, classes and their inheritances.

The diagramming feature can be accessed from two ways.

  * :ref:`Context menu <searchfox_diagramming_context_menu>`
  * :ref:`Query endpoint <searchfox_diagramming_queries>`

**Enabling Diagramming**: To use diagramming features, visit the `settings page
<https://searchfox.org/mozilla-central/pages/settings.html>`_ and change the
"Default feature gate" from "Release" to "Alpha", or use the "Diagramming
feature gate" setting.

**Language Support**: Diagramming currently works for C++ and languages with
SCIP indexing support (Java/Kotlin/Python), but not JavaScript/TypeScript.

**Accessibility Note**: The diagrams currently do not generate a usable
accessibility tree and are considered alpha quality.

.. image:: img/diagramming.png
    :class: border
    :alt: The diagramming feature
    :width: 573px

.. _searchfox_diagramming_context_menu:

Context Menu
------------

.. image:: img/context-menu-layout.png
    :class: border
    :alt: The context menu for classes
    :width: 448px

Uses diagram of ...
  Open a diagram that shows how given field is used.

Calls diagram of ...
  Open a diagram that shows how given function is called.

Class diagram of ...
  Open a diagram that shows given class and its fields, the hierarchy, etc.

Inheritance diagram of ...
  Open a diagram that shows the class hierarchy of given class.

Context Menu for nodes
^^^^^^^^^^^^^^^^^^^^^^

.. image:: img/diagramming-menu-node.png
    :class: border
    :alt: The context menu for nodes
    :width: 446px

Ignore this node in the diagram
  Re-generate the diagram, ignoring the specified node.

Context Menu for edges
^^^^^^^^^^^^^^^^^^^^^^

.. image:: img/diagramming-menu-edge.png
    :class: border
    :alt: The context menu for edges
    :width: 426px

Go to use of ...
  Open the use site of the function shown as the edge.

.. _searchfox_diagramming_queries:

Controls
--------

In the diagramming page, the breadcrumbs contains the "Diagram Controls" button.

The control panel allows customizing the query.

The number of nodes are limited by default. If the limit is hit, warning messages are shown, with buttons to lift the limit if possible.

The Legend section shows the meaning of the badges (e.g. "💪"), which can be added to the nodes for annotation purposes.

.. image:: img/diagramming-control.png
    :class: border
    :alt: The control panel
    :width: 919px

Depth
  Limit graph traversal to N levels of depth (1-based).

  Corresponds to the ``depth:N`` parameter.

Node limit
  Maximum nodes in resulting graph.

  Corresponds to the ``node-limit:N`` parameter.

Path limit
  Nodes with more than N in-edges will be excluded (default: 96)

  For "Calls between", this is maximum nodes for path-finding algorithm

  Corresponds to either the ``path-limit:N`` or the
  ``paths-between-node-limit:N`` parameter.

Ignore nodes
  A comma-separated list of pretty symbols for the nodes to exclude from the diagram.

  This can be added by the "Ignore this node in the diagram" context menu item.

  Corresponds to the ``ignore-nodes:LIST`` parameter.

Hierarchy
  Controls the hierarchy and the styling of the diagram.

  Simple no hierarchy
    Disable hierarchy, use old flat layout (``hier:flat``)

  No hierarchy
    Disable hierarchy but applies other styling, such as badges (``hier:flatbadges``)
  Pretty identifier hierarchy
    Default hierarchy based on pretty symbol name (``hier:pretty``)

  Subsystem and class structures:
    Group by bugzilla component mapping (``hier:subsystem``)

  Full file paths
    Fine-grained file-level hierarchy (``hier:file``)

  Directories
    Group by directories (``hier:dir``)

Layout
  Select the layout algorithm.

  dot
    Default orderly layout (recommended) (``graph-layout:dot``)

  neato
    Force-directed layout for less orderly appearance (``graph-layout:neato``)

  fdp
    Force-directed with variable edge lengths (``graph-layout:fdp``)

Format
  Select the output format of the graph.
  Options other than "SVG and symbols" are mostly for debugging purpose.

  JSON
    Prints the raw input JSON data for the graph (``graph-format:json``)

  SVG
    Shows only the generated SVG (``graph-format:svg``)

  dot with layout
   Prints the raw "dot" input data, with the layout information (``graph-format:dot``)

  dot without layout
   Prints the raw "dot" input data, without the layout information ( ``graph-format:raw-dot``

  SVG and symbols
    Show the generated SVG, annotated with the symbol information ``graph-format:mozsearch``

Debug
  When checked, show the debug log.

Queries
-------

**Important**: These diagramming features use the ``/query`` endpoint, not
``/search``. If you type this syntax in the regular search box, it won't work.

Inheritance diagram
^^^^^^^^^^^^^^^^^^^

::

    inheritance-diagram:'nsIInputStream' depth:4

https://searchfox.org/mozilla-central/query/default?q=inheritance-diagram%3A%27nsIInputStream%27%20depth%3A4

Class diagram
^^^^^^^^^^^^^

::

    class-diagram:'mozilla::GraphDriver' depth:3

https://searchfox.org/mozilla-central/query/default?q=class-diagram%3A%27mozilla%3A%3AGraphDriver%27+depth%3A3

Function call diagram
^^^^^^^^^^^^^^^^^^^^^

This works both directions.

::

    calls-from:'mozilla::dom::AudioContext::CreateDynamicsCompressor' depth:2
    calls-to:'mozilla::dom::AudioContext::CreateDynamicsCompressor' depth:4

https://searchfox.org/mozilla-central/query/default?q=calls-from%3A%27mozilla%3A%3Adom%3A%3AAudioContext%3A%3ACreateDynamicsCompressor%27+depth%3A2
https://searchfox.org/mozilla-central/query/default?q=calls-to%3A%27mozilla%3A%3Adom%3A%3ADynamicsCompressorNode%3A%3AThreshold%27+depth%3A4

**Note**: ``calls-from`` now avoids traversing into methods like
``NS_DebugBreak`` that would otherwise clutter diagrams. Similarly, ``calls-to``
and ``calls-between`` avoid problematic interfaces like ``nsIObserver::Observe``
and ``nsISupports`` methods.

Calls Between
-------------

The ``calls-between`` functionality allows you to discover how different classes
or methods interact with each other. This is particularly useful for
understanding complex code relationships.

This functionality is not yet available in the context menu.

Basic calls-between
^^^^^^^^^^^^^^^^^^^

Find paths between any methods of two classes:

::

    calls-between:'mozilla::ProcessPriorityManager' calls-between:'nsTimer'

https://searchfox.org/mozilla-central/query/default?q=calls-between-source%3A%27mozilla%3A%3AProcessPriorityManager%27%20calls-between-target%3A%27nsTimer%27

Directional calls-between
^^^^^^^^^^^^^^^^^^^^^^^^^

For more precise control, use ``calls-between-source`` and ``calls-between-target``:

::

    calls-between-source:'nsDocShell' calls-between-target:'nsExternalHelperAppService' depth:10

https://searchfox.org/mozilla-central/query/default?q=calls-between-source%3AnsDocShell%20calls-between-target%3AnsExternalHelperAppService%20depth%3A10

Specific method targeting
^^^^^^^^^^^^^^^^^^^^^^^^^

When you know specific methods, you can target them directly:

::

    calls-between-source:'nsGlobalWindowInner::SetTimeout' calls-between-source:'nsGlobalWindowInner::ClearTimeout' calls-between-target:'nsTimer' depth:9

https://searchfox.org/mozilla-central/query/default?q=calls-between-source%3A%27nsGlobalWindowInner%3A%3ASetTimeout%27+calls-between-source%3A%27nsGlobalWindowInner%3A%3AClearTimeout%27+calls-between-target%3A%27nsTimer%27+depth%3A9+paths-between-node-limit%3A12000

**Note**: You must now provide absolute pretty identifiers. If your class is
``foo::Bar``, you can't just use ``Bar`` - you need the full path to avoid
ambiguity.

Include Graph Visualization
^^^^^^^^^^^^^^^^^^^^^^^^^^^

There's a synthetic "(file symbol)" at the end of file path breadcrumbs.
Diagrams triggered on this symbol visualize the header include file graph. This
is most useful with ``calls-between`` queries.

Advanced Options
^^^^^^^^^^^^^^^^

- ``fmus-through-depth:N`` - Include "field member uses" for pointer relationships (use 0 for depth 0 nodes only)
