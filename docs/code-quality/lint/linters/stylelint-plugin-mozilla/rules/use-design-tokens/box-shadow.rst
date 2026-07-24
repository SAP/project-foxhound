==========
box-shadow
==========

The ``use-design-tokens`` rule checks that CSS ``box-shadow`` declarations use
design token variables instead of hardcoded values. This ensures consistent
box-shadow usage across the application and makes it easier to maintain design
system consistency.

Examples of incorrect code for this rule:
-----------------------------------------

.. code-block:: css

  .button {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

.. code-block:: css

  .element {
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
  }

Examples of correct token usage for this rule:
----------------------------------------------

.. code-block:: css

  .card {
    box-shadow: var(--box-shadow-card);
  }

.. code-block:: css

  .card-hover {
    box-shadow: var(--box-shadow-card-hover);
  }

.. code-block:: css

  .level-1-shadow {
    box-shadow: var(--box-shadow-level-1);
  }

.. code-block:: css

  .level-2-shadow {
    box-shadow: var(--box-shadow-level-2);
  }

.. code-block:: css

  .level-3-shadow {
    box-shadow: var(--box-shadow-level-3);
  }

.. code-block:: css

  .level-4-shadow {
    box-shadow: var(--box-shadow-level-4);
  }

.. code-block:: css

  .popup {
    box-shadow: var(--box-shadow-popup);
  }

.. code-block:: css

  .tab {
    box-shadow: var(--box-shadow-tab);
  }

The rule also allows these non-token values:

.. code-block:: css

  .inherited-shadow {
    box-shadow: inherit;
  }

.. code-block:: css

  .initial-shadow {
    box-shadow: initial;
  }

.. code-block:: css

  .revert-shadow {
    box-shadow: revert;
  }

.. code-block:: css

  .revert-layer-shadow {
    box-shadow: revert-layer;
  }

.. code-block:: css

  .unset-shadow {
    box-shadow: unset;
  }

.. code-block:: css

  .no-shadow {
    box-shadow: none;
  }
