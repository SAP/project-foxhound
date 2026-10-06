Header Guards
=============

This linter checks for missing header guards in C, C++ and objective C headers.
This enforces the principle edict in our coding style.

Principle
---------

If a header file (``.h`` or ``.hpp`` extension) purged from comment does not
begin with ``#pragma once``, ``#ifndef SOME_GUARD`` or ``#if !defined(SOME_GUARD)``,
it is considered an error.

Run Locally
-----------

The mozlint integration of this linter can be run using ``mach``:

.. parsed-literal::

    $ mach lint --linter header-guards <file paths>


Autofix
-------

The ``header-guards`` linter provides a ``--fix`` option.

Builders
--------

`Serge Guelton (sergesanspaille) <https://people.mozilla.org/p/sergesanspaille>`__ owns
the builders. Questions can also be asked on #static-analysis:mozilla.org on Matrix.

cpp(guards)
^^^^^^^^^^^

This is a tier-1 task. For test failures the patch causing the
issue should be backed out or the issue fixed.

Most failures can be fixed with ``./mach lint -lheader-guards --fix path/to/file``.

For test harness issues, file bugs in Developer Infrastructure :: Lint and Formatting.

Sources
-------

* :searchfox:`Linter Configuration (YAML) <tools/lint/header-guards.yml>`
* :searchfox:`Source <tools/lint/header_guards/__init__.py>`
