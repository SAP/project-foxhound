============
border-color
============

The ``use-design-tokens`` rule checks that CSS border-color related declarations
(border-color, border, outline, outline-color, and their variants) use design
token variables instead of hardcoded values. This ensures consistent border-color
usage across the application and makes it easier to maintain design system
consistency.

Examples of incorrect code for this rule:
-----------------------------------------

.. code-block:: css

  .card {
    border-color: #191919;
  }

.. code-block:: css

  .custom-button {
    border: 3px dashed rgba(42 42 42 / 0.15);
  }

.. code-block:: css

  .error {
    outline-color: rgba(255 0 0 / 0.25);
  }

.. code-block:: css

  .element {
    border-top-color: oklch(69% 0.19 15);
  }

.. code-block:: css

  :root {
    --my-token: blue;
  }

  .my-button {
    border: 1px solid var(--my-token, oklch(55% 0.21 15));
  }

Examples of correct token usage for this rule:
----------------------------------------------

.. code-block:: css

  .card {
    border-color: var(--border-color);
  }

.. code-block:: css

  .custom-button {
    border: 3px dashed var(--border-color);
  }

.. code-block:: css

  .error {
    outline-color: var(--outline-color-error);
  }

.. code-block:: css

  /* You may set a fallback for a token. */

  .my-button {
    border: 1px solid var(--border-color, oklch(55% 0.21 15));
  }

.. code-block:: css

  /* Local CSS variables that reference valid border-color tokens are allowed */

  :root {
    --my-token: var(--border-color);
  }

  .my-button {
    border: 1px solid var(--my-token);
  }

The rule also allows these non-token values:

.. code-block:: css

  .transparent-border-color {
    border-color: transparent;
  }

.. code-block:: css

  .current-border-color {
    border-color: currentColor;
  }

.. code-block:: css

  .white-border-color {
    border-color: white;
  }

.. code-block:: css

  .black-border-color {
    border-color: black;
  }

.. code-block:: css

  .inherited-border-color {
    border-color: inherit;
  }

.. code-block:: css

  .initial-border-color {
    border-color: initial;
  }

.. code-block:: css

  .revert-border-color {
    border-color: revert;
  }

.. code-block:: css

  .revert-layer-border-color {
    border-color: revert-layer;
  }

.. code-block:: css

  .unset-border-color {
    border-color: unset;
  }

.. code-block:: css

  .border-none {
    border: none;
  }

.. code-block:: css

  .border-zero {
    border: 0;
  }

This rule also allows base color tokens, as long as they are defined in a local custom property.

.. code-block:: css

  :root {
    --my-token: var(--color-gray-20);
  }

  .my-button {
    border-color: var(--my-token);
  }

Functions that use or modify base color tokens are also allowed

.. code-block:: css

  :root {
    --my-token: light-dark(var(--color-gray-20), var(--color-gray-80));
  }

  .my-button {
    border-color: var(--my-token);
  }

.. code-block:: css

  :root {
    --my-token: color-mix(in oklch, var(--color-blue-50) 20%, transparent);
  }

  .my-button {
    border-color: var(--my-token);
  }

.. code-block:: css

  /* use relative color syntax if modifying a base color token with an oklch function */

  :root {
    --my-token: oklch(from var(--color-blue-50) l c h / 20%);
  }

  .my-button {
    border-color: var(--my-token);
  }

Autofix functionality
---------------------

This rule can automatically fix some violations by replacing hex color values with
appropriate color names. Examples of autofixable violations:

.. code-block:: css

  /* Before */
  .a {
    border-color: #fff;
  }

  /* After autofix */
  .a {
    border-color: white;
  }

.. code-block:: css

  /* Before */
  .a {
    border-color: #ffffff;
  }

  /* After autofix */
  .a {
    border-color: white;
  }

.. code-block:: css

  /* Before */
  .a {
    border-color: #FFF;
  }

  /* After autofix */
  .a {
    border-color: white;
  }

.. code-block:: css

  /* Before */
  .a {
    border-color: #FFFFFF;
  }

  /* After autofix */
  .a {
    border-color: white;
  }

.. code-block:: css

  /* Before */
  .a {
    border-color: #000;
  }

  /* After autofix */
  .a {
    border-color: black;
  }

.. code-block:: css

  /* Before */
  .a {
    border-color: #000000;
  }

  /* After autofix */
  .a {
    border-color: black;
  }

System Colors
-------------

Using system colors, especially for forced colors or high contrast, is allowed.
However, it may be better to use a design system token that already accounts for
those situations and avoid needing the extra media query.

.. code-block:: css

  /* Good */
  @media (prefers-contrast) {
    .a {
      border-color: ButtonBorder;
    }
  }

  /* Better */
  .a {
    border-color: var(--button-border-color);
  }
