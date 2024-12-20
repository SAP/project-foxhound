/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const helpers = require("../helpers");

function findStatement(node) {
  while (node && node.type !== "ExpressionStatement") {
    node = node.parent;
  }

  return node;
}

function isIdentifier(node, id) {
  return node && node.type === "Identifier" && node.name === id;
}

module.exports = {
  meta: {
    docs: {
      url: "https://firefox-source-docs.mozilla.org/code-quality/lint/linters/eslint-plugin-mozilla/rules/reject-multiple-getters-calls.html",
    },
    messages: {
      rejectMultipleCalls:
        "ChromeUtils.defineESModuleGetters is already called for {{target}} in the same context. Please merge those calls",
    },
    schema: [],
    type: "suggestion",
  },

  create(context) {
    const parentToTargets = new Map();

    return {
      CallExpression(node) {
        let callee = node.callee;
        if (
          callee.type === "MemberExpression" &&
          isIdentifier(callee.object, "ChromeUtils") &&
          isIdentifier(callee.property, "defineESModuleGetters")
        ) {
          const stmt = findStatement(node);
          if (!stmt) {
            return;
          }

          let target;
          try {
            target = helpers.getASTSource(node.arguments[0]);
          } catch (e) {
            return;
          }

          if (node.arguments.length >= 3) {
            const options = node.arguments[2];
            let globalOption = null;
            if (options.type == "ObjectExpression") {
              for (const prop of options.properties) {
                if (
                  prop.type == "Property" &&
                  isIdentifier(prop.key, "global")
                ) {
                  globalOption = helpers.getASTSource(prop.value);
                }
              }
            }
            if (globalOption) {
              target += "+" + globalOption;
            }
          }

          const parent = stmt.parent;
          let targets;
          if (parentToTargets.has(parent)) {
            targets = parentToTargets.get(parent);
          } else {
            targets = new Set();
            parentToTargets.set(parent, targets);
          }

          if (targets.has(target)) {
            context.report({
              node,
              messageId: "rejectMultipleCalls",
              data: { target },
            });
          }

          targets.add(target);
        }
      },
    };
  },
};
