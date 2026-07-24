Glean Parser
=============

This linter verifies that Glean telemetry definitions files (metrics.yaml
and pings.yaml) are following the Glean schema and best practices
by using the built-in linting functionality from ``glean_parser``.

Common Issues
-------------

Empty Data Review
~~~~~~~~~~~~~~~~~

The most common error is having empty or placeholder values in the ``data_reviews`` field:

.. code-block:: yaml

   metrics:
     example:
       counter_metric:
         data_reviews:
           - ""      # This will cause an error
           - "TODO"  # This will also cause an error

The ``data_reviews`` field must contain a valid URL to a data review.

Run Locally
-----------

This mozlint linter can be run using mach:

.. parsed-literal::

    $ mach lint --linter glean-parser <file paths>

To run on all Glean configuration files:

.. parsed-literal::

    $ mach lint --linter glean-parser .

Configuration
-------------

This linter is enabled by default and will run automatically when you make changes to Glean definitions files.

Sources
-------

* :searchfox:`Configuration (YAML) <tools/lint/glean-parser.yml>`
* :searchfox:`Source <tools/lint/glean-parser/__init__.py>`
