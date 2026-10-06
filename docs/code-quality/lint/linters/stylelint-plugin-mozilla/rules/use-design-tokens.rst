=================
use-design-tokens
=================

This rule checks that CSS declarations use design token variables instead of
hardcoded values. This ensures consistent design system usage across the
application and makes it easier to maintain design system consistency.

The rule supports multiple CSS properties, each of which can be enabled or
disabled independently. See the documentation below for details about each
supported property.

Configuration
-------------

The rule accepts the following configuration options:

- ``true`` - Enables checking for all supported CSS properties
- ``null`` - Disables the rule entirely
- An object with CSS property names as keys, which disables specific properties:

  - All properties are enabled by default when using object configuration
  - Set a property to ``null`` to disable checking for that property

Examples:

.. code-block:: javascript

  // Enable all property checks
  "stylelint-plugin-mozilla/use-design-tokens": true

  // Disable the rule entirely
  "stylelint-plugin-mozilla/use-design-tokens": null

  // Disable specific properties (common in rollouts)
  // All other properties remain enabled by default
  "stylelint-plugin-mozilla/use-design-tokens": {
    "box-shadow": null
  }

Supported Properties
--------------------

The following CSS properties are supported by this rule. Click on a property
name to see examples of correct and incorrect usage:

.. toctree::
   :maxdepth: 1
   :glob:

   use-design-tokens/*
