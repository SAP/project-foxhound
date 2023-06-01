/**
 * @fileoverview Reject defining Cc/Ci/Cr/Cu.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const componentsBlacklist = ["Cc", "Ci", "Cr", "Cu"];

module.exports = {
  meta: {
    docs: {
      url:
        "https://firefox-source-docs.mozilla.org/code-quality/lint/linters/eslint-plugin-mozilla/no-define-cc-etc.html",
    },
    schema: [],
    type: "suggestion",
  },

  create(context) {
    return {
      VariableDeclarator(node) {
        if (
          node.id.type == "Identifier" &&
          componentsBlacklist.includes(node.id.name)
        ) {
          context.report({
            node,
            message: `${node.id.name} is now defined in global scope, a separate definition is no longer necessary.`,
          });
        }

        if (node.id.type == "ObjectPattern") {
          for (let property of node.id.properties) {
            if (
              property.type == "Property" &&
              componentsBlacklist.includes(property.value.name)
            ) {
              context.report({
                node,
                message: `${property.value.name} is now defined in global scope, a separate definition is no longer necessary.`,
              });
            }
          }
        }
      },
    };
  },
};
