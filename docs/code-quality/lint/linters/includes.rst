Includes
========

This linter checks for unused mfbt headers across the code base.
It is preprocessor-agnostic and mostly language-agnostic.
It should have no false positive, and allows for false negative.

Principle
---------

This linter has two parts:

First part works by looking for mfbt headers included in any C, Objective-C or
C++ file. For each of this header, it consults an abstract API description file
and checks if any symbol (be it macro, function, global variable, type
definition, operator) described in the API is actually used in the source. If
not it reports the error.

Second part works in a similar manner but for standard C++ headers.

In both cases, the lookup for symbol is textual, which makes it very fast (no
build required), preprocessor-agnostic (all configuration are honored, no header
generation required), at the expense of including comments etc.

API Description
---------------

The MFBT description file is manually maintained in :searchfox:`MFBT API Description (YAML)
<mfbt/api.yml>`. The C++ standard headers are described in
:searchfox:`C++ STL Description (Py) <tools/lint/includes/std.py>`.

It is basically a mapping from header name to a set of symbols, classified by
type (macro, function etc).

The symbols are named independently of their namespace or argument type.
Any symbol that is not be used by third-party (e.g. from the ``detail``
namespace, or some auxiliary macro) should not be listed.

Some checks are done to avoid it from getting out-of-sync, they are performed
through::

.. parsed-literal::

   $ mach test tools/lint/test/test_includes.py

Some of the changes that would make ``api.yml`` get out-of-sync (e.g., renaming
a header or removing a symbol) are detected by this test and will break CI.

Run Locally
-----------

The mozlint integration of this linter can be run using ``mach``:

.. parsed-literal::

    $ mach lint --linter includes <file paths>


Autofix
-------

The ``includes`` linter provides a ``--fix`` option.


Sources
-------

* :searchfox:`Linter Configuration (YAML) <tools/lint/includes.yml>`
* :searchfox:`MFBT API Description (YAML) <mfbt/api.yml>`
* :searchfox:`C++ STL Description (Py) <tools/lint/includes/std.py>`
* :searchfox:`Source <tools/lint/includes/__init__.py>`
