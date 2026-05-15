==========================
no-browser-refs-in-toolkit
==========================

This rule prevents toolkit code from importing browser-specific CSS or SVG files.
It is applied to both ``@import`` statements and CSS property values using the ``url`` function.

This ensures that toolkit code remains independent and can be used in other applications/contexts
where browser code is not necessarily available. Browser code can depend on toolkit code, but toolkit
code should never depend on browser code, since toolkit code can be used in
other applications/contexts where browser code may not be available.

See additional documentation for more information on `internal URLs </toolkit/internal-urls.html>`_.

Rule Scope
----------

This rule only applies to CSS files within the ``toolkit/`` directory. It is
configured as an override in the stylelint configuration to target only
``toolkit/**/*.css`` files.

Examples of incorrect usage for this rule:
------------------------------------------

Incorrect usage of ``@import`` statements:

.. code-block:: css

  @import "chrome://browser/skin/example-file.css";

.. code-block:: css

  @import url("chrome://browser/skin/example-file.css");

.. code-block:: css

  @import "resource:///modules/example-file.css";

.. code-block:: css

  @import url("resource:///modules/example-file.css");

.. code-block:: css

  @import "resource://app/modules/example-file.css";

.. code-block:: css

  @import url("resource://app/modules/example-file.css");

.. code-block:: css

  @import "moz-src:///browser/example-file.css";

.. code-block:: css

  @import url("moz-src:///browser/example-file.css");

Incorrect usage of property values:

.. code-block:: css

  .background-image {
    background-image: url("chrome://browser/skin/example-file.svg");
  }

.. code-block:: css

  .background-image {
    background: url("moz-src:///browser/example-file.svg");
  }

.. code-block:: css

  .background-image {
    background: url("moz-src://foo/browser/example-file.svg");
  }

Examples of correct usage for this rule:
----------------------------------------

Correct usage of ``@import`` statements:

.. code-block:: css

  @import "chrome://global/skin/example-file.css";

.. code-block:: css

  @import url("chrome://global/skin/example-file.css");

.. code-block:: css

  @import "example-file.css";

.. code-block:: css

  @import url("example-file.css");

.. code-block:: css

  @import "resource://content-accessible/example-file.css"

.. code-block:: css

  @import url("resource://content-accessible/example-file.css");

Correct usage of property values:

.. code-block:: css

  .background-image {
    background: url("chrome://global/skin/example-file.svg");
  }

.. code-block:: css

  .background-image {
    background: url("example-file.svg");
  }
