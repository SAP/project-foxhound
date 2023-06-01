/**
 * @fileoverview Reject use of instanceof against DOM interfaces
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const fs = require("fs");

const { maybeGetMemberPropertyName } = require("../helpers");

const privilegedGlobals = Object.keys(
  require("../environments/privileged.js").globals
);

// -----------------------------------------------------------------------------
// Rule Definition
// -----------------------------------------------------------------------------

/**
 * Whether an identifier is defined by eslint configuration.
 * `env: { browser: true }` or `globals: []` for example.
 * @param {import("eslint-scope").Scope} currentScope
 * @param {import("estree").Identifier} id
 */
function refersToEnvironmentGlobals(currentScope, id) {
  const reference = currentScope.references.find(ref => ref.identifier === id);
  const { resolved } = reference || {};
  if (!resolved) {
    return false;
  }

  // No definition in script files; defined via .eslintrc
  return resolved.scope.type === "global" && resolved.defs.length === 0;
}

/**
 * Whether a node points to a DOM interface.
 * Includes direct references to interfaces objects and also indirect references
 * via property access.
 * OS.File and lazy.(Foo) are explicitly excluded.
 *
 * @example HTMLElement
 * @example win.HTMLElement
 * @example iframe.contentWindow.HTMLElement
 * @example foo.HTMLElement
 *
 * @param {import("eslint-scope").Scope} currentScope
 * @param {import("estree").Node} node
 */
function pointsToDOMInterface(currentScope, node) {
  if (node.type === "MemberExpression") {
    const objectName = maybeGetMemberPropertyName(node.object);
    if (objectName === "lazy") {
      // lazy.Foo is probably a non-IDL import.
      return false;
    }
    if (objectName === "OS" && node.property.name === "File") {
      // OS.File is an exception that is not a Web IDL interface
      return false;
    }
    // For `win.Foo`, `iframe.contentWindow.Foo`, or such.
    return privilegedGlobals.includes(node.property.name);
  }

  if (
    node.type === "Identifier" &&
    refersToEnvironmentGlobals(currentScope, node)
  ) {
    return privilegedGlobals.includes(node.name);
  }

  return false;
}

/**
 * @param {import("eslint").Rule.RuleContext} context
 */
function isChromeContext(context) {
  const filename = context.getFilename();
  const isChromeFileName =
    filename.endsWith(".sys.mjs") ||
    filename.endsWith(".jsm") ||
    filename.endsWith(".jsm.js");
  if (isChromeFileName) {
    return true;
  }

  if (filename.endsWith(".xhtml")) {
    // Treat scripts in XUL files as chrome scripts
    // Note: readFile is needed as getSourceCode() only gives JS blocks
    return fs.readFileSync(filename).includes("there.is.only.xul");
  }

  // Treat scripts as chrome privileged when using:
  // 1. ChromeUtils, but not SpecialPowers.ChromeUtils
  // 2. BrowserTestUtils, PlacesUtils
  // 3. document.createXULElement
  // 4. loader.lazyRequireGetter
  // 5. Services.foo, but not SpecialPowers.Services.foo
  // 6. evalInSandbox
  const source = context.getSourceCode().text;
  return !!source.match(
    /(^|\s)ChromeUtils|BrowserTestUtils|PlacesUtils|createXULElement|lazyRequireGetter|(^|\s)Services\.|evalInSandbox/
  );
}

module.exports = {
  meta: {
    docs: {
      url:
        "https://firefox-source-docs.mozilla.org/code-quality/lint/linters/eslint-plugin-mozilla/use-isInstance.html",
    },
    fixable: "code",
    schema: [],
    type: "problem",
  },
  /**
   * @param {import("eslint").Rule.RuleContext} context
   */
  create(context) {
    if (!isChromeContext(context)) {
      return {};
    }

    return {
      BinaryExpression(node) {
        const { operator, right } = node;
        if (
          operator === "instanceof" &&
          pointsToDOMInterface(context.getScope(), right)
        ) {
          context.report({
            node,
            message:
              "Please prefer .isInstance() in chrome scripts over the standard instanceof operator for DOM interfaces, " +
              "since the latter will return false when the object is created from a different context.",
            fix(fixer) {
              const sourceCode = context.getSourceCode();
              return fixer.replaceText(
                node,
                `${sourceCode.getText(right)}.isInstance(${sourceCode.getText(
                  node.left
                )})`
              );
            },
          });
        }
      },
    };
  },
};
