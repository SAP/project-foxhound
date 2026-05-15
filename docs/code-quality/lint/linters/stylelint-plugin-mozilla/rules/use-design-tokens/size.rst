====
size
====

The ``use-design-tokens`` rule checks that CSS size-related property declarations
use design token variables instead of hardcoded values. This ensures consistent
sizing across the application and makes it easier to maintain design system
consistency.

This rule applies to the following properties:

- ``width``, ``min-width``, ``max-width``
- ``height``, ``min-height``, ``max-height``
- ``inline-size``, ``min-inline-size``, ``max-inline-size``
- ``block-size``, ``min-block-size``, ``max-block-size``
- ``background-size``
- ``inset`` and all of its longhand properties
- Positioning attributes: ``left``, ``right``, ``top``, and ``bottom``

Note that the following properties accept both space and size tokens:

- ``inset`` and all of its longhand properties
- Positioning attributes: ``left``, ``right``, ``top``, and ``bottom``

Use size tokens when these properties represent element dimensions, and space tokens when they
represent spacing/positioning offsets.

Examples of incorrect code for this rule:
------------------------------------------

.. code-block:: css

  .card {
    min-width: 48px;
  }

.. code-block:: css

  .button {
    height: 0.75rem;
  }

.. code-block:: css

  .icon {
    width: 20px;
  }

.. code-block:: css

  .icon {
    width: calc(2 * 16px);
  }

.. code-block:: css

  :root {
    --local-size: 24px;
  }

  .button {
    min-height: var(--local-size);
  }

Examples of correct token usage for this rule:
-----------------------------------------------

.. code-block:: css

  .card {
    min-width: var(--size-item-large);
  }

.. code-block:: css

  .button {
    height: var(--size-item-xsmall);
  }

.. code-block:: css

  .icon {
    width: var(--icon-size-medium);
  }

.. code-block:: css

  .icon {
    width: var(--icon-size-medium, 28px);
  }

.. code-block:: css

  .icon {
    width: calc(2 * var(--icon-size-medium));
  }

.. code-block:: css

  .icon {
    width: calc(2 * var(--icon-size-medium, 28px));
  }

.. code-block:: css

  :root {
    --local-size: var(--size-item-small);
  }

  .button {
    min-height: var(--local-size);
  }

.. code-block:: css

  .positioned-element {
    inset: var(--size-item-large);
  }

.. code-block:: css

  .positioned-element {
    top: var(--size-item-medium);
    left: var(--size-item-small);
  }

The rule also allows these non-token values:
--------------------------------------------

.. code-block:: css

  .button {
    width: 100%;
  }

.. code-block:: css

  .button {
    width: auto;
  }

.. code-block:: css

  .icon {
    max-height: 2em;
  }

.. code-block:: css

  .container {
    height: 100vh;
  }

.. code-block:: css

  .sidebar {
    width: 50vw;
  }

.. code-block:: css

  .element {
    width: fit-content;
  }

.. code-block:: css

  .element {
    width: min-content;
  }

.. code-block:: css

  .element {
    width: max-content;
  }

.. code-block:: css

  .element {
    width: 0;
  }

.. code-block:: css

  .element {
    width: none;
  }

Autofix functionality
---------------------

This rule can automatically fix some violations by replacing raw size values with
appropriate size tokens. Examples of autofixable violations:

.. code-block:: css

  /* Before */
  .a {
    height: 0.75rem;
  }

  /* After autofix */
  .a {
    height: var(--size-item-xsmall);
  }

.. code-block:: css

  /* Before */
  .a {
    width: 1rem;
  }

  /* After autofix */
  .a {
    width: var(--size-item-small);
  }

.. code-block:: css

  /* Before */
  .a {
    max-inline-size: calc(16px + 32px);
  }

  /* After autofix */
  .a {
    max-inline-size: calc(var(--size-item-small) + var(--size-item-large));
  }
