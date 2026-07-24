Gecko Trace
===========

This linter verifies if a gecko-trace file is correctly defined.

Run Locally
-----------

This mozlint linter can be run using mach:

.. parsed-literal::

    $ mach lint --linter gecko-trace <file paths>

It will check two things:
 * All the gecko-trace files must be listed in ``toolkit/components/gecko-trace/index.py``,
 * The ``toolkit/components/gecko-trace/generated-metrics.yaml`` file must be up to date.

Configuration
-------------

This linter is enabled on the whole code base.

Autofix
-------

This linter provides a ``--fix`` option for the ``generated-metrics.yaml`` file.

Sources
-------

* `Configuration (YAML) <https://searchfox.org/mozilla-central/source/tools/lint/gecko-trace.yml>`_
* `Source <https://searchfox.org/mozilla-central/source/tools/lint/gecko-trace/__init__.py>`_
