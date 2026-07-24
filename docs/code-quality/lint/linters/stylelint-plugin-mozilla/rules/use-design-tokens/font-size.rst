==========
font-size
==========

The ``use-design-tokens`` rule checks that CSS ``font-size`` declarations use
design token variables instead of hardcoded values. This ensures consistent
font-size usage across the application and makes it easier to maintain design
system consistency.

Examples of incorrect code for this rule:
-----------------------------------------

.. code-block:: css

  .custom-text {
    font-size: 12px;
  }

.. code-block:: css

  .heading {
    font-size: 1rem;
  }

.. code-block:: css

  .small-text {
    font-size: 0.867rem;
  }

.. code-block:: css

  .large-text {
    font-size: 1.2em;
  }

.. code-block:: css

  .percentage-text {
    font-size: 100%;
  }

.. code-block:: css

  .point-text {
    font-size: 16pt;
  }

Examples of correct token usage for this rule:
----------------------------------------------

.. code-block:: css

  .custom-text {
    font-size: var(--font-size-root);
  }

.. code-block:: css

  .small-text {
    font-size: var(--font-size-small);
  }

.. code-block:: css

  .large-text {
    font-size: var(--font-size-large);
  }

.. code-block:: css

  .xlarge-text {
    font-size: var(--font-size-xlarge);
  }

.. code-block:: css

  .xxlarge-text {
    font-size: var(--font-size-xxlarge);
  }

.. code-block:: css

  .xxxlarge-text {
    font-size: var(--font-size-xxxlarge);
  }

.. code-block:: css

  .heading-medium {
    font-size: var(--heading-font-size-medium);
  }

.. code-block:: css

  .heading-large {
    font-size: var(--heading-font-size-large);
  }

.. code-block:: css

  .heading-xlarge {
    font-size: var(--heading-font-size-xlarge);
  }

.. code-block:: css

  /* Local CSS variables that reference valid font-size tokens are allowed */
  :root {
    --custom-font-size: var(--font-size-small);
  }

  .custom-text {
    font-size: var(--custom-font-size);
  }

.. code-block:: css

  .custom-text {
    font-size: var(--custom-font-size, var(--font-size-small));
  }

The rule also allows these non-token values:

.. code-block:: css

  .xxsmall-text {
    font-size: xx-small;
  }

.. code-block:: css

  .xsmall-text {
    font-size: x-small;
  }

.. code-block:: css

  .small-text {
    font-size: small;
  }

.. code-block:: css

  .medium-text {
    font-size: medium;
  }

.. code-block:: css

  .large-text {
    font-size: large;
  }

.. code-block:: css

  .xlarge-text {
    font-size: x-large;
  }

.. code-block:: css

  .xxlarge-text {
    font-size: xx-large;
  }

.. code-block:: css

  .xxxlarge-text {
    font-size: xxx-large;
  }

.. code-block:: css

  .smaller-text {
    font-size: smaller;
  }

.. code-block:: css

  .larger-text {
    font-size: larger;
  }

.. code-block:: css

  .inherited-text {
    font-size: inherit;
  }

.. code-block:: css

  .initial-text {
    font-size: initial;
  }

.. code-block:: css

  .unset-text {
    font-size: unset;
  }
