# Best Practices

* [Enable JSDoc Linting](#enable-jsdoc-linting)
* [Documenting Types](#documenting-types)
  * [Avoid Missing Type Annotations](#avoid-missing-type-annotations)
  * [Variables](#variables)
  * [Avoid object types](#avoid-object-types)
  * [Import Types from Other Files](#import-types-from-other-files)
* [XPCOMUtils.declareLazy / defineLazy](#xpcomutilsdeclarelazy--definelazy)

## Enable JSDoc Linting
ESLint supports linting of JSDoc comments. Enabling the rules on your component
will help to ensure that you avoid missing or incorrect type definitions for function parameters.

You can check if your component is already covered by ensuring it is not in the
`rollout-valid-jsdoc` or `rollout-require-jsdoc` sections of the
[eslint-rollouts.config.mjs](https://searchfox.org/firefox-main/source/eslint-rollouts.config.mjs)
file in the top level of `firefox-main`.

## Documenting Types

### Avoid Missing Type Annotations
By default, if no type annotation is given and it cannot be inferred, then
TypeScript will assign that variable the `any` type. This is a special type that
skips type checking, and therefore may cause hidden failures.

For class members and functions this means adding type definitions for all the
parameters, e.g.

```js
class Foo {
  /**
   * Stores the search string. The type here could be omitted if the property is assigned in
   * the constructor of the class.
   *
   * @type {string}
   */
  #search;

  /**
   * Details about the function.
   *
   * @param {string} searchString
   *   Param documentation.
   * @param {object} previousResult
   *   Param documentation.
   * @param {nsIAutoCompleteObserver} listener
   *   Param documentation.
   */
  startSearch(searchString, previousResult, listener) {}
}
```

### Variables
Variable types will be inferred from the item that they are initially assigned
to. However, sometimes you may need to define the type appropriately, especially
for sets and maps.

```js
// This will be inferred as type string.
let foo = "bar";

// This needs the type defining.
/** @type {Map<string, number>} */
let baz = new Map();
baz.set("star", 1701);
```

### Avoid object types
`object` types are treated much the same as `any` - there is no type checking
performed on them.

Ideally all types should be defined. There are two ways to do this.

The first is within JSDoc comments:

```js
/**
 * @typedef {object} submissionMapEntry
 * @property {SearchEngine} engine
 *   The search engine.
 * @property {string} termsParameterName
 *   The search term parameter name.
 */

/**
 * Alternately for function parameters:
 *
 * @param {object} options
 * @param {boolean} options.option1
 *   A required boolean property within options.
 * @param {number} [options.option2]
 *   An optional number property within options.
 */
function myFunc(options) {}
```

This may then be used within the file.

The second way may be more appropriate if a type is used widely within a
component. You can create a `types/urlbarType.d.ts` file, reference it from the
`tsconfig.json` file and include a definition such as:

```js
/**
 * A structure that holds the details of commands for results.
 */
type UrlbarResultCommand = {
  /**
   * The name of the command. Must be specified unless `children` is present.
   * When a command is picked, its name will be passed as `details.selType` to
   * `onEngagement()`. The special name "separator" will create a menu separator.
   */
  name?: string;
  /**
   * An l10n object for the command's label. Must be specified unless `name`
   * is "separator".
   */
  l10n?: L10nIdArgs;
  /**
   * If specified, a submenu will be created with the given child commands.
   */
  children?: UrlbarResultCommand[];
};
```

:::{note}
If you are sharing object types outside of your component, prefer using a proper
class definition or other structure.
:::

### Import Types from Other Files

You may import types from other files to be able to reuse them.

```js
/**
 * @import { LangTags } from "./translations.d.ts"
 */

/**
 * @import { OpenedConnection } from "resource://gre/modules/Sqlite.sys.mjs"
 */
```

A `*.d.ts` file is a special type-definition file for TypeScript. These should
generally only be used for types that are internal to your component and are
not exposed outside.

## XPCOMUtils.declareLazy / defineLazy

These are newer functions that combine the existing
[XPCOMUtils](https://searchfox.org/firefox-main/source/js/xpconnect/loader/XPCOMUtils.sys.mjs)
functions into formats that are compatible with TypeScript.

Defining lazy objects with these functions provides the appropriate information
for TypeScript to be able to know the types on the lazy objects. Otherwise the
lazy objects will be defined as `any`.

:::{note}
It is suggested that these are not generally used until the functions have been
[moved to ChromeUtils](https://bugzilla.mozilla.org/show_bug.cgi?id=1992437),
to avoid needing to import `XPCOMUtils` everywhere.
:::
