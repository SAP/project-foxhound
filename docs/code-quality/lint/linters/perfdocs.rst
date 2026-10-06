PerfDocs
========

`PerfDocs`_ is a tool that checks to make sure all performance tests are documented in tree.

At the moment, it is only used for this documentation verification, but in the future it will also auto-generate documentation from these descriptions that will be displayed in the source-docs documentation page (rather than the wiki, which is where they currently reside).

Run Locally
-----------

PerfDocs can be run using mach:

.. parsed-literal::

    $ ./mach perfdocs

Documentation can be regenerated for performance tests by using the ``--generate`` flag:

.. parsed-literal::

    $ ./mach perfdocs --generate


Configuration
-------------

There are no configuration options available. It scans the full source tree, looking for folders named ``perfdocs``, validates their content, and regenerates the documentation (if ``--generate`` is provided). This has been implemented for all performance testing harnesses, and the documentation generated gets displayed in :ref:`Performance Testing`.

In the ``perfdocs`` folders, there needs to be an ``index.rst`` file and it needs to contain the string ``{documentation}`` in some location in the file which is where the test documentation will be placed. The folders must also have a ``config.yml`` file following this schema:

.. code-block:: python

    CONFIG_SCHEMA = {
        "definitions": {
            "metrics_schema": {
                "metric_name": {
                    "type": "object",
                    "properties": {
                        "aliases": {"type": "array", "items": {"type": "string"}},
                        "description": {"type": "string"},
                        "matcher": {"type": "string"},
                    },
                    "required": ["description", "aliases"],
                },
            },
        },
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "manifest": {"type": "string"},
            "static-only": {"type": "boolean"},
            "metrics": {"$ref": "#/definitions/metrics_schema"},
            "suites": {
                "type": "object",
                "properties": {
                    "suite_name": {
                        "type": "object",
                        "properties": {
                            "tests": {
                                "type": "object",
                                "properties": {
                                    "test_name": {"type": "string"},
                                },
                            },
                            "description": {"type": "string"},
                            "owner": {"type": "string"},
                        },
                        "required": ["description"],
                    }
                },
            },
        },
        "required": ["name", "manifest", "static-only", "suites"],
    }

Here is an example of a configuration file for the Raptor framework:

.. parsed-literal::

    name: raptor
    manifest: testing/raptor/raptor/raptor.toml
    suites:
        desktop:
            description: "Desktop tests."
            tests:
                raptor-tp6: "Raptor TP6 tests."
        mobile:
            description: "Mobile tests"
        benchmarks:
            description: "Benchmark tests."
            tests:
                wasm: "All wasm tests."

Metrics that produce alerts can also be documented like so:

.. parsed-literal::

    name: raptor
    manifest: testing/raptor/raptor/raptor.toml
    metrics:
        "First Paint":
            description: "The description of the metric."
            aliases:
                - fcp
                - anAliasForFCP
            # Optional regex to match the metrics found in the tests with this
            # documented metric
            matcher: f.*
    suites:
        desktop:
            description: "Desktop tests."
            tests:
                raptor-tp6: "Raptor TP6 tests."
        mobile:
            description: "Mobile tests"
        benchmarks:
            description: "Benchmark tests."
            tests:
                wasm: "All wasm tests."

The documented metrics must exist in the tests for the suite. If they are not, then validation will fail. The same is true if a metric in a test is not documented. Also, if ``metrics`` are defined, then a ``metrics.rst`` file is expected to be found in the ``perfdocs`` folder for the given suite. It must contain the string ``{metrics_documentation}`` where the documentation should be added. The ``metrics.rst`` is renamed ``{suite-name}-metrics.rst`` in the generated folder, so if it needs to be linked to in the ``index.rst`` file, it should contain a ``{metrics_rst_name}`` string for where the link should be added - it's expected to be found in a toctree section.

Note that there needs to be a FrameworkGatherer implemented for the framework being documented since each of them may have different ways of parsing test manifests for the tests. See :searchfox:`RaptorGatherer <tools/lint/perfdocs/framework_gatherers.py>` for an example gatherer that was implemented for Raptor.

Sources
-------

* :searchfox:`Configuration <tools/lint/perfdocs.yml>`
* :searchfox:`Source <tools/lint/perfdocs>`
